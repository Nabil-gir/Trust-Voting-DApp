
import { network } from "hardhat";

const { ethers } = await network.connect();

console.log("Début du script");

const contractAddress =
  "0x96884AD36c89DAc00a4dd63060D238C723a0ab3B";

const slot = "0x1";

const value = await ethers.provider.send(
  "eth_getStorageAt",
  [contractAddress, slot, "latest"]
);

console.log("Valeur du slot :", value);
console.log("Fin du script");
