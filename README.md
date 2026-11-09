# Trust

Application de vote sur Ethereum : inscription des électeurs, propositions,
vote unique, dépouillement et consultation publique des résultats.

**Application :** https://trust-voting-dapp.vercel.app

**Vidéo de démonstration :** [Voir la vidéo](https://drive.google.com/file/d/1qcroltmNKLkFL0Cc5RWrwuMuk_sK-vfp/view?usp=drive_link)

**Contrat Sepolia :** [0x9644317c96ce808D9E4b61b1c3eF7FbE6cCaA8D8](https://sepolia.etherscan.io/address/0x9644317c96ce808D9E4b61b1c3eF7FbE6cCaA8D8), bloc `12099445`.

## Technologies

Solidity 0.8.38, Hardhat 3, Next.js, React, TypeScript, Tailwind CSS,
shadcn/ui, wagmi et RainbowKit.

## Installation

Node.js 24 est utilisé pour le backend et le frontend.

```powershell
npm.cmd ci
npm.cmd --prefix voting-dapp ci
Copy-Item voting-dapp/.env.example voting-dapp/.env.local
npm.cmd run dapp:dev
```

Ouvrir http://localhost:3000. Le fichier `.env.example` est un modèle ;
les valeurs utilisées par le frontend sont dans `.env.local` ou dans
les variables du projet Vercel.

## Réseau local

```powershell
npm.cmd run dapp:local
```

Le script lance Hardhat, déploie Voting et démarre le frontend.
`npm.cmd run dapp:demo` affiche également les comptes de développement.
Ces comptes sont réservés au réseau local 31337.

## Déploiement Sepolia avec MetaMask

```powershell
npm.cmd run voting:deploy:wallet
```

Ouvrir l'URL affichée dans le terminal, connecter le compte administrateur
sur Sepolia et confirmer la création du contrat dans MetaMask. Le script
vérifie le reçu, le bytecode, le propriétaire et l'état initial, puis met
à jour la configuration locale et `deployments/sepolia/Voting.json`.

L'adresse administratrice peut être choisie avant le lancement avec la
variable d'environnement `VOTING_ADMIN_ADDRESS`. Le compte qui déploie
devient propriétaire du contrat.

## Vérifications

```powershell
npm.cmd run build
npm.cmd run typecheck
npm.cmd test
npm.cmd --prefix voting-dapp run lint
npm.cmd --prefix voting-dapp run typecheck
npm.cmd run dapp:build
```

Les tests du contrat sont dans `test/Voting.ts`. Les tests d'intégration du
lecteur blockchain sont documentés dans [voting-dapp/tests](voting-dapp/tests/README.md).

## Hébergement

Sur Vercel : framework **Next.js**, dossier racine **`voting-dapp`**,
Node.js **24.x**. Les variables publiques sont décrites dans le
[guide de configuration](docs/VOTING-DAPP.md).

Pour le CLI, lancer `vercel deploy --prod` depuis la racine. Le fichier
`.vercelignore` limite l'envoi aux sources du frontend et exclut les
fichiers d'environnement locaux.

Les transitions du scrutin sont définitives. Pour recommencer, il faut
déployer un nouveau contrat puis modifier l'adresse et le bloc de déploiement
dans la configuration du frontend.
