# Trust — Système de vote

DApp française connectée au contrat `../contracts/Voting.sol`, avec Next.js, React, Tailwind CSS, les composants shadcn/ui, wagmi, viem et RainbowKit.

## Démarrer

Depuis la **racine Hardhat**, après installation des dépendances :

```powershell
npm.cmd run dapp:dev
```

Ouvrir http://localhost:3000. La configuration actuelle utilise le contrat Sepolia [`0x139a9158e889E0aA584709E053CA1BFF03E40845`](https://sepolia.etherscan.io/address/0x139a9158e889E0aA584709E053CA1BFF03E40845). Connecter un wallet sur Sepolia pour signer les actions ; la consultation publique fonctionne sans wallet.

Le compte administrateur est `0x7745C2b7A0a3f0cE2Bb4f9A23D732CF1fB7B7d30`. Il doit également s'inscrire comme électeur s'il souhaite proposer ou voter. Les [preuves publiques du déploiement](../deployments/sepolia/Voting-89c21650102b.json) indiquent la transaction, le bloc et les contrôles effectués.

Pour la démonstration du devoir sur Hardhat local, lancer `npm.cmd run dapp:demo` depuis la racine. Cette commande affiche les comptes de développement dans le terminal, démarre le nœud, déploie un contrat et configure le frontend pour ce nouveau scrutin. Le [tutoriel de démonstration locale](../docs/DEMO-LOCALE.md) indique les clics à effectuer avec un compte administrateur et un compte électeur.

Le [guide complet](../docs/VOTING-DAPP.md) explique l’installation, les comptes de développement, les six étapes du scrutin et la configuration de Sepolia. Le [suivi des dépendances](../docs/DEPENDENCIES.md) décrit les correctifs et les alertes restantes.

Application publique : https://trust-voting-dapp.vercel.app. Sur Vercel, le framework est **Next.js**, le dossier racine est **`voting-dapp`** et la version de Node.js est **24.x**. Les variables publiques sont configurées dans le projet Vercel ; les fichiers locaux `.env` ne sont pas publiés.

## Commandes du frontend

Depuis ce dossier :

```powershell
npm.cmd run dev
npm.cmd run typecheck
npm.cmd run lint
npm.cmd run build
npm.cmd run test:integration
```

Les tests d’intégration nécessitent le nœud Hardhat local et un contrat compilé. Ils déploient leurs propres contrats, sans modifier le scrutin configuré pour l’application. `npm.cmd test` ignore explicitement ces tests lorsqu’aucun mode d’intégration n’est demandé.

Avec le frontend déjà démarré, `npm.cmd run test:http` vérifie les réponses HTTP, le document français, la feuille de style, l’icône et la page 404. Ce contrôle ne simule pas les interactions avec un navigateur ou un wallet.

## Organisation

- `src/components/voting-dashboard.tsx` : tableaux de bord public, administrateur et électeur.
- `src/components/ui/` : composants générés par la CLI officielle shadcn/ui.
- `src/hooks/use-voting.ts` : connexion, permissions, simulation, signatures et confirmations.
- `src/lib/voting-reader.ts` : lecture publique, événements paginés et historique mis en cache avec contrôle des réorganisations.
- `src/lib/voting-abi.ts` : ABI générée à partir de l’artifact Solidity réel.
- `.env.example` : variables publiques à configurer ; `.env.local` est ignoré par Git.

Le contrat conserve ses règles : propriétaire distinct de la liste électorale, proposition initiale GENESIS votable, vote unique, transitions définitives et départage des égalités par le plus petit identifiant. Les votes et les adresses sont publics.
