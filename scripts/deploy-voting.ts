import { mkdir, readFile, writeFile } from "node:fs/promises";
import { network } from "hardhat";

const connection = await network.create();

try {
  const expectedChainIds: Record<string, bigint> = {
    localhost: 31337n,
    sepolia: 11155111n,
  };
  const expectedChainId = expectedChainIds[connection.networkName];

  if (expectedChainId === undefined) {
    throw new Error("Choisissez explicitement --network localhost ou --network sepolia.");
  }

  const { ethers } = connection;
  const { chainId } = await ethers.provider.getNetwork();

  if (chainId !== expectedChainId) {
    throw new Error(`Réseau inattendu : ${chainId}. Chaîne attendue : ${expectedChainId}.`);
  }

  const [owner] = await ethers.getSigners();
  const voting = await ethers.deployContract("Voting");
  await voting.waitForDeployment();
  const receipt = await voting.deploymentTransaction()?.wait();

  if (receipt === undefined || receipt === null || receipt.status !== 1) {
    throw new Error("Le déploiement Voting n'a pas été confirmé.");
  }

  const address = await voting.getAddress();
  const envUrl = new URL("../voting-dapp/.env.local", import.meta.url);
  let content = "";

  try {
    content = await readFile(envUrl, "utf8");
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
  }

  const publicRpcUrl = process.env.NEXT_PUBLIC_RPC_URL ?? (
    chainId === 31337n ? "http://127.0.0.1:8545" : "https://sepolia.gateway.tenderly.co"
  );
  const publicValues: Record<string, string> = {
    NEXT_PUBLIC_CHAIN_ID: chainId.toString(),
    NEXT_PUBLIC_VOTING_ADDRESS: address,
    NEXT_PUBLIC_DEPLOYMENT_BLOCK: receipt.blockNumber.toString(),
    NEXT_PUBLIC_RPC_URL: publicRpcUrl,
  };

  for (const [key, value] of Object.entries(publicValues)) {
    const assignment = `${key}=${JSON.stringify(value)}`;
    const pattern = new RegExp(`^\\s*(?:export\\s+)?${key}\\s*=.*$`, "gm");
    content = pattern.test(content)
      ? content.replace(pattern, () => assignment)
      : `${content}${content.endsWith("\n") || content.length === 0 ? "" : "\n"}${assignment}\n`;
  }

  await mkdir(new URL("../voting-dapp/", import.meta.url), { recursive: true });
  await writeFile(envUrl, content, "utf8");
  await import(new URL("./sync-voting-abi.mjs", import.meta.url).href);

  console.log(`Voting déployé sur ${connection.networkName} (chaîne ${chainId}).`);
  console.log(`Contrat : ${address}`);
  console.log(`Propriétaire : ${owner.address}`);
  console.log(`Bloc de déploiement : ${receipt.blockNumber}`);
  console.log("Configuration publique actualisée dans voting-dapp/.env.local ; les autres valeurs sont conservées.");
} finally {
  await connection.close();
}
