import { describe, it } from "mocha";
import { expect } from "chai";
import { network } from "hardhat";




describe("Voting tests unitaires", function () {

  async function deployVoting() {
    const { ethers } = await network.create();
    const [owner, voter1, voter2, outsider] = await ethers.getSigners();

    const Voting = await ethers.getContractFactory("Voting", owner);
    const voting = await Voting.deploy();

    await voting.waitForDeployment();

    return { ethers, owner, voter1, voter2, outsider, voting };
  }

  async function registerVoters(voting: any, voter1: any, voter2: any) {
    await (await voting.addVoter(voter1.address)).wait();
    await (await voting.addVoter(voter2.address)).wait();
  }

  async function prepareVoting(voting: any, voter1: any, voter2: any) {
    await registerVoters(voting, voter1, voter2);
    await (await voting.startProposalsRegistering()).wait();
    await (await voting.connect(voter1).addProposal("Proposition A")).wait();
    await (await voting.connect(voter2).addProposal("Proposition B")).wait();
    await (await voting.endProposalsRegistering()).wait();
    await (await voting.startVotingSession()).wait();
  }




  describe("Déploiement", function () {
    it("définit le déployeur comme propriétaire et commence par l'inscription des électeurs", async function () {
      const { voting, owner } = await deployVoting();

      expect(await voting.owner()).to.equal(owner.address);
      expect(await voting.workflowStatus()).to.equal(0n);
    });
  });





  describe("Inscription des voters", function () {
    it("permet au propriétaire d'inscrire un électeur", async function () {
      const { voting, voter1 } = await deployVoting();

      await expect(voting.addVoter(voter1.address)).to.emit(voting, "VoterRegistered").withArgs(voter1.address);

      const voter = await voting.connect(voter1).getVoter(voter1.address);
      expect(voter.isRegistered).to.equal(true);
      expect(voter.hasVoted).to.equal(false);
      expect(voter.votedProposalId).to.equal(0n);
    });

    it("refuse d'inscrire deux fois le même électeur", async function () {
      const { voting, voter1 } = await deployVoting();

      await (await voting.addVoter(voter1.address)).wait();
      await expect(voting.addVoter(voter1.address)).to.be.revertedWith("Already registered");
    });

    it("refuse l'inscription par une personne qui n'est pas owner", async function () {
      const { voting, voter1, voter2, ethers } = await deployVoting();

      await expect(voting.connect(voter1).addVoter(voter2.address)).to.be.revert(ethers);
    });

    it("refuse une inscription lorsque la période d'inscription est terminée", async function () {
      const { voting, voter1, voter2 } = await deployVoting();

      await (await voting.startProposalsRegistering()).wait();
      await expect(voting.addVoter(voter2.address)).to.be.revertedWith("Voters registration is not open yet");
    });


  });




  describe("Propositions", function () {
    it("ajoute automatiquement GENESIS au début de l'enregistrement", async function () {
      const { voting, voter1 } = await deployVoting();

      await (await voting.addVoter(voter1.address)).wait();
      await (await voting.startProposalsRegistering()).wait();
      const proposal = await voting.connect(voter1).getOneProposal(0n);
      expect(proposal.description).to.equal("GENESIS");
      expect(proposal.voteCount).to.equal(0n);
    });

    it("permet à un électeur inscrit d'ajouter une proposition", async function () {
      const { voting, voter1 } = await deployVoting();

      await (await voting.addVoter(voter1.address)).wait();
      await (await voting.startProposalsRegistering()).wait();
      await expect(voting.connect(voter1).addProposal("Proposition A")).to.emit(voting, "ProposalRegistered").withArgs(1n);
      const proposal = await voting.connect(voter1).getOneProposal(1n);
      expect(proposal.description).to.equal("Proposition A");
    });

    it("refuse une proposition vide", async function () {
      const { voting, voter1 } = await deployVoting();

      await (await voting.addVoter(voter1.address)).wait();
      await (await voting.startProposalsRegistering()).wait();
      await expect(voting.connect(voter1).addProposal("")).to.be.revertedWith("Vous ne pouvez pas ne rien proposer");
    });

    it("refuse une proposition faite par un électeur non inscrit", async function () {
      const { voting, outsider } = await deployVoting();

      await (await voting.startProposalsRegistering()).wait();
      await expect(voting.connect(outsider).addProposal("Proposition interdite")).to.be.revertedWith("You're not a voter");
    });

    it("refuse une proposition avant l'ouverture de l'enregistrement", async function () {
      const { voting, voter1 } = await deployVoting();

      await (await voting.addVoter(voter1.address)).wait();
      await expect(voting.connect(voter1).addProposal("Proposition A")).to.be.revertedWith("Proposals are not allowed yet");
    });

    it("refuse une proposition après la clôture de son enregistrement", async function () {
      const { voting, voter1 } = await deployVoting();

      await (await voting.addVoter(voter1.address)).wait();
      await (await voting.startProposalsRegistering()).wait();
      await (await voting.endProposalsRegistering()).wait();
      await expect(voting.connect(voter1).addProposal("Proposition tardive")).to.be.revertedWith("Proposals are not allowed yet");
    });

  });



  describe("Étapes du vote", function () {
    it("suit toutes les étapes dans le bon ordre et émet les événements attendus", async function () {
      const { voting, voter1, voter2 } = await deployVoting();

      await registerVoters(voting, voter1, voter2);
      await expect(voting.startProposalsRegistering()).to.emit(voting, "WorkflowStatusChange").withArgs(0n, 1n);
      await expect(voting.endProposalsRegistering()).to.emit(voting, "WorkflowStatusChange").withArgs(1n, 2n);
      await expect(voting.startVotingSession()).to.emit(voting, "WorkflowStatusChange").withArgs(2n, 3n);
      await expect(voting.endVotingSession()).to.emit(voting, "WorkflowStatusChange").withArgs(3n, 4n);
      await expect(voting.tallyVotes()).to.emit(voting, "WorkflowStatusChange").withArgs(4n, 5n);
      expect(await voting.workflowStatus()).to.equal(5n);
    });

    it("refuse de démarrer deux fois l'enregistrement des propositions", async function () {
      const { voting } = await deployVoting();

      await (await voting.startProposalsRegistering()).wait();
      await expect(voting.startProposalsRegistering()).to.be.revertedWith("Registering proposals cant be started now");
    });

    it("refuse de terminer l'enregistrement des propositions trop tôt", async function () {
      const { voting } = await deployVoting();

      await expect(voting.endProposalsRegistering()).to.be.revertedWith("Registering proposals havent started yet");
    });

    it("refuse de démarrer la session de vote avant la fin des propositions", async function () {
      const { voting } = await deployVoting();

      await expect(voting.startVotingSession()).to.be.revertedWith("Registering proposals phase is not finished");
    });

    it("refuse de terminer une session de vote qui n'a pas commencé", async function () {
      const { voting } = await deployVoting();

      await expect(voting.endVotingSession()).to.be.revertedWith("Voting session havent started yet");
    });

    it("réserve les changements d'état au propriétaire", async function () {
      const { voting, outsider, ethers } = await deployVoting();

      await expect(voting.connect(outsider).startProposalsRegistering()).to.be.revert(ethers);
      await expect(voting.connect(outsider).endProposalsRegistering()).to.be.revert(ethers);
      await expect(voting.connect(outsider).startVotingSession()).to.be.revert(ethers);
      await expect(voting.connect(outsider).endVotingSession()).to.be.revert(ethers);
      await expect(voting.connect(outsider).tallyVotes()).to.be.revert(ethers);
    });
  });




  describe("Votes", function () {
    it("permet à un électeur inscrit de voter et met à jour les compteurs", async function () {
      const { voting, voter1, voter2 } = await deployVoting();

      await prepareVoting(voting, voter1, voter2);
      await (await voting.connect(voter1).setVote(1n)).wait();

      const voter = await voting.connect(voter1).getVoter(voter1.address);
      const proposal = await voting.connect(voter1).getOneProposal(1n);

      expect(voter.hasVoted).to.equal(true);
      expect(voter.votedProposalId).to.equal(1n);
      expect(proposal.voteCount).to.equal(1n);
    });

    it("émet Voted avec l'adresse de l'électeur et l'identifiant de proposition", async function () {
      const { voting, voter1, voter2 } = await deployVoting();

      await prepareVoting(voting, voter1, voter2);
      await expect(voting.connect(voter1).setVote(1n)).to.emit(voting, "Voted").withArgs(voter1.address, 1n);
    });

    it("empêche un électeur de voter deux fois", async function () {
      const { voting, voter1, voter2 } = await deployVoting();

      await prepareVoting(voting, voter1, voter2);
      await (await voting.connect(voter1).setVote(1n)).wait();
      await expect(voting.connect(voter1).setVote(2n)).to.be.revertedWith("You have already voted");
    });

    it("refuse un vote pour une proposition inexistante", async function () {
      const { voting, voter1, voter2 } = await deployVoting();

      await prepareVoting(voting, voter1, voter2);
      await expect(voting.connect(voter1).setVote(999n)).to.be.revertedWith("Proposal not found");
    });

    it("refuse un vote avant l'ouverture de la session", async function () {
      const { voting, voter1 } = await deployVoting();

      await (await voting.addVoter(voter1.address)).wait();
      await expect(voting.connect(voter1).setVote(0n)).to.be.revertedWith("Voting session havent started yet");
    });

    it("refuse le vote d'un électeur non inscrit pendant la session", async function () {
      const { voting, voter1, voter2, outsider } = await deployVoting();

      await prepareVoting(voting, voter1, voter2);
      await expect(voting.connect(outsider).setVote(1n)).to.be.revertedWith("You're not a voter");
    });

    it("refuse un vote après la clôture de la session", async function () {
      const { voting, voter1, voter2 } = await deployVoting();

      await prepareVoting(voting, voter1, voter2);
      await (await voting.endVotingSession()).wait();
      await expect(voting.connect(voter1).setVote(1n)).to.be.revertedWith("Voting session havent started yet");
    });
  });



  describe("Comptage des voix", function () {
    it("désigne la proposition ayant obtenu le plus de voix", async function () {
      const { voting, voter1, voter2 } = await deployVoting();

      await prepareVoting(voting, voter1, voter2);
      await (await voting.connect(voter1).setVote(1n)).wait();
      await (await voting.connect(voter2).setVote(1n)).wait();
      await (await voting.endVotingSession()).wait();
      await (await voting.tallyVotes()).wait();

      expect(await voting.winningProposalID()).to.equal(1n);
      expect(await voting.workflowStatus()).to.equal(5n);
    });



    it("conserve la proposition au plus petit identifiant en cas d'égalité", async function () {
      const { voting, voter1, voter2 } = await deployVoting();

      await prepareVoting(voting, voter1, voter2);
      await (await voting.connect(voter1).setVote(1n)).wait();
      await (await voting.connect(voter2).setVote(2n)).wait();
      await (await voting.endVotingSession()).wait();
      await (await voting.tallyVotes()).wait();
      expect(await voting.winningProposalID()).to.equal(1n);
    });



    it("retient GENESIS si aucune voix n'a été exprimée", async function () {
      const { voting, voter1, voter2 } = await deployVoting();

      await prepareVoting(voting, voter1, voter2);
      await (await voting.endVotingSession()).wait();
      await (await voting.tallyVotes()).wait();
      expect(await voting.winningProposalID()).to.equal(0n);
    });



    it("refuse le comptage avant la fin de la session", async function () {
      const { voting } = await deployVoting();

      await expect(voting.tallyVotes()).to.be.revertedWith("Current status is not voting session ended");
    });




    it("refuse un nouveau comptage après que les résultats ont été calculés", async function () {
      const { voting, voter1, voter2 } = await deployVoting();

      await prepareVoting(voting, voter1, voter2);
      await (await voting.endVotingSession()).wait();
      await (await voting.tallyVotes()).wait();
      await expect(voting.tallyVotes()).to.be.revertedWith("Current status is not voting session ended");
    });
  });


});