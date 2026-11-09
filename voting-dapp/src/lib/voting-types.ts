import type { Address, Hash } from "viem";

export type VotingAction = "addVoter" | "addProposal" | "setVote" | "startProposalsRegistering" | "endProposalsRegistering" | "startVotingSession" | "endVotingSession" | "tallyVotes";
export type Voter = { address: Address; hasVoted: boolean; votedProposalId?: bigint };
export type Proposal = { id: bigint; description: string; voteCount: bigint };
export type Activity = { id: string; kind: "voter" | "proposal" | "vote" | "workflow"; title: string; detail: string; blockNumber: bigint; transactionHash: Hash };
export type VotingSnapshot = { owner: Address; status: number; winnerId: bigint; voters: Voter[]; proposals: Proposal[]; activity: Activity[]; blockNumber: bigint };
export type TransactionState = { status: "idle" | "signature" | "confirming" | "success" | "error"; label?: string; hash?: Hash; error?: string };

export const PHASES = [
  { label: "Inscription des électeurs", short: "Électeurs", description: "L’administrateur constitue la liste des électeurs autorisés." },
  { label: "Dépôt des propositions", short: "Propositions", description: "Les électeurs inscrits peuvent proposer leurs idées." },
  { label: "Propositions clôturées", short: "Validation", description: "Les propositions sont enregistrées. Le vote peut bientôt commencer." },
  { label: "Vote en cours", short: "Vote", description: "Chaque électeur inscrit dispose d’une voix. À vous de choisir." },
  { label: "Vote clôturé", short: "Clôture", description: "Le scrutin est fermé. L’administrateur peut compter les voix." },
  { label: "Résultats publiés", short: "Résultats", description: "Le dépouillement est terminé. Les résultats sont accessibles à tous." },
] as const;

export const TRANSITIONS: { action: VotingAction; label: string; description: string }[] = [
  { action: "startProposalsRegistering", label: "Ouvrir les propositions", description: "L’inscription des électeurs sera définitivement fermée." },
  { action: "endProposalsRegistering", label: "Clôturer les propositions", description: "Aucune nouvelle proposition ne pourra être ajoutée." },
  { action: "startVotingSession", label: "Ouvrir le vote", description: "Les électeurs pourront voter une seule fois." },
  { action: "endVotingSession", label: "Clôturer le vote", description: "Aucun nouveau vote ne pourra être enregistré." },
  { action: "tallyVotes", label: "Comptabiliser les votes", description: "Le contrat calculera et publiera le résultat définitif." },
];

export function shortAddress(value: string) { return `${value.slice(0, 6)}…${value.slice(-4)}`; }
