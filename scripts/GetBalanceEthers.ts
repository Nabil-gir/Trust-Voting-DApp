import { ethers } from 'ethers';

const rpcURL = "https://sepolia.infura.io/v3/801623775b074d30abfb3df0856f4bc1";

const client = new ethers.JsonRpcProvider(rpcURL);

const balance = await client.getBalance("0xE692D40528A76d19146Cdb8940B59eB7e8A372B3");

console.log(ethers.formatEther(balance));

// Pour lancer le run il faut lancer la commande :  deno run --allow-net --allow-env scripts/GetBalanceEthers.ts