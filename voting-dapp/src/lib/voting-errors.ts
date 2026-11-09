import { BaseError, ContractFunctionRevertedError, UserRejectedRequestError } from "viem";

export function votingError(error: unknown): string {
  if (error instanceof BaseError) {
    if (error.walk((e) => e instanceof UserRejectedRequestError) instanceof UserRejectedRequestError) return "Vous avez refusé la demande dans votre wallet. Aucune transaction n’a été envoyée.";
    const reverted = error.walk((e) => e instanceof ContractFunctionRevertedError);
    if (reverted instanceof ContractFunctionRevertedError) {
      const reason = reverted.reason || reverted.data?.errorName || "";
      const known: Record<string, string> = {
        "OwnableUnauthorizedAccount": "Cette action est réservée à l’administrateur du scrutin.",
        "You're not a voter": "Cette adresse n’est pas inscrite sur la liste des électeurs.",
        "Already registered": "Cette adresse est déjà inscrite.",
        "You have already voted": "Votre vote a déjà été enregistré.",
        "Proposal not found": "Cette proposition n’existe pas.",
      };
      return known[reason] || "Le contrat a refusé cette action. L’étape du scrutin a peut-être changé ; actualisez les données.";
    }
    if (/reject|denied|4001/i.test(error.message)) return "La demande a été refusée dans le wallet.";
    if (/insufficient funds/i.test(error.message)) return "Votre wallet ne dispose pas d’assez d’ETH de test pour payer les frais de réseau.";
    return "Impossible de communiquer avec le réseau. Vérifiez que le nœud RPC est disponible et que le bon réseau est sélectionné.";
  }
  return error instanceof Error ? error.message : "Une erreur est survenue. Réessayez après avoir actualisé les données.";
}
