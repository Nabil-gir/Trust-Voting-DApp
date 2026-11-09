import { mkdir, readFile, writeFile } from "node:fs/promises";

const artifactUrl = new URL("../artifacts/contracts/Voting.sol/Voting.json", import.meta.url);
const outputUrl = new URL("../voting-dapp/src/lib/voting-abi.ts", import.meta.url);
const artifact = JSON.parse(await readFile(artifactUrl, "utf8"));

if (artifact.contractName !== "Voting" || !Array.isArray(artifact.abi) || artifact.abi.length === 0) {
  throw new Error("ABI Voting absente ou invalide. Exécutez npm run build.");
}

await mkdir(new URL("../voting-dapp/src/lib/", import.meta.url), { recursive: true });
await writeFile(
  outputUrl,
  "// Généré depuis artifacts/contracts/Voting.sol/Voting.json.\n" +
    "// Régénérer avec npm run voting:abi à la racine du projet.\n" +
    `export const votingAbi = ${JSON.stringify(artifact.abi, null, 2)} as const;\n`,
  "utf8",
);

console.log("ABI Voting synchronisée dans voting-dapp/src/lib/voting-abi.ts.");
