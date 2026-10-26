
import { expect } from "chai";
import { network } from "hardhat";

const { ethers } = await network.create();

describe("Counter", function () {

  // Vérifie que x ne peut pas dépasser 10
  it("x doit pas depasser 10", async function () {
    const counter = await ethers.deployContract("Counter");

    for (let i = 0; i < 10; i++) {
      await counter.inc();
    }

    await expect(counter.inc()).to.be.revertedWith("Counter: maximum atteint");
  });

  // Vérifie que inc() incrémente x
  it("Should increment x when inc() is called", async function () {
    const counter = await ethers.deployContract("Counter");

    await counter.inc();

    expect(await counter.x()).to.equal(1n);
  });

  // Vérifie la valeur de x dans le stockage
  it("Test X", async function () {
    const counter = await ethers.deployContract("Counter");

    await counter.inc();

    const address = await counter.getAddress();
    const vraiX = await ethers.provider.getStorage(address, 0);

    expect(await counter.x()).to.equal(BigInt(vraiX));
  });

  // Vérifie l'émission de l'événement Increment
  it("Should emit the Increment event when calling the inc() function", async function () {
    const counter = await ethers.deployContract("Counter");

    await expect(counter.inc())
      .to.emit(counter, "Increment")
      .withArgs(1n);
  });

  // Vérifie que la somme des événements correspond à x
  it("The sum of the Increment events should match the current value", async function () {
    const counter = await ethers.deployContract("Counter");

    const deploymentBlockNumber = await ethers.provider.getBlockNumber();

for (let i = 1; i <= 4; i++) {
  await counter.incBy(1);
}

    const events = await counter.queryFilter(
      counter.filters.Increment(),
      deploymentBlockNumber,
      "latest"
    );

    let total = 0n;

    for (const event of events) {
      total += event.args.by;
    }

    expect(await counter.x()).to.equal(total);
  });

});
