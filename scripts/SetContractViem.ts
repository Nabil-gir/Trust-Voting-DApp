
import {
  createPublicClient,
  createWalletClient,
  http,
  getContract,
  type Hex,
} from "viem";

import { privateKeyToAccount } from "viem/accounts";
import { sepolia } from "viem/chains";

// 1. Connexion au réseau Sepolia
const rpcURL = "https://sepolia.infura.io/v3/801623775b074d30abfb3df0856f4bc1";

// 2. TA CLÉ PRIVÉE (À REMPLACER)
const privateKey = "0x9851bbca5c614c6057f8474dc4a1cb2ec7da134cb0f176f8d569fd2b5611beec" as Hex;

// 3. Création du compte
const account = privateKeyToAccount(privateKey);

// 4. Client public (lecture blockchain)
const client = createPublicClient({
  chain: sepolia,
  transport: http(rpcURL),
});

// 5. Wallet Client (écriture blockchain)
const walletClient = createWalletClient({
  account,
  chain: sepolia,
  transport: http(rpcURL),
});

// 6. ABI du smart contract
const ABI = [
  {
    inputs: [],
    name: "retrieve",
    outputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "uint256",
        name: "num",
        type: "uint256",
      },
    ],
    name: "store",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
] as const;

// 7. Adresse du contrat déployé
const SSaddress = "0x1100b96187FB08460F7f1010c38557C4e61Fc426" as const;

// 8. Connexion au smart contract
const simpleStorage = getContract({
  address: SSaddress,
  abi: ABI,
  client: {
    public: client,
    wallet: walletClient,
  },
});

// 9. Lecture de la valeur actuelle
const value = await simpleStorage.read.retrieve();
console.log("Ancienne valeur :", value.toString());

// 10. Modification de la valeur à 42
const tx = await simpleStorage.write.store([999999999999999999999999999999999999991n]);

console.log("Transaction envoyée :", tx);

// 11. Attendre la confirmation
const transaction = await client.waitForTransactionReceipt({
  hash: tx,
});

console.log("Statut :", transaction.status);

// 12. Relire la nouvelle valeur
if (transaction.status === "success") {
  const value1 = await simpleStorage.read.retrieve();
  console.log("Nouvelle valeur :", value1.toString());
} else {
  console.log("La transaction a échoué.");
}
