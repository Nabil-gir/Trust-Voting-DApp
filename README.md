# Trust — Système de vote

DApp de vote avec Solidity, Hardhat 3, Next.js, React, Tailwind CSS, shadcn/ui, wagmi et RainbowKit.

Le contrat permet d'inscrire des électeurs, d'ajouter des propositions, de voter et de compter les voix.

- **Application publique** : https://trust-voting-dapp.vercel.app
- **Contrat Sepolia vérifié** : [Voting sur Blockscout](https://eth-sepolia.blockscout.com/address/0x139a9158e889E0aA584709E053CA1BFF03E40845#code)
- **Démonstration vidéo à réaliser** : [déroulé à filmer](docs/DEMO-LOCALE.md).

## Installation

Avec Node.js 24, depuis la racine du dépôt dans PowerShell :

```powershell
npm.cmd ci
npm.cmd --prefix voting-dapp ci
Copy-Item voting-dapp/.env.example voting-dapp/.env.local
```

Copier le fichier d'exemple à la première installation ; il configure la consultation du contrat Sepolia existant. `NEXT_PUBLIC_REOWN_PROJECT_ID` est facultatif pour les wallets injectés dans le navigateur et nécessaire pour WalletConnect.

## Structure du dépôt

```text
contracts/Voting.sol             Contrat du scrutin
test/Voting.ts                   Tests du contrat
ignition/modules/Voting.ts       Module de déploiement alternatif
scripts/                        Déploiement, ABI et lancement local
deployments/sepolia/             Preuve publique du déploiement
voting-dapp/                     Frontend Next.js et tests d'intégration
docs/                           Installation, démo et vérifications
.github/workflows/ci.yml         Tests du contrat et build du frontend
```

Les exercices Counter/ERC20 et les scripts d'entraînement ne font pas partie du projet publié. Les fichiers `.env`, `.env.local`, `.vercel`, les clés, les dépendances et les résultats de compilation sont ignorés par Git.

## Tests

Les tests sont dans `test/Voting.ts`. Ils vérifient l'inscription des électeurs, les propositions, les étapes du vote, les votes et le résultat final.

Pour lancer les tests :

```powershell
npm.cmd run test:voting
```

Pour le coverage : `npm.cmd exec hardhat -- test mocha test/Voting.ts --coverage`.

## DApp Next.js

Le frontend est dans [`voting-dapp/`](voting-dapp/). Il utilise le contrat Voting fourni et est hébergé sur [Vercel](https://trust-voting-dapp.vercel.app).

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

## Configuration Vercel

Utiliser le framework **Next.js**, le dossier racine **`voting-dapp`** et Node.js **24.x**. Les cinq variables publiques sont décrites dans [`voting-dapp/.env.example`](voting-dapp/.env.example). Les clés privées et la clé Etherscan restent côté Hardhat.

Les transitions du contrat sont définitives : un nouveau scrutin nécessite un nouveau déploiement. La démonstration locale et le site hébergé utilisent des contrats distincts.
