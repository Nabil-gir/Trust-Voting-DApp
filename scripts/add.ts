
import { network } from "hardhat";

async function main(): Promise<void> {
  const { ethers } = await network.connect({
    network: "localhost",
  });

  console.log("Connexion au contrat en cours...");

  const Counter = await ethers.getContractAt("Counter", "0xe7f1725e7734ce288f8367e1bb143e90bb3f0512");

  console.log(`Connexion faite à Counter déployé à ${Counter.target}`);
  console.log("Action en cours...");

  const tx = await Counter.inc();
  await tx.wait();

  const count = await Counter.x();

  console.log(`Action effectuée, le nouveau count est de : 5`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
