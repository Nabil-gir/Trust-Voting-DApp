import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { createServer } from "node:net";
import { fileURLToPath } from "node:url";

const projectRoot = fileURLToPath(new URL("../", import.meta.url));
const hardhatCli = fileURLToPath(new URL("./cli.js", import.meta.resolve("hardhat")));
const nextCli = fileURLToPath(new URL("../voting-dapp/node_modules/next/dist/bin/next", import.meta.url));
const appDirectory = fileURLToPath(new URL("../voting-dapp/", import.meta.url));
const rpcUrl = "http://127.0.0.1:8545";
const appPort = process.env.PORT ?? "3000";
const showHardhatAccounts = process.env.SHOW_HARDHAT_ACCOUNTS === "true";
const children = new Set();
let stopping = false;

function launch(args, options = {}) {
  const child = spawn(process.execPath, args, {
    cwd: projectRoot,
    windowsHide: true,
    stdio: "inherit",
    ...options,
  });
  children.add(child);
  child.once("exit", () => children.delete(child));
  return child;
}

function run(args, options) {
  return new Promise((resolve, reject) => {
    const child = launch(args, options);
    child.once("error", reject);
    child.once("exit", (code, signal) => {
      if (code === 0) resolve();
      else reject(new Error(`Commande interrompue (${signal ?? code}).`));
    });
  });
}

async function shutdown(code = 0) {
  if (stopping) return;
  stopping = true;
  const running = [...children];
  for (const child of running) child.kill("SIGTERM");
  await Promise.race([
    Promise.all(running.map((child) => new Promise((resolve) => {
      if (child.exitCode !== null || child.signalCode !== null) resolve();
      else child.once("exit", resolve);
    }))),
    new Promise((resolve) => setTimeout(resolve, 2000)),
  ]);
  process.exit(code);
}

async function rpc(method) {
  const response = await fetch(rpcUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params: [] }),
    signal: AbortSignal.timeout(1500),
  });
  const data = await response.json();
  if (!response.ok || data.error) throw new Error("Le nœud JSON-RPC ne répond pas correctement.");
  return data.result;
}

process.on("SIGINT", () => void shutdown());
process.on("SIGTERM", () => void shutdown());

try {
  if (!existsSync(nextCli)) {
    throw new Error("Installez le frontend : npm.cmd --prefix voting-dapp install");
  }
  if (!/^\d+$/.test(appPort) || Number(appPort) < 1 || Number(appPort) > 65535) {
    throw new Error("PORT doit être compris entre 1 et 65535.");
  }
  await new Promise((resolve, reject) => {
    const probe = createServer();
    probe.once("error", () => reject(new Error(
      `Le port ${appPort} est déjà utilisé. Arrêtez le serveur existant ou choisissez un autre PORT.`,
    )));
    probe.listen(Number(appPort), "127.0.0.1", () => probe.close(resolve));
  });

  await run([hardhatCli, "build"]);
  await import("./sync-voting-abi.mjs");

  let existingChainId;
  try {
    existingChainId = await rpc("eth_chainId");
  } catch {
    // Aucun nœud disponible : le processus créé ci-dessous restera sous notre contrôle.
  }

  if (existingChainId !== undefined && existingChainId !== "0x7a69") {
    throw new Error("Le port 8545 héberge une autre chaîne. Libérez ce port avant de continuer.");
  }

  if (existingChainId === "0x7a69") {
    console.log("Nœud local existant réutilisé (chaîne 31337).");
  } else {
    console.log(showHardhatAccounts
      ? "Démarrage du nœud Hardhat sur 127.0.0.1:8545. Les comptes de développement s’affichent ci-dessous."
      : "Démarrage du nœud Hardhat sur 127.0.0.1:8545. Les clés de test ne sont pas affichées.");
    const node = launch([
      hardhatCli, "node", "--network", "hardhatMainnet", "--hostname", "127.0.0.1", "--port", "8545",
    ], { stdio: showHardhatAccounts ? "inherit" : ["ignore", "ignore", "inherit"] });
    node.once("error", (error) => {
      console.error(`Impossible de démarrer Hardhat : ${error.message}`);
      void shutdown(1);
    });
    node.once("exit", () => {
      if (!stopping) {
        console.error("Le nœud Hardhat s'est arrêté.");
        void shutdown(1);
      }
    });

    const deadline = Date.now() + 30000;
    while (Date.now() < deadline) {
      if (stopping) break;
      try {
        existingChainId = await rpc("eth_chainId");
        if (existingChainId === "0x7a69") break;
      } catch {
        // Attente courte, limitée à la disponibilité du nœud.
      }
      await new Promise((resolve) => setTimeout(resolve, 250));
    }
    if (existingChainId !== "0x7a69") throw new Error("Le nœud Hardhat n'est pas disponible après 30 secondes.");
  }

  await run([hardhatCli, "run", "scripts/deploy-voting.ts", "--network", "localhost"], {
    env: { ...process.env, NEXT_PUBLIC_RPC_URL: rpcUrl },
  });
  const accounts = await rpc("eth_accounts");
  console.log(`Administrateur local : ${accounts[0]}`);
  console.log(`Électeur de test 1 : ${accounts[1]}`);
  console.log(`Électeur de test 2 : ${accounts[2]}`);
  console.log(`DApp : http://localhost:${appPort} — Ctrl+C pour arrêter les processus lancés ici.`);
  console.log("Chaque lancement déploie un nouveau scrutin ; les étapes du vote restent à effectuer dans la DApp.");

  const frontendEnvironment = { ...process.env };
  for (const key of ["NEXT_PUBLIC_CHAIN_ID", "NEXT_PUBLIC_VOTING_ADDRESS", "NEXT_PUBLIC_DEPLOYMENT_BLOCK", "NEXT_PUBLIC_RPC_URL"]) {
    delete frontendEnvironment[key];
  }
  await run([nextCli, "dev", "--hostname", "127.0.0.1", "--port", appPort], {
    cwd: appDirectory,
    env: frontendEnvironment,
  });
  await shutdown();
} catch (error) {
  if (!stopping) console.error(error instanceof Error ? error.message : "Le lancement local a échoué.");
  await shutdown(1);
}
