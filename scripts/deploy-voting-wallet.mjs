import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { createServer } from "node:http";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { Contract, Interface, JsonRpcProvider, ZeroAddress, formatEther, getAddress, keccak256 } from "ethers";

const owner = getAddress(process.env.VOTING_ADMIN_ADDRESS || "0x7745C2b7A0a3f0cE2Bb4f9A23D732CF1fB7B7d30");
const rpcUrl = "https://sepolia.gateway.tenderly.co";
const port = Number(process.env.VOTING_DEPLOY_PORT || 4317);
assert.ok(Number.isInteger(port) && port > 0 && port < 65536, "Port local invalide.");
const origin = `http://127.0.0.1:${port}`;
const token = randomBytes(24).toString("hex");
const artifact = JSON.parse(await readFile(new URL("../artifacts/contracts/Voting.sol/Voting.json", import.meta.url), "utf8"));
assert.equal(artifact.contractName, "Voting");
assert.match(artifact.bytecode, /^0x[0-9a-f]+$/i);
assert.match(artifact.deployedBytecode, /^0x[0-9a-f]+$/i);
const provider = new JsonRpcProvider(rpcUrl);
assert.equal((await provider.getNetwork()).chainId, 11155111n, "Le RPC doit être sur Sepolia.");
const [balance, estimate, fees] = await Promise.all([
  provider.getBalance(owner),
  provider.estimateGas({ from: owner, data: artifact.bytecode, value: 0n }),
  provider.getFeeData(),
]);
const gasLimit = (estimate * 120n + 99n) / 100n;
const maximumCost = gasLimit * (fees.maxFeePerGas ?? fees.gasPrice ?? 1n);
assert.ok(balance >= maximumCost, "Le compte administrateur doit recevoir des ETH de test Sepolia pour payer les frais.");
console.log(`Réseau vérifié : Sepolia (11155111). Administrateur : ${owner}`);
console.log(`Estimation : ${estimate} unités de gas. Solde : ${formatEther(balance)} ETH de test.`);
console.log(`Coût maximal estimé : ${formatEther(maximumCost)} ETH de test ; MetaMask affichera ses propres frais.`);

if (process.argv.includes("--check-only")) {
  provider.destroy();
  process.exit(0);
}

let pending;
let submittedHash;
let completed;

async function validateDeployment(hash) {
  assert.match(hash, /^0x[0-9a-f]{64}$/i, "Hash de transaction invalide.");
  const transaction = await provider.getTransaction(hash);
  assert.ok(transaction, "La transaction n'est pas encore visible ; réessayez sa vérification.");
  assert.equal(transaction.chainId, 11155111n);
  assert.equal(getAddress(transaction.from), owner, "La transaction doit être signée par l'administrateur choisi.");
  assert.equal(transaction.to, null, "Il faut une transaction de création de contrat.");
  assert.equal(transaction.value, 0n);
  assert.equal(transaction.data.toLowerCase(), artifact.bytecode.toLowerCase(), "Le bytecode doit correspondre à Voting compilé.");
  const receipt = await provider.waitForTransaction(hash, 2, 240000);
  assert.ok(receipt && receipt.status === 1 && receipt.contractAddress, "Le déploiement n'a pas été confirmé avec succès.");
  const address = getAddress(receipt.contractAddress);
  const code = await provider.getCode(address);
  assert.equal(keccak256(code), keccak256(artifact.deployedBytecode), "Le bytecode déployé ne correspond pas au contrat compilé.");
  const voting = new Contract(address, artifact.abi, provider);
  const [actualOwner, status, winner] = await Promise.all([voting.owner(), voting.workflowStatus(), voting.winningProposalID()]);
  assert.equal(getAddress(actualOwner), owner);
  assert.equal(status, 0n, "Le nouveau scrutin doit être à l'inscription des électeurs.");
  assert.equal(winner, 0n);
  const abi = new Interface(artifact.abi);
  const ownership = receipt.logs.map((log) => {
    try { return getAddress(log.address) === address ? abi.parseLog(log) : null; } catch { return null; }
  }).find((log) => log?.name === "OwnershipTransferred");
  assert.ok(ownership);
  assert.equal(ownership.args[0], ZeroAddress);
  assert.equal(getAddress(ownership.args[1]), owner);

  const record = {
    network: "sepolia", chainId: 11155111, contract: "Voting", address, owner,
    transactionHash: hash, blockNumber: receipt.blockNumber, blockHash: receipt.blockHash,
    compiler: "0.8.38", optimizer: { enabled: true, runs: 200 },
    runtimeBytecodeHash: keccak256(code),
    verification: { runtimeBytecodeMatches: true, ownerMatches: true, initialWorkflowStatus: 0, initialWinningProposalId: "0", ownershipConstructorEvent: true },
    frontend: { chainId: 11155111, address, deploymentBlock: receipt.blockNumber, rpcUrl },
  };
  const envFile = new URL("../voting-dapp/.env.local", import.meta.url);
  let content = await readFile(envFile, "utf8").catch((error) => {
    if (error.code === "ENOENT") return "";
    throw error;
  });
  for (const [key, value] of Object.entries({
    NEXT_PUBLIC_CHAIN_ID: "11155111", NEXT_PUBLIC_VOTING_ADDRESS: address,
    NEXT_PUBLIC_DEPLOYMENT_BLOCK: String(receipt.blockNumber), NEXT_PUBLIC_RPC_URL: rpcUrl,
  })) {
    const pattern = new RegExp(`^\\s*(?:export\\s+)?${key}\\s*=.*$`, "gm");
    const assignment = `${key}=${JSON.stringify(value)}`;
    content = pattern.test(content) ? content.replace(pattern, () => assignment) : `${content}${content.endsWith("\n") || !content ? "" : "\n"}${assignment}\n`;
  }
  await writeFile(envFile, content, "utf8");
  await mkdir(new URL("../deployments/sepolia/", import.meta.url), { recursive: true });
  await writeFile(new URL("../deployments/sepolia/Voting.json", import.meta.url), `${JSON.stringify(record, null, 2)}\n`, "utf8");
  await mkdir(new URL("../.vercel/", import.meta.url), { recursive: true });
  await writeFile(new URL("../.vercel/latest-voting-deployment.json", import.meta.url), `${JSON.stringify(record, null, 2)}\n`, "utf8");
  await import("./sync-voting-abi.mjs");
  console.log(`Nouveau contrat confirmé : ${address} ; bloc ${receipt.blockNumber}. Configuration locale actualisée.`);
  return record;
}

function browserMain(config) {
  const button = document.querySelector("button");
  const status = document.querySelector("#status");
  const result = document.querySelector("#result");
  const storageKey = `trust-voting-${config.token}`;
  let hash = sessionStorage.getItem(storageKey);
  if (hash) button.textContent = "Vérifier la transaction déjà signée";
  button.addEventListener("click", async () => {
    button.disabled = true;
    try {
      if (!hash) {
        const ethereum = window.ethereum?.providers?.find((wallet) => wallet.isMetaMask) || window.ethereum;
        if (!ethereum) throw new Error("Ouvrez cette page dans le navigateur où MetaMask est installé.");
        status.textContent = "Connectez le compte administrateur dans MetaMask.";
        const accounts = await ethereum.request({ method: "eth_requestAccounts" });
        if (accounts[0]?.toLowerCase() !== config.owner.toLowerCase()) throw new Error(`Sélectionnez le compte administrateur ${config.owner} dans MetaMask.`);
        if (await ethereum.request({ method: "eth_chainId" }) !== "0xaa36a7") {
          await ethereum.request({ method: "wallet_switchEthereumChain", params: [{ chainId: "0xaa36a7" }] });
        }
        const chain = await ethereum.request({ method: "eth_chainId" });
        const selected = await ethereum.request({ method: "eth_accounts" });
        if (chain !== "0xaa36a7" || selected[0]?.toLowerCase() !== config.owner.toLowerCase()) throw new Error("Vérifiez le compte administrateur et le réseau Sepolia.");
        status.textContent = "Vérifiez puis confirmez le déploiement dans MetaMask. Aucune inscription ni aucun vote n'est effectué.";
        hash = await ethereum.request({ method: "eth_sendTransaction", params: [{ from: selected[0], data: config.bytecode, value: "0x0", gas: config.gas }] });
        sessionStorage.setItem(storageKey, hash);
      }
      status.textContent = "Transaction envoyée. Attente de deux confirmations puis vérification du contrat…";
      result.textContent = `Transaction : ${hash}`;
      const response = await fetch("/confirm", { method: "POST", headers: { "content-type": "application/json", "x-trust-token": config.token }, body: JSON.stringify({ hash }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "La vérification n'a pas abouti.");
      status.textContent = "Le nouveau scrutin vide est déployé. Le contrat et son administrateur sont vérifiés.";
      result.textContent = `Contrat : ${data.address}\nAdministrateur : ${data.owner}\nBloc : ${data.blockNumber}\nLa configuration locale est enregistrée. La mise à jour de Vercel peut maintenant être effectuée.`;
      button.textContent = "Déploiement confirmé";
    } catch (error) {
      status.textContent = error.message || "La transaction a été refusée ou interrompue.";
      button.textContent = hash ? "Réessayer la vérification de cette transaction" : "Déployer avec MetaMask";
      button.disabled = false;
    }
  });
}

const config = { owner, bytecode: artifact.bytecode, gas: `0x${gasLimit.toString(16)}`, token };
const page = `<!doctype html><html lang="fr"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Trust — Nouveau scrutin Sepolia</title>
<style nonce="${token}">*{box-sizing:border-box}body{margin:0;background:#f5f7f2;font:16px system-ui,sans-serif;color:#182817;min-height:100vh;display:grid;place-items:center;padding:24px}main{background:white;border:1px solid #e2e8db;border-radius:24px;padding:40px;max-width:720px;width:100%}h1{font-size:34px;margin:0 0 24px;color:#85b928}h2{font-size:24px}p{line-height:1.6}code{overflow-wrap:anywhere;font-size:13px}button{margin-top:16px;background:#a3d838;color:#19350c;border:0;padding:16px 24px;border-radius:12px;font-weight:700;font-size:16px;cursor:pointer}button:disabled{opacity:.6;cursor:wait}#status{padding:16px;background:#f6f9f0;border-radius:12px}#result{white-space:pre-wrap;overflow-wrap:anywhere;font-size:13px;line-height:1.7}</style>
<main><h1>Trust</h1><h2>Nouveau scrutin Sepolia</h2><p>Déployez un nouveau contrat Voting avec votre wallet. Le scrutin commencera à l’inscription des électeurs, sans proposition ni vote.</p><p>Administrateur attendu :<br><code>${owner}</code></p><p>Réseau : <strong>Sepolia — ETH de test</strong><br>Frais : affichés par MetaMask avant confirmation.</p><p id="status">Vérifiez que le compte administrateur est sélectionné dans MetaMask.</p><button>Déployer avec MetaMask</button><p id="result"></p></main>
<script nonce="${token}">(${browserMain.toString()})(${JSON.stringify(config)});</script></html>`;

const server = createServer(async (request, response) => {
  const headers = { "cache-control": "no-store", "x-content-type-options": "nosniff", "content-security-policy": `default-src 'none'; script-src 'nonce-${token}'; style-src 'nonce-${token}'; connect-src 'self'; frame-ancestors 'none'; base-uri 'none'` };
  const json = (code, value) => { response.writeHead(code, { ...headers, "content-type": "application/json; charset=utf-8" }); response.end(JSON.stringify(value)); };
  if (request.headers.host !== `127.0.0.1:${port}`) return json(403, { error: "Hôte local requis." });
  if (request.method === "GET" && request.url === "/") { response.writeHead(200, { ...headers, "content-type": "text/html; charset=utf-8" }); return response.end(page); }
  if (request.method === "GET" && request.url === "/status") return json(200, { state: completed ? "confirmed" : pending ? "pending" : "ready", deployment: completed });
  if (request.method !== "POST" || request.url !== "/confirm") return json(404, { error: "Page introuvable." });
  if (request.headers.origin !== origin || request.headers["x-trust-token"] !== token) return json(403, { error: "Validation locale requise." });
  try {
    let body = "";
    for await (const chunk of request) { body += chunk; if (body.length > 1024) throw new Error("Requête trop volumineuse."); }
    const { hash } = JSON.parse(body);
    assert.equal(typeof hash, "string");
    if (submittedHash && submittedHash.toLowerCase() !== hash.toLowerCase()) throw new Error("Une autre transaction est déjà en vérification.");
    if (completed) return json(200, completed);
    submittedHash = hash;
    pending ??= validateDeployment(hash).catch((error) => { pending = undefined; submittedHash = undefined; throw error; });
    completed = await pending;
    json(200, completed);
  } catch (error) { json(400, { error: error.shortMessage || error.message || "Vérification interrompue." }); }
});

server.listen(port, "127.0.0.1", () => console.log(`Signature MetaMask : ${origin} — Ctrl+C pour arrêter cette page locale.`));
server.on("error", (error) => { console.error(error.message); provider.destroy(); process.exitCode = 1; });
for (const signal of ["SIGINT", "SIGTERM"]) process.on(signal, () => { server.close(); provider.destroy(); });
