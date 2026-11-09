# Voting.sol

Projet Solidity pour mettre en place un système de vote.

Le contrat permet d'inscrire des électeurs, d'ajouter des propositions, de voter et de compter les voix.

## Tests

Les tests sont dans `test/Voting.ts`. Ils vérifient l'inscription des électeurs, les propositions, les étapes du vote, les votes et le résultat final.

Pour lancer les tests :

```powershell
npm.cmd run test:voting
```

Pour le coverage : `npm.cmd exec hardhat -- test mocha test/Voting.ts --coverage`.

## DApp Next.js

Le frontend est dans [`voting-dapp/`](voting-dapp/). Il utilise Next.js, React, Tailwind CSS, shadcn/ui, wagmi et RainbowKit, avec le contrat Voting fourni. Aucun déploiement Vercel n'est lancé.

Le contrat Sepolia est déployé à l'adresse [`0x139a9158e889E0aA584709E053CA1BFF03E40845`](https://sepolia.etherscan.io/address/0x139a9158e889E0aA584709E053CA1BFF03E40845), au bloc `12086200`. L'administrateur est `0x7745C2b7A0a3f0cE2Bb4f9A23D732CF1fB7B7d30`. La configuration actuelle du frontend utilise ce contrat ; les [preuves du déploiement](deployments/sepolia/Voting-89c21650102b.json) sont conservées dans le dépôt.

Pour ouvrir la DApp connectée à Sepolia :

```powershell
npm.cmd run dapp:dev
```

Ouvrir [http://localhost:3000](http://localhost:3000), puis sélectionner Sepolia dans le wallet. Le compte administrateur doit également s'inscrire comme électeur pour proposer ou voter.

Pour filmer une démonstration complète avec les comptes Hardhat locaux, utiliser la commande suivante. Elle affiche les comptes de développement dans le terminal, démarre le réseau local, déploie un nouveau contrat puis lance le frontend :

```powershell
npm.cmd run dapp:demo
```

Ouvrir [http://localhost:3000](http://localhost:3000). Le tutoriel pas à pas, l’import des deux comptes de test dans MetaMask et la séquence à filmer sont dans [`docs/DEMO-LOCALE.md`](docs/DEMO-LOCALE.md). Pour démarrer localement sans afficher les comptes, utiliser `npm.cmd run dapp:local`.

Pour utiliser un contrat existant, lancer seulement `npm.cmd run dapp:dev`, avec le RPC du réseau configuré disponible.

Les [vérifications effectuées](docs/VALIDATION.md) et les [alertes de dépendances restantes](docs/DEPENDENCIES.md) sont documentées.
