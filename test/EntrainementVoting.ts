import { describe, it } from "mocha";
import { expect } from "chai";
import { network } from "hardhat";

 async function deployVoting() {
    const { ethers } = await network.create();
    const [owner, voter1, voter2, outsider] = await ethers.getSigners();

    const Voting = await ethers.getContractFactory("Voting", owner);
    const voting = await Voting.deploy();

    await voting.waitForDeployment();

    return { ethers, owner, voter1, voter2, outsider, voting };
  }


// EXO 1 

it("refuse une double inscription", async function () {
  const { voting, voter1 } = await deployVoting();

  // 1. Première inscription : elle doit réussir
  await (await voting.addVoter(voter1.address)).wait();

  // 2. Deuxième inscription : elle doit échouer
  await expect(voting.addVoter(voter1.address)).to.be.revertedWith("Already registered");
});



// EXO 2 

it("émet VoterRegistered lors de l'inscription", async function () {
  const { voting, voter1 } = await deployVoting();
await expect(voting.addVoter(voter1.address)).to.emit(voting, "VoterRegistered").withArgs((voter1.address));
  
});



// EXO 3 




it("Vérification de la proposition", async function () {
const { voting, voter1 } = await deployVoting();

  // 1. Inscrire voter1

await (await voting.addVoter(voter1.address)).wait();


  // 2. Ouvrir l'enregistrement des propositions 

await (await voting.startProposalsRegistering()).wait();


  // 3. Ajouter "Ma proposition"

await (await voting.connect(voter1).addProposal("Ma proposition")).wait();


  // 4. Récupérer la proposition et vérifier sa description


const proposal = await voting.connect(voter1).getOneProposal(1n);
  
expect(proposal.description).to.equal("Ma proposition"); 


});















it("refuse une proposition vide", async function () {

  // 1. Inscrire voter1
const { voting, voter1 } = await deployVoting();
await (await voting.addVoter(voter1.address)).wait();

  // 2. Ouvrir l'enregistrement des propositions

await (await voting.startProposalsRegistering()).wait();

  // 3. Essayer d'ajouter une proposition vide
await expect(voting.connect(voter1).addProposal("")).to.be.revertedWith("Vous ne pouvez pas ne rien proposer");

});
















// EXO 5


it("refuse une proposition d'un électeur non inscrit", async function () {
  const { voting, outsider } = await deployVoting();

  // 1. Ouvrir l'enregistrement des propositions
await (await voting.startProposalsRegistering()).wait();

  // 2. Essayer d'ajouter une proposition avec outsider
await expect(voting.connect(outsider).addProposal("Ma proposition")).to.be.revertedWith("You're not a voter");

});