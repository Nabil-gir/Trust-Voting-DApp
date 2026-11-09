import { getAddress, parseAbi, zeroAddress, type Address, type PublicClient } from "viem";
import { votingAbi } from "./voting-abi";
import { PHASES, shortAddress, type Activity, type VotingSnapshot, type Voter } from "./voting-types";

const events = parseAbi([
  "event VoterRegistered(address voterAddress)",
  "event WorkflowStatusChange(uint8 previousStatus, uint8 newStatus)",
  "event ProposalRegistered(uint256 proposalId)",
  "event Voted(address voter, uint256 proposalId)",
  "event OwnershipTransferred(address indexed previousOwner, address indexed newOwner)",
]);
type VotingLogs = Awaited<ReturnType<typeof fetchLogs>>;
const historyCache = new WeakMap<PublicClient, Map<string, { blockNumber: bigint; blockHash: string; logs: VotingLogs }>>();

// Providers impose different eth_getLogs ranges. Split rejected ranges rather
// than silently returning an incomplete election history.
async function readRange(client: PublicClient, address: Address, fromBlock: bigint, toBlock: bigint): Promise<Awaited<ReturnType<typeof fetchLogs>>> {
  try { return await fetchLogs(client, address, fromBlock, toBlock); }
  catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (fromBlock === toBlock || !/range|limit|too many|more than|response size|exceed|query returned|-32005|413/i.test(message)) throw error;
    const middle = (fromBlock + toBlock) / 2n;
    const first = await readRange(client, address, fromBlock, middle);
    const second = await readRange(client, address, middle + 1n, toBlock);
    return [...first, ...second];
  }
}

function fetchLogs(client: PublicClient, address: Address, fromBlock: bigint, toBlock: bigint) {
  return client.getLogs({ address, events, fromBlock, toBlock, strict: true });
}

export async function readVotingSnapshot(client: PublicClient, address: Address, fromBlock: bigint): Promise<VotingSnapshot> {
  const blockNumber = await client.getBlockNumber({ cacheTime: 0 });
  const initialBlock = await client.getBlock({ blockNumber });
  if (fromBlock > blockNumber) throw new Error("Le bloc de déploiement est supérieur au dernier bloc du réseau. Vérifiez la configuration.");
  const bytecode = await client.getCode({ address, blockNumber });
  if (!bytecode || bytecode === "0x") throw new Error("Aucun contrat à cette adresse sur ce réseau. Démarrez le nœud local et déployez Voting, ou vérifiez la configuration.");
  const [owner, status, winnerId] = await Promise.all([
    client.readContract({ address, abi: votingAbi, functionName: "owner", blockNumber }),
    client.readContract({ address, abi: votingAbi, functionName: "workflowStatus", blockNumber }),
    client.readContract({ address, abi: votingAbi, functionName: "winningProposalID", blockNumber }),
  ]);
  if (status > 5) throw new Error("Le contrat ne correspond pas au système de vote attendu.");
  const cacheKey = `${address.toLowerCase()}:${fromBlock}`;
  const cache = historyCache.get(client) || new Map();
  let previous = cache.get(cacheKey);
  if (previous) {
    if (previous.blockNumber > blockNumber) previous = undefined;
    else {
      const oldBlock = await client.getBlock({ blockNumber: previous.blockNumber });
      if (oldBlock.hash !== previous.blockHash) previous = undefined;
    }
  }
  const allLogs: VotingLogs = previous ? [...previous.logs] : [];
  for (let start = previous ? previous.blockNumber + 1n : fromBlock; start <= blockNumber; start += 5000n) {
    const end = start + 4999n < blockNumber ? start + 4999n : blockNumber;
    allLogs.push(...await readRange(client, address, start, end));
  }
  allLogs.sort((a, b) => a.blockNumber === b.blockNumber ? a.logIndex - b.logIndex : a.blockNumber < b.blockNumber ? -1 : 1);
  if (!allLogs.some((log) => log.eventName === "OwnershipTransferred" && log.args.previousOwner === zeroAddress)) {
    throw new Error("L’historique ne contient pas le déploiement du contrat. Configurez son bloc de déploiement exact ou un bloc antérieur.");
  }
  const voters = new Map<string, Voter>();
  const proposalIds = new Set<bigint>(status > 0 ? [0n] : []);
  const activity: Activity[] = [];
  let lastStatus = 0;
  for (const log of allLogs) {
    const item = { id: `${log.transactionHash}-${log.logIndex}`, blockNumber: log.blockNumber, transactionHash: log.transactionHash };
    switch (log.eventName) {
      case "VoterRegistered": {
        const voterAddress = getAddress(log.args.voterAddress);
        voters.set(voterAddress.toLowerCase(), { address: voterAddress, hasVoted: false });
        activity.push({ ...item, kind: "voter", title: "Électeur inscrit", detail: shortAddress(voterAddress) });
        break;
      }
      case "ProposalRegistered": {
        proposalIds.add(log.args.proposalId);
        activity.push({ ...item, kind: "proposal", title: "Nouvelle proposition", detail: `Proposition #${log.args.proposalId}` });
        break;
      }
      case "Voted": {
        const voter = voters.get(log.args.voter.toLowerCase());
        if (!voter) throw new Error("L’historique est incomplet. Configurez le bloc de déploiement exact du contrat.");
        voter.hasVoted = true;
        voter.votedProposalId = log.args.proposalId;
        activity.push({ ...item, kind: "vote", title: "Vote enregistré", detail: `${shortAddress(log.args.voter)} · Proposition #${log.args.proposalId}` });
        break;
      }
      case "WorkflowStatusChange": {
        if (log.args.previousStatus !== lastStatus) throw new Error("L’historique des étapes est incomplet. Vérifiez le bloc de déploiement.");
        lastStatus = log.args.newStatus;
        activity.push({ ...item, kind: "workflow", title: PHASES[log.args.newStatus].label, detail: `Étape ${log.args.newStatus + 1} sur 6` });
        break;
      }
    }
  }
  if (lastStatus !== status) throw new Error("L’historique des événements ne correspond pas au contrat. Vérifiez le bloc de déploiement puis actualisez.");
  const reader = voters.values().next().value?.address;
  const ids = [...proposalIds].sort((a, b) => a < b ? -1 : a > b ? 1 : 0);
  if (ids.some((id, index) => id !== BigInt(index))) throw new Error("Des propositions manquent dans l’historique du contrat. Vérifiez le bloc de déploiement.");
  const proposals: VotingSnapshot["proposals"] = [];
  for (let i = 0; i < ids.length; i += 8) {
    const batch = await Promise.all(ids.slice(i, i + 8).map(async (id) => {
      // eth_call is a public, unsigned simulation. onlyVoters restricts the
      // caller parameter, not access to blockchain data. Never impersonates a
      // signer and never sends a transaction. No contract changes required.
      const proposal = reader ? await client.readContract({ address, abi: votingAbi, functionName: "getOneProposal", args: [id], account: reader, blockNumber }) : { description: "GENESIS", voteCount: 0n };
      return { id, description: proposal.description, voteCount: proposal.voteCount };
    }));
    proposals.push(...batch);
  }
  for (const proposal of proposals) {
    const eventVotes = [...voters.values()].filter((voter) => voter.votedProposalId === proposal.id).length;
    if (proposal.voteCount !== BigInt(eventVotes)) throw new Error("Le nombre de votes ne correspond pas à l’historique. Vérifiez le bloc de déploiement.");
  }
  const block = await client.getBlock({ blockNumber });
  if (!block.hash || block.hash !== initialBlock.hash) throw new Error("La chaîne a changé pendant la lecture. Actualisez les données.");
  cache.set(cacheKey, { blockNumber, blockHash: block.hash, logs: allLogs });
  historyCache.set(client, cache);
  return { owner, status, winnerId, voters: [...voters.values()], proposals, activity: activity.reverse(), blockNumber };
}
