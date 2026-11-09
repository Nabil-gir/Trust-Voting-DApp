"use client";

import { useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { getAccount } from "wagmi/actions";
import { useAccount, usePublicClient, useSwitchChain, useWalletClient } from "wagmi";
import { getAddress, isAddress, zeroAddress, type Address, type ContractFunctionArgs, type PublicClient } from "viem";
import { toast } from "sonner";
import { configurationError, contractAddress, deploymentBlock, targetChain, wagmiConfig } from "@/lib/config";
import { votingAbi } from "@/lib/voting-abi";
import { readVotingSnapshot } from "@/lib/voting-reader";
import { votingError } from "@/lib/voting-errors";
import { TRANSITIONS, type TransactionState, type VotingAction } from "@/lib/voting-types";

export function useVoting() {
  const { address, isConnected, chainId } = useAccount();
  const client = usePublicClient({ chainId: targetChain.id });
  const { data: walletClient } = useWalletClient();
  const { switchChain } = useSwitchChain();
  const [transaction, setTransaction] = useState<TransactionState>({ status: "idle" });
  const locked = useRef(false);
  const configured = !!contractAddress && !configurationError;
  const query = useQuery({
    queryKey: ["voting", targetChain.id, contractAddress, deploymentBlock.toString()],
    queryFn: () => readVotingSnapshot(client as PublicClient, contractAddress!, deploymentBlock),
    enabled: configured && !!client,
    refetchInterval: 8000,
    staleTime: 4000,
    retry: 1,
  });
  const snapshot = query.data;
  const voter = snapshot?.voters.find((v) => v.address.toLowerCase() === address?.toLowerCase());
  const isOwner = !!address && snapshot?.owner.toLowerCase() === address.toLowerCase();
  const isWrongNetwork = isConnected && chainId !== targetChain.id;
  const isPending = transaction.status === "signature" || transaction.status === "confirming";

  async function execute(action: VotingAction, args: readonly unknown[] = []): Promise<boolean> {
    if (locked.current) return false;
    locked.current = true;
    const transition = TRANSITIONS.find((t) => t.action === action);
    const label = transition?.label || ({ addVoter: "Inscription d’un électeur", addProposal: "Dépôt d’une proposition", setVote: "Enregistrement du vote" } as Partial<Record<VotingAction, string>>)[action] || "Transaction";
    let hash: `0x${string}` | undefined;
    let changedTransaction = false;
    try {
      if (!client || !contractAddress || !configured) throw new Error("Le contrat de vote n’est pas configuré.");
      const currentAccount = getAccount(wagmiConfig);
      if (!currentAccount.address || !walletClient) throw new Error("Connectez votre wallet pour continuer.");
      if (currentAccount.chainId !== targetChain.id) throw new Error(`Sélectionnez le réseau ${targetChain.name} dans votre wallet.`);
      const account = currentAccount.address;
      if (walletClient.account.address.toLowerCase() !== account.toLowerCase()) throw new Error("La connexion au nouveau compte est en cours. Relancez votre action dans un instant.");
      if (query.isError) throw new Error("Actualisez les données avant de poursuivre.");
      setTransaction({ status: "signature", label });
      // Fresh contract data prevents actions based on an old phase or wallet.
      const fresh = await readVotingSnapshot(client as PublicClient, contractAddress, deploymentBlock);
      const currentVoter = fresh.voters.find((v) => v.address.toLowerCase() === account.toLowerCase());
      const common = { address: contractAddress, abi: votingAbi, account } as const;
      if (transition || action === "addVoter") {
        if (fresh.owner.toLowerCase() !== account.toLowerCase()) throw new Error("Cette action est réservée à l’administrateur.");
      }
      let simulation;
      switch (action) {
        case "addVoter": {
          if (fresh.status !== 0) throw new Error("L’inscription des électeurs est fermée.");
          const value = typeof args[0] === "string" ? args[0].trim() : "";
          if (!isAddress(value) || value.toLowerCase() === zeroAddress) throw new Error("Saisissez une adresse Ethereum valide et différente de l’adresse zéro.");
          if (fresh.voters.some((v) => v.address.toLowerCase() === value.toLowerCase())) throw new Error("Cette adresse est déjà inscrite.");
          simulation = await client.simulateContract({ ...common, functionName: "addVoter", args: [getAddress(value)] });
          break;
        }
        case "addProposal": {
          if (fresh.status !== 1 || !currentVoter) throw new Error("Seuls les électeurs inscrits peuvent déposer une proposition pendant l’étape dédiée.");
          const value = typeof args[0] === "string" ? args[0].trim() : "";
          if (!value) throw new Error("La proposition ne peut pas être vide.");
          simulation = await client.simulateContract({ ...common, functionName: "addProposal", args: [value] });
          break;
        }
        case "setVote": {
          if (fresh.status !== 3 || !currentVoter) throw new Error("Le vote est réservé aux électeurs inscrits pendant la session de vote.");
          if (currentVoter.hasVoted) throw new Error("Votre vote est déjà enregistré.");
          if (typeof args[0] !== "bigint" || !fresh.proposals.some((p) => p.id === args[0])) throw new Error("Cette proposition n’existe pas.");
          simulation = await client.simulateContract({ ...common, functionName: "setVote", args: [args[0]] });
          break;
        }
        case "startProposalsRegistering": simulation = await client.simulateContract({ ...common, functionName: "startProposalsRegistering" }); break;
        case "endProposalsRegistering": simulation = await client.simulateContract({ ...common, functionName: "endProposalsRegistering" }); break;
        case "startVotingSession": simulation = await client.simulateContract({ ...common, functionName: "startVotingSession" }); break;
        case "endVotingSession": simulation = await client.simulateContract({ ...common, functionName: "endVotingSession" }); break;
        case "tallyVotes": simulation = await client.simulateContract({ ...common, functionName: "tallyVotes" }); break;
      }
      const beforeSignature = getAccount(wagmiConfig);
      if (beforeSignature.address !== account || beforeSignature.chainId !== targetChain.id) throw new Error("Le compte ou le réseau a changé. Relancez votre action.");
      hash = await walletClient.writeContract<typeof votingAbi, VotingAction, ContractFunctionArgs<typeof votingAbi, "nonpayable", VotingAction>, typeof targetChain>({ ...simulation.request, abi: votingAbi, chain: targetChain });
      setTransaction({ status: "confirming", label, hash });
      const receipt = await client.waitForTransactionReceipt({ hash, confirmations: 1, timeout: 120_000, onReplaced: (replacement) => { changedTransaction ||= replacement.reason !== "repriced"; hash = replacement.transaction.hash; setTransaction({ status: "confirming", label, hash }); } });
      if (changedTransaction) throw new Error("La transaction a été annulée ou remplacée dans le wallet. Actualisez le scrutin pour vérifier son état.");
      if (receipt.status !== "success") throw new Error("La transaction a échoué sur le réseau. L’action n’a pas été enregistrée.");
      setTransaction({ status: "success", label, hash: receipt.transactionHash });
      toast.success("Transaction confirmée", { description: label });
      await query.refetch();
      return true;
    } catch (error) {
      const message = hash && /timeout|timed out/i.test(error instanceof Error ? error.message : "")
        ? "La confirmation prend plus de temps que prévu. La transaction peut encore aboutir : vérifiez son état avant de recommencer."
        : votingError(error);
      setTransaction({ status: "error", label, hash, error: message });
      toast.error("Action non confirmée", { description: message });
      return false;
    } finally { locked.current = false; }
  }

  return {
    snapshot,
    error: configurationError || (query.error ? votingError(query.error) : null),
    isLoading: configured && query.isPending,
    isFetching: query.isFetching,
    refresh: () => { void query.refetch(); },
    address: address as Address | undefined,
    isConnected,
    isOwner,
    isVoter: !!voter,
    hasVoted: !!voter?.hasVoted,
    isWrongNetwork,
    contractAddress,
    configured,
    isPending,
    transaction,
    execute,
    chainName: targetChain.name,
    chainId: targetChain.id,
    explorerUrl: targetChain.blockExplorers?.default.url,
    switchNetwork: () => switchChain({ chainId: targetChain.id }, { onError: (error) => toast.error("Changement de réseau refusé", { description: votingError(error) }) }),
  };
}
