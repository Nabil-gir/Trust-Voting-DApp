import { connectorsForWallets } from "@rainbow-me/rainbowkit";
import { injectedWallet, metaMaskWallet, rainbowWallet, walletConnectWallet } from "@rainbow-me/rainbowkit/wallets";
import { createConfig, http } from "wagmi";
import { hardhat, sepolia } from "wagmi/chains";
import { getAddress, isAddress } from "viem";

const rawChainId = process.env.NEXT_PUBLIC_CHAIN_ID || "31337";
export const targetChain = rawChainId === "11155111" ? sepolia : { ...hardhat, name: "Hardhat local", blockExplorers: undefined };
const rawAddress = process.env.NEXT_PUBLIC_VOTING_ADDRESS;
export const contractAddress = rawAddress && isAddress(rawAddress) ? getAddress(rawAddress) : undefined;
const rawBlock = process.env.NEXT_PUBLIC_DEPLOYMENT_BLOCK || "0";
export const deploymentBlock = /^\d+$/.test(rawBlock) ? BigInt(rawBlock) : 0n;
export const configurationError = !["31337", "11155111"].includes(rawChainId)
  ? "Le réseau configuré doit être Hardhat local (31337) ou Sepolia (11155111)."
  : !/^\d+$/.test(rawBlock)
    ? "Le bloc de déploiement configuré est invalide."
    : rawAddress && !contractAddress ? "L’adresse du contrat configurée est invalide." : null;
const projectId = process.env.NEXT_PUBLIC_REOWN_PROJECT_ID?.trim();
const connectors = connectorsForWallets([
  { groupName: "Vos wallets", wallets: projectId ? [injectedWallet, metaMaskWallet, rainbowWallet, walletConnectWallet] : [injectedWallet] },
], { appName: "Trust · Système de vote", projectId: projectId || "injected-only" });

export const wagmiConfig = createConfig({
  chains: [targetChain],
  connectors,
  ssr: true,
  transports: {
    [hardhat.id]: http(targetChain.id === hardhat.id ? process.env.NEXT_PUBLIC_RPC_URL || "http://127.0.0.1:8545" : "http://127.0.0.1:8545"),
    [sepolia.id]: http(targetChain.id === sepolia.id ? process.env.NEXT_PUBLIC_RPC_URL || sepolia.rpcUrls.default.http[0] : sepolia.rpcUrls.default.http[0]),
  },
});
