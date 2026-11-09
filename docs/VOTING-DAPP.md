# Configuration de Trust

## Variables du frontend

En local, les valeurs sont définies dans `voting-dapp/.env.local`.
Sur Vercel, elles sont définies dans les variables d'environnement du projet.

| Variable | Utilisation |
| --- | --- |
| `NEXT_PUBLIC_CHAIN_ID` | `11155111` pour Sepolia ou `31337` pour Hardhat local |
| `NEXT_PUBLIC_VOTING_ADDRESS` | Adresse du contrat Voting |
| `NEXT_PUBLIC_DEPLOYMENT_BLOCK` | Bloc de création du contrat |
| `NEXT_PUBLIC_RPC_URL` | URL RPC accessible depuis le navigateur |
| `NEXT_PUBLIC_REOWN_PROJECT_ID` | Identifiant de projet Reown pour WalletConnect |

Ces variables sont publiques. Les clés privées, mots de passe et clés
Etherscan n'ont pas leur place dans la configuration du frontend.

Après un changement, redémarrer le serveur local ou refaire le déploiement
Vercel : les valeurs `NEXT_PUBLIC_*` sont intégrées au build.

Le RPC doit fournir les événements depuis le bloc de déploiement. Le RPC
Sepolia actuellement configuré est `https://sepolia.gateway.tenderly.co`.

## Rôles

- L'administrateur est le compte qui a déployé le contrat. Il inscrit les
  électeurs, fait avancer les étapes et comptabilise les votes.
- Un électeur inscrit peut déposer des propositions et voter aux étapes prévues.
- Un visiteur peut consulter l'activité et les résultats sans connecter de wallet.

L'administrateur n'est pas électeur par défaut : il doit inscrire sa propre
adresse s'il souhaite proposer ou voter.

## Étapes

1. Inscription des électeurs.
2. Ouverture des propositions par l'administrateur.
3. Dépôt des propositions par les électeurs, puis clôture par l'administrateur.
4. Ouverture du vote par l'administrateur.
5. Un vote par électeur inscrit.
6. Clôture du vote et comptabilisation par l'administrateur.
7. Consultation du résultat.

Ces transitions sont irréversibles. Un autre scrutin nécessite un nouveau
contrat. La proposition initiale `GENESIS` possède l'identifiant 0 et peut
recevoir des votes. En cas d'égalité, le contrat conserve la proposition
gagnante de plus petit identifiant.

## Nouveau contrat Sepolia

```powershell
npm.cmd run voting:deploy:wallet
```

La page locale permet de signer avec MetaMask. Le script contrôle le réseau,
le reçu, le bytecode et le propriétaire avant de modifier `.env.local`.
Le résultat public est enregistré dans `deployments/sepolia/Voting.json`.

Pour utiliser ce contrat sur Vercel, reporter son adresse et son bloc de
création dans les variables du projet, puis redéployer le frontend.

## Sources techniques

- Contrat : [Voting.sol](../contracts/Voting.sol).
- [Hardhat](https://hardhat.org/docs), [ethers](https://docs.ethers.org/v6/).
- [Next.js](https://nextjs.org/docs), [wagmi](https://wagmi.sh/react/getting-started), [RainbowKit](https://rainbowkit.com/docs/installation).
- [Variables Vercel](https://vercel.com/docs/environment-variables), [exclusions Vercel](https://vercel.com/docs/deployments/vercel-ignore).
