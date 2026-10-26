
import { network } from "hardhat";

const VITALIK = "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045";

async function main() {
  const connection = await network.connect({
    network: "localhost",
  });

  const { ethers } = connection;

  await connection.provider.request({
    method: "hardhat_impersonateAccount",
    params: [VITALIK],
  });

  const vitalik = await ethers.getSigner(VITALIK);
  const [recipient] = await ethers.getSigners();

  const initialBalance = await ethers.provider.getBalance(VITALIK);
  console.log("Solde initial :", ethers.formatEther(initialBalance), "ETH");

  const tx = await vitalik.sendTransaction({
    to: await recipient.getAddress(),
    value: ethers.parseEther("0.01"),
  });

  await tx.wait();

  console.log("Transaction locale :", tx.hash);
  console.log("Transfert simulé terminé !");
}

main().catch(console.error);
