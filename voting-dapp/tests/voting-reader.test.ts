import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  createPublicClient,
  createWalletClient,
  custom,
  getAddress,
  http,
  type Address,
  type Hash,
  type Hex,
} from "viem";
import { hardhat } from "viem/chains";
import { votingAbi } from "../src/lib/voting-abi";
import { readVotingSnapshot } from "../src/lib/voting-reader";

const integrationOptions = {
  skip: process.env.VOTING_INTEGRATION !== "1" && process.env.npm_lifecycle_event !== "test:integration"
    ? "Activer avec npm run test:integration ; un nœud Hardhat local doit être disponible."
    : false,
};

// These tests deploy their own real contracts. They never reset the node or
// change the contract configured for the application.
async function fixture() {
  const rpcUrl = process.env.VOTING_TEST_RPC_URL ?? "http://127.0.0.1:8545";
  const url = new URL(rpcUrl);
  assert.ok(["127.0.0.1", "localhost", "[::1]"].includes(url.hostname),
    "Les tests qui envoient des transactions sont réservés au nœud local.");
  const writer = createWalletClient({ chain: hardhat, transport: http(rpcUrl) });
  const publicClient = createPublicClient({ chain: hardhat, transport: http(rpcUrl) });
  assert.equal(await publicClient.getChainId(), 31337,
    "Les tests doivent être exécutés sur le réseau local Hardhat 31337.");
  const [owner, alice, bob] = await writer.getAddresses();
  assert.ok(owner && alice && bob, "Trois comptes de développement déverrouillés sont nécessaires.");
  const artifact = JSON.parse(await readFile(
    new URL("../../artifacts/contracts/Voting.sol/Voting.json", import.meta.url), "utf8",
  )) as { bytecode: Hex };
  const deployHash = await writer.deployContract({
    abi: votingAbi, bytecode: artifact.bytecode, account: owner,
  });
  const deployment = await publicClient.waitForTransactionReceipt({ hash: deployHash });
  assert.equal(deployment.status, "success");
  assert.ok(deployment.contractAddress);
  const address = getAddress(deployment.contractAddress);
  const contract = { address, abi: votingAbi } as const;
  const ownerContract = { ...contract, account: owner } as const;
  async function mined(hash: Promise<Hash>) {
    const receipt = await publicClient.waitForTransactionReceipt({ hash: await hash });
    assert.equal(receipt.status, "success");
    return receipt;
  }
  return {
    rpcUrl, writer, publicClient, owner, alice, bob, address,
    contract, ownerContract, deploymentBlock: deployment.blockNumber, mined,
  };
}

// An entirely separate client audits the actual JSON-RPC methods used for
// public consultation: it cannot request an account, signature or transaction.
function publicObserver(rpcUrl: string, maximumLogRange?: bigint) {
  const methods: string[] = [];
  let rejectedRanges = 0;
  let requestId = 0;
  const client = createPublicClient({
    chain: hardhat,
    transport: custom({
      async request({ method, params }) {
        methods.push(method);
        assert.ok(!/sendTransaction|sendRawTransaction|sign|requestAccounts|wallet_/i.test(method),
          `La consultation publique ne doit pas appeler ${method}.`);
        if (method === "eth_getLogs" && maximumLogRange !== undefined) {
          const filter = (params as [{ fromBlock: Hex; toBlock: Hex }])[0];
          if (BigInt(filter.toBlock) - BigInt(filter.fromBlock) > maximumLogRange) {
            rejectedRanges += 1;
            throw new Error("RPC test: requested eth_getLogs range exceeds provider limit");
          }
        }
        const response = await fetch(rpcUrl, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ jsonrpc: "2.0", id: ++requestId, method, params }),
        });
        assert.ok(response.ok, `Réponse RPC HTTP ${response.status}.`);
        const payload = await response.json() as {
          result?: unknown; error?: { message: string; code: number };
        };
        if (payload.error) throw new Error(`RPC ${payload.error.code}: ${payload.error.message}`);
        return payload.result;
      },
    }, { retryCount: 0 }),
  });
  return { client, methods, get rejectedRanges() { return rejectedRanges; } };
}

test("le lecteur public suit un scrutin réel de l'inscription au résultat, sans wallet", integrationOptions, async () => {
  const f = await fixture();
  const observer = publicObserver(f.rpcUrl);
  const snapshot = () => readVotingSnapshot(observer.client, f.address, f.deploymentBlock);
  const initial = await snapshot();
  assert.equal(initial.status, 0);
  assert.equal(initial.owner, getAddress(f.owner));
  assert.deepEqual(initial.voters, []);
  assert.deepEqual(initial.proposals, []);

  await f.mined(f.writer.writeContract({ ...f.ownerContract, functionName: "addVoter", args: [f.alice] }));
  await f.mined(f.writer.writeContract({ ...f.ownerContract, functionName: "addVoter", args: [f.bob] }));
  const registered = await snapshot();
  assert.deepEqual(registered.voters.map((voter) => voter.address), [getAddress(f.alice), getAddress(f.bob)]);
  assert.ok(registered.voters.every((voter) => !voter.hasVoted));
  assert.ok(!registered.voters.some((voter) => voter.address.toLowerCase() === f.owner.toLowerCase()),
    "L'administrateur de cette fixture n'est volontairement pas électeur.");
  await assert.rejects(readVotingSnapshot(observer.client, f.address, registered.blockNumber),
    /historique|déploiement/i,
    "Omettre le déploiement et le premier électeur doit être détecté même pendant la phase d'inscription.");

  await f.mined(f.writer.writeContract({ ...f.ownerContract, functionName: "startProposalsRegistering" }));
  const opened = await snapshot();
  assert.equal(opened.status, 1);
  assert.deepEqual(opened.proposals, [{ id: 0n, description: "GENESIS", voteCount: 0n }]);
  await assert.rejects(f.publicClient.readContract({
    ...f.contract, functionName: "getOneProposal", args: [0n], account: f.owner,
  }), /You're not a voter/);

  const description1 = "Créer un jardin partagé à l'école 🌱 — été 2026\n" + "Économie, égalité, communauté. ".repeat(60);
  const description2 = "Financer une bibliothèque de quartier 📚 <script>texte littéral</script>";
  await f.mined(f.writer.writeContract({ ...f.contract, account: f.alice, functionName: "addProposal", args: [description1] }));
  await f.mined(f.writer.writeContract({ ...f.contract, account: f.bob, functionName: "addProposal", args: [description2] }));
  const proposed = await snapshot();
  assert.deepEqual(proposed.proposals.map((proposal) => proposal.description), ["GENESIS", description1, description2]);

  await f.mined(f.writer.writeContract({ ...f.ownerContract, functionName: "endProposalsRegistering" }));
  assert.equal((await snapshot()).status, 2);
  await f.mined(f.writer.writeContract({ ...f.ownerContract, functionName: "startVotingSession" }));
  assert.equal((await snapshot()).status, 3);
  await f.mined(f.writer.writeContract({ ...f.contract, account: f.alice, functionName: "setVote", args: [1n] }));
  await assert.rejects(f.publicClient.simulateContract({
    ...f.contract, account: f.alice, functionName: "setVote", args: [2n],
  }), /You have already voted/);
  await f.mined(f.writer.writeContract({ ...f.contract, account: f.bob, functionName: "setVote", args: [2n] }));
  const voted = await snapshot();
  assert.deepEqual(voted.proposals.map((proposal) => proposal.voteCount), [0n, 1n, 1n]);
  assert.deepEqual(voted.voters.map((voter) => [voter.hasVoted, voter.votedProposalId]), [[true, 1n], [true, 2n]]);

  await f.mined(f.writer.writeContract({ ...f.ownerContract, functionName: "endVotingSession" }));
  assert.equal((await snapshot()).status, 4);
  await f.mined(f.writer.writeContract({ ...f.ownerContract, functionName: "tallyVotes" }));
  const result = await snapshot();
  assert.equal(result.status, 5);
  assert.equal(result.winnerId, 1n, "En cas d'égalité, le contrat conserve le plus petit identifiant gagnant.");
  assert.equal(result.activity.filter((activity) => activity.kind === "workflow").length, 5);
  assert.equal(result.activity.filter((activity) => activity.kind === "vote").length, 2);
  assert.equal(result.activity.length, 11);
  assert.equal(new Set(result.activity.map((activity) => activity.id)).size, result.activity.length);
  assert.ok(result.activity.every((activity, index) => index === 0 || activity.blockNumber <= result.activity[index - 1].blockNumber));
  assert.ok(observer.methods.includes("eth_call"));
  assert.ok(observer.methods.includes("eth_getLogs"));

  const limitedObserver = publicObserver(f.rpcUrl, 1n);
  const limitedResult = await readVotingSnapshot(limitedObserver.client, f.address, f.deploymentBlock);
  assert.ok(limitedObserver.rejectedRanges > 0, "Le test a effectivement imposé une limite RPC eth_getLogs.");
  assert.deepEqual({ ...limitedResult, blockNumber: result.blockNumber }, result,
    "Le découpage des plages RPC doit restituer le même scrutin complet.");

  await assert.rejects(readVotingSnapshot(observer.client, f.address, result.blockNumber),
    /historique|déploiement/i, "Une configuration qui omet les premières étapes doit échouer explicitement.");
});

test("le lecteur restitue GENESIS et le résultat d'un scrutin sans électeur", integrationOptions, async () => {
  const f = await fixture();
  for (const functionName of ["startProposalsRegistering", "endProposalsRegistering", "startVotingSession", "endVotingSession", "tallyVotes"] as const) {
    await f.mined(f.writer.writeContract({ ...f.ownerContract, functionName }));
  }
  const observer = publicObserver(f.rpcUrl);
  const result = await readVotingSnapshot(observer.client, f.address, f.deploymentBlock);
  assert.equal(result.status, 5);
  assert.equal(result.winnerId, 0n);
  assert.deepEqual(result.voters, []);
  assert.deepEqual(result.proposals, [{ id: 0n, description: "GENESIS", voteCount: 0n }]);
});

test("le lecteur accepte un vote réel pour GENESIS et conserve son identifiant zéro", integrationOptions, async () => {
  const f = await fixture();
  await f.mined(f.writer.writeContract({ ...f.ownerContract, functionName: "addVoter", args: [f.alice] }));
  for (const functionName of ["startProposalsRegistering", "endProposalsRegistering", "startVotingSession"] as const) {
    await f.mined(f.writer.writeContract({ ...f.ownerContract, functionName }));
  }
  await f.mined(f.writer.writeContract({ ...f.contract, account: f.alice, functionName: "setVote", args: [0n] }));
  const result = await readVotingSnapshot(publicObserver(f.rpcUrl).client, f.address, f.deploymentBlock);
  assert.deepEqual(result.voters, [{ address: getAddress(f.alice), hasVoted: true, votedProposalId: 0n }]);
  assert.deepEqual(result.proposals, [{ id: 0n, description: "GENESIS", voteCount: 1n }]);
});

test("le lecteur refuse une adresse sans contrat et un bloc futur", integrationOptions, async () => {
  const f = await fixture();
  const observer = publicObserver(f.rpcUrl);
  await assert.rejects(readVotingSnapshot(observer.client, f.alice as Address, 0n), /Aucun contrat/i);
  const blockNumber = await f.publicClient.getBlockNumber({ cacheTime: 0 });
  await assert.rejects(readVotingSnapshot(observer.client, f.address, blockNumber + 1n), /supérieur au dernier bloc/i);
});
