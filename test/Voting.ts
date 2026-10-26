
import {describe, it } from "mocha";
import {expect} from "chai";
import {network} from "hardhat";

describe("Voting", function () {

  // Déploie le contrat pour chaque test
  async function deployVoting() {
    const { ethers } = await network.connect();
    const [owner, voter1, voter2, outsider] = await ethers.getSigners();

    const Voting = await ethers.getContractFactory("Voting", owner);
    const voting = await Voting.deploy();

    await voting.waitForDeployment();

    return {ethers, owner,voter1,voter2,outsider,voting};
  }

  // Inscription des électeurs
  async function registerVoters(voting: any, voter1: any, voter2: any) 
  {
    await (await voting.addVoter(voter1.address)).wait();
    await (await voting.addVoter(voter2.address)).wait();
  }


  // Préparation d'une session de vote
  async function prepareVoting(voting: any, voter1: any, voter2: any) 
  
  {
    await registerVoters(voting, voter1, voter2);

    await (await voting.startProposalsRegistering()).wait();

    await (await voting.connect(voter1).addProposal("Proposition A")).wait();

    await (await voting.connect(voter2).addProposal("Proposition B")).wait();

    await (await voting.endProposalsRegistering()).wait();

    await (await voting.startVotingSession()).wait();
  }

  // =========================================
  // 1. DÉPLOIEMENT ET ÉTAT INITIAL
  // =========================================

  it("devrait commencer dans l'état RegisteringVoters", async function () {
    const { voting } = await deployVoting();

    expect(await voting.workflowStatus()).to.equal(0n);
  });

  // =========================================
  // 2. INSCRIPTION DES ÉLECTEURS
  // =========================================

  it("devrait permettre au propriétaire d'inscrire un électeur", async function () {
    const { voting, voter1 } = await deployVoting();

    await (await voting.addVoter(voter1.address)).wait();

    const voter = await voting.connect(voter1).getVoter(voter1.address);

    expect(voter.isRegistered).to.equal(true);
    expect(voter.hasVoted).to.equal(false);
    expect(voter.votedProposalId).to.equal(0n);
  });

  it("devrait empêcher l'inscription deux fois du même électeur", async function () {
    const { voting, voter1 } = await deployVoting();

    await (await voting.addVoter(voter1.address)).wait();

    await expect(voting.addVoter(voter1.address)).to.be.revertedWith("Already registered");

  });

  it("devrait empêcher un non-propriétaire d'inscrire un électeur", 
    async function () {const { voting, voter1, voter2, ethers } = await deployVoting();
    await expect(voting.connect(voter1).addVoter(voter2.address)).to.be.revert(ethers);});


  // =========================================
  // 3. ENREGISTREMENT DES PROPOSITIONS
  // =========================================

  it("devrait ajouter la proposition GENESIS au démarrage", async function () {
    const { voting, voter1 } = await deployVoting();

    await (await voting.addVoter(voter1.address)).wait();
    await (await voting.startProposalsRegistering()).wait();

    const proposal = await voting.connect(voter1).getOneProposal(0n);

    expect(proposal.description).to.equal("GENESIS");
    expect(proposal.voteCount).to.equal(0n);
  });

  it("devrait permettre à un électeur inscrit d'ajouter une proposition", async function () {
    const { voting, voter1 } = await deployVoting();

    await (await voting.addVoter(voter1.address)).wait();
    await (await voting.startProposalsRegistering()).wait();

    await (
      await voting.connect(voter1).addProposal("Réduire les impôts")
    ).wait();

    const proposal = await voting.connect(voter1).getOneProposal(1n);

    expect(proposal.description).to.equal("Réduire les impôts");
    expect(proposal.voteCount).to.equal(0n);
  });

  it("devrait refuser une proposition vide", async function () {
    const { voting, voter1 } = await deployVoting();

    await (await voting.addVoter(voter1.address)).wait();
    await (await voting.startProposalsRegistering()).wait();

    await expect(
      voting.connect(voter1).addProposal("")
    ).to.be.revertedWith("Vous ne pouvez pas ne rien proposer");
  });

  it("devrait refuser une proposition d'un électeur non inscrit", async function () {
    const { voting, outsider } = await deployVoting();

    await (await voting.startProposalsRegistering()).wait();

    await expect(
      voting.connect(outsider).addProposal("Ma proposition")
    ).to.be.revertedWith("You're not a voter");
  });

  // =========================================
  // 4. ÉTAPES DU PROCESSUS DE VOTE
  // =========================================

  it("devrait suivre les étapes du processus de vote", async function () {
    const { voting, voter1, voter2 } = await deployVoting();

    await registerVoters(voting, voter1, voter2);

    await (await voting.startProposalsRegistering()).wait();
    expect(await voting.workflowStatus()).to.equal(1n);

    await (await voting.endProposalsRegistering()).wait();
    expect(await voting.workflowStatus()).to.equal(2n);

    await (await voting.startVotingSession()).wait();
    expect(await voting.workflowStatus()).to.equal(3n);

    await (await voting.endVotingSession()).wait();
    expect(await voting.workflowStatus()).to.equal(4n);

    await (await voting.tallyVotes()).wait();
    expect(await voting.workflowStatus()).to.equal(5n);
  });

  // =========================================
  // 5. VOTES
  // =========================================

  it("devrait permettre à un électeur de voter", async function () {
    const { voting, voter1, voter2 } = await deployVoting();

    await prepareVoting(voting, voter1, voter2);

    await (await voting.connect(voter1).setVote(1n)).wait();

    const voter = await voting.connect(voter1).getVoter(voter1.address);
    const proposal = await voting.connect(voter1).getOneProposal(1n);

    expect(voter.hasVoted).to.equal(true);
    expect(voter.votedProposalId).to.equal(1n);
    expect(proposal.voteCount).to.equal(1n);
  });

  it("devrait empêcher un électeur de voter deux fois", async function () {
    const { voting, voter1, voter2 } = await deployVoting();

    await prepareVoting(voting, voter1, voter2);

    await (await voting.connect(voter1).setVote(1n)).wait();

    await expect(
      voting.connect(voter1).setVote(2n)
    ).to.be.revertedWith("You have already voted");
  });

  it("devrait refuser un vote pour une proposition inexistante", async function () {
    const { voting, voter1, voter2 } = await deployVoting();

    await prepareVoting(voting, voter1, voter2);

    await expect(
      voting.connect(voter1).setVote(999n)
    ).to.be.revertedWith("Proposal not found");
  });

  it("devrait refuser le vote avant l'ouverture de la session", async function () {
    const { voting, voter1 } = await deployVoting();

    await (await voting.addVoter(voter1.address)).wait();

    await expect(
      voting.connect(voter1).setVote(0n)
    ).to.be.revertedWith("Voting session havent started yet");
  });

  // =========================================
  // 6. COMPTAGE DES VOIX
  // =========================================

  it("devrait désigner la proposition ayant le plus de voix", async function () {
    const { voting, voter1, voter2 } = await deployVoting();

    await prepareVoting(voting, voter1, voter2);

    await (await voting.connect(voter1).setVote(1n)).wait();
    await (await voting.connect(voter2).setVote(1n)).wait();

    await (await voting.endVotingSession()).wait();
    await (await voting.tallyVotes()).wait();

    expect(await voting.winningProposalID()).to.equal(1n);
    expect(await voting.workflowStatus()).to.equal(5n);
  });

  it("devrait conserver la première proposition en cas d'égalité", async function () {
    const { voting, voter1, voter2 } = await deployVoting();

    await prepareVoting(voting, voter1, voter2);

    await (await voting.connect(voter1).setVote(1n)).wait();
    await (await voting.connect(voter2).setVote(2n)).wait();

    await (await voting.endVotingSession()).wait();
    await (await voting.tallyVotes()).wait();

    // Avec ">", le premier ID conserve la priorité en cas d'égalité.
    expect(await voting.winningProposalID()).to.equal(1n);
  });

  it("devrait empêcher le comptage avant la fin de la session", async function () {
    const { voting } = await deployVoting();

    await expect(
      voting.tallyVotes()
    ).to.be.revertedWith("Current status is not voting session ended");
  });

});
