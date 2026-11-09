# Trust — Frontend

Interface Next.js du contrat `contracts/Voting.sol`.

## Installation

Depuis ce dossier :

```powershell
npm.cmd ci
Copy-Item .env.example .env.local
npm.cmd run dev
```

Ouvrir http://localhost:3000. Le modèle `.env.example` contient uniquement
des paramètres publics. La connexion WalletConnect nécessite un identifiant
de projet Reown ; un wallet injecté peut fonctionner sans cet identifiant.

## Commandes

```powershell
npm.cmd run lint
npm.cmd run typecheck
npm.cmd run build
npm.cmd run test:integration
```

Les tests d'intégration utilisent un nœud Hardhat local et leurs propres
contrats. Voir [tests/README.md](tests/README.md).

## Organisation

- `src/components/voting-dashboard.tsx` : interface du scrutin.
- `src/hooks/use-voting.ts` : connexion, droits et transactions.
- `src/lib/voting-reader.ts` : lecture du contrat et de ses événements.
- `src/lib/voting-abi.ts` : ABI générée depuis le contrat compilé.

Les données du scrutin sont publiques. Les écritures sont signées par le
wallet connecté et les permissions sont contrôlées par le contrat.

[Configuration et fonctionnement](../docs/VOTING-DAPP.md).
