# DApp Voting : installation et utilisation

Le contrat utilisé est `contracts/Voting.sol`. Le frontend se trouve dans `voting-dapp/` et utilise Next.js, React, Tailwind CSS, shadcn/ui, wagmi et RainbowKit. Aucun déploiement Vercel n'est effectué par les scripts de ce projet.

## Prérequis et installation

Utiliser une version de Node.js prise en charge par Hardhat 3 et Next.js. Les dépendances exactes sont figées dans les deux fichiers `package-lock.json`. Depuis la racine du dépôt :

```powershell
npm.cmd ci
npm.cmd --prefix voting-dapp ci
Copy-Item voting-dapp/.env.example voting-dapp/.env.local
```

Sous Windows PowerShell, `npm.cmd` évite le blocage éventuel de `npm.ps1` par la politique d'exécution. Copier le fichier d'exemple uniquement à la première installation : il configure le contrat Sepolia existant. Un identifiant Reown peut être ajouté dans `.env.local` pour WalletConnect.

Le projet Hardhat configure Solidity **0.8.38**, version exigée par le pragma existant de `Voting.sol`. Le premier build télécharge le compilateur si nécessaire.

## Lancement local en une commande

```powershell
npm.cmd run dapp:local
```

Cette commande compile les contrats, génère l'ABI depuis l'artifact réel, démarre un nœud Hardhat sur `127.0.0.1:8545` si nécessaire, déploie un nouveau contrat Voting et démarre Next.js sur [http://localhost:3000](http://localhost:3000).

Le lanceur conserve les autres variables présentes dans `voting-dapp/.env.local`, notamment `NEXT_PUBLIC_REOWN_PROJECT_ID`. Il ne démarre aucun déploiement Sepolia. Les clés privées de test ne sont pas affichées. `Ctrl+C` arrête les processus démarrés par le lanceur ; un nœud déjà présent avant son lancement reste ouvert.

Chaque lancement crée un nouveau scrutin. Après l'arrêt d'un nœud Hardhat, son état en mémoire est perdu. Pour continuer à utiliser un scrutin existant pendant que le nœud tourne, utiliser seulement :

```powershell
npm.cmd run dapp:dev
```

## Lancement manuel et comptes pour MetaMask

Ce mode affiche volontairement les clés des comptes publics de développement fournis par Hardhat, pour permettre leur import dans un wallet de test. Ces comptes et leurs clés sont connus publiquement ; ils doivent rester réservés au réseau local.

Si `dapp:local` tourne déjà, l'arrêter avec `Ctrl+C` avant de passer à ce mode, afin de libérer le port du nœud. Le scrutin en mémoire sera alors perdu ; le déploiement manuel ci-dessous en créera un nouveau.

Premier terminal :

```powershell
npm.cmd run voting:node
```

Deuxième terminal, depuis la racine :

```powershell
npm.cmd run voting:deploy:local
npm.cmd run dapp:dev
```

Ajouter le réseau local au wallet avec les paramètres suivants :

| Paramètre | Valeur |
| --- | --- |
| Nom | Hardhat local |
| URL RPC | `http://127.0.0.1:8545` |
| Chain ID | `31337` |
| Symbole | `ETH` |
| Explorateur | Aucun |

Les trois premiers comptes Hardhat par défaut sont :

| Rôle conseillé | Adresse |
| --- | --- |
| Administrateur : compte qui déploie | `0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266` |
| Électeur 1 | `0x70997970C51812dc3A010C7d01b50e0d17dc79C8` |
| Électeur 2 | `0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC` |

Importer les comptes souhaités dans le wallet à partir des clés affichées dans le premier terminal. L'administrateur n'est pas automatiquement inscrit comme électeur : pour proposer ou voter avec ce compte, l'ajouter également à la liste des électeurs.

Pour cette démonstration locale sur ordinateur, utiliser un wallet de développement distinct de ses comptes personnels. Aucune clé privée personnelle n'est nécessaire pour tester le projet.

## WalletConnect et démonstration sur téléphone

L'identifiant Reown est configuré dans `voting-dapp/.env.local`, fichier ignoré par Git. Il reste dans la configuration locale et n'est pas ajouté au dépôt. La connexion effective d'un wallet par QR code doit être vérifiée avec le wallet choisi ; un appairage WalletConnect réel n'a pas été validé pendant la réalisation.

Un téléphone ne peut pas joindre le nœud de l'ordinateur à l'adresse `127.0.0.1` : cette adresse désigne le téléphone lui-même. Pour une démonstration mobile, déployer explicitement le contrat sur Sepolia et utiliser son RPC public. Le mode Hardhat local est prévu ici pour le navigateur et le wallet de développement sur le même ordinateur.

## Parcours complet du devoir

1. Connecter le compte administrateur, puis inscrire les adresses des électeurs pendant l'étape « Inscription des électeurs ».
2. Ouvrir l'enregistrement des propositions avec le compte administrateur.
3. Connecter un électeur inscrit, écrire une proposition puis confirmer la transaction dans le wallet. Recommencer avec d'autres propositions si souhaité.
4. Avec l'administrateur, fermer les propositions puis ouvrir la session de vote.
5. Avec chaque électeur inscrit, choisir une proposition et confirmer son vote. Le contrat autorise un seul vote par électeur.
6. Avec l'administrateur, fermer le vote puis comptabiliser les voix.
7. Consulter le résultat, y compris en déconnectant le wallet.

Les transitions du contrat sont définitives : il ne propose aucune fonction de retour à une étape précédente ni de remise à zéro. Un nouveau scrutin nécessite un nouveau déploiement.

## Configuration publique du frontend

Le script de déploiement actualise uniquement les quatre premières variables ci-dessous dans `voting-dapp/.env.local`. Les autres lignes existantes sont conservées.

| Variable | Rôle |
| --- | --- |
| `NEXT_PUBLIC_CHAIN_ID` | `31337` en local, `11155111` sur Sepolia |
| `NEXT_PUBLIC_VOTING_ADDRESS` | Adresse du contrat Voting réellement déployé |
| `NEXT_PUBLIC_DEPLOYMENT_BLOCK` | Bloc à partir duquel récupérer les événements |
| `NEXT_PUBLIC_RPC_URL` | RPC public utilisé par le navigateur |
| `NEXT_PUBLIC_REOWN_PROJECT_ID` | Identifiant de projet Reown pour WalletConnect |

Les variables `NEXT_PUBLIC_*` sont exposées au navigateur. N'y placer aucune clé privée. Pour choisir un autre RPC public lors du déploiement, définir `NEXT_PUBLIC_RPC_URL` dans le terminal qui lance le script. Redémarrer Next.js après une modification de configuration ; pour une version de production, refaire également le build.

Le script utilise `http://127.0.0.1:8545` en local et, par défaut, `https://sepolia.gateway.tenderly.co` pour la lecture publique de Sepolia. Il ne copie pas le RPC privé de déploiement vers le navigateur. Le RPC doit conserver l'historique des événements depuis le bloc de déploiement ; une réponse « pruned history unavailable » empêche de reconstruire le scrutin.

## Déploiement Sepolia, à lancer explicitement

Le contrat Sepolia actuel est déjà déployé à l'adresse [`0x139a9158e889E0aA584709E053CA1BFF03E40845`](https://sepolia.etherscan.io/address/0x139a9158e889E0aA584709E053CA1BFF03E40845), au bloc `12086200`. Le propriétaire est `0x7745C2b7A0a3f0cE2Bb4f9A23D732CF1fB7B7d30`. Pour l'utiliser, lancer `npm.cmd run dapp:dev` depuis la racine. Les étapes de déploiement suivantes concernent la création d'un autre scrutin.

Le RPC de déploiement peut être configuré dans le fichier `.env` à la racine, sous `SEPOLIA_RPC_URL`. Le fichier `.env.example` indique les noms des variables. `hardhat.config.ts` charge `.env` avec `dotenv/config`. Il est ignoré par Git et son URL n'est pas copiée dans le frontend. Une variable d'environnement portant ce nom prend la priorité sur la valeur enregistrée dans le keystore.

Si `SEPOLIA_PRIVATE_KEY` est déjà enregistrée dans le keystore de production, il suffit de lancer la commande de déploiement ci-dessous et de saisir le mot de passe du keystore dans le terminal. Il n'est pas nécessaire de réenregistrer la clé. Ne transmettre ni ce mot de passe ni la clé dans une conversation.

Aucun script local ne déploie sur Sepolia automatiquement. Pour préparer un déploiement réel avec un compte de test alimenté en ETH Sepolia, enregistrer les variables de déploiement dans le keystore Hardhat :

```powershell
npm.cmd exec hardhat -- keystore set SEPOLIA_RPC_URL
npm.cmd exec hardhat -- keystore set SEPOLIA_PRIVATE_KEY
```

Puis lancer explicitement :

```powershell
npm.cmd run voting:deploy:sepolia
```

Le compte utilisé devient propriétaire du nouveau contrat. Le script vérifie le chain ID `11155111`, attend la confirmation du déploiement, génère l'ABI et écrit l'adresse ainsi que le bloc dans la configuration publique du frontend. Il ne reprend aucune clé présente dans les anciens scripts d'exercice.

La vérification Etherscan est facultative et utilise la variable `ETHERSCAN_API_KEY` ; la configuration ne contient plus de clé Etherscan en clair. Les variables de déploiement peuvent aussi être fournies par l'environnement conformément à la documentation Hardhat.

## Vérification et build

Depuis la racine :

```powershell
npm.cmd run build
npm.cmd run typecheck
npm.cmd run test:voting
npm.cmd exec hardhat -- test
npm.cmd run voting:abi
npm.cmd --prefix voting-dapp run lint
npm.cmd --prefix voting-dapp run typecheck
npm.cmd run dapp:build
```

`test:voting` cible les tests existants dans `test/Voting.ts`. Le matcher de lecture hors tableau a été corrigé pour vérifier le panic Solidity `0x32`. Le contrat fourni n'a pas été modifié. Le typecheck Hardhat exclut les autres sous-projets ainsi que le frontend, qui possède son propre typecheck.

Pour servir le frontend compilé, utiliser `npm.cmd --prefix voting-dapp run start` après le build, en maintenant le nœud RPC choisi disponible.

## Particularités du contrat à connaître

- `GENESIS`, identifiant `0`, est créé automatiquement à l'ouverture des propositions sans événement `ProposalRegistered`. Le contrat permet de voter pour cette proposition ; la DApp doit donc la représenter.
- En cas d'égalité, le contrat conserve la proposition ayant le plus petit identifiant parmi celles en tête. Sans aucun vote, `winningProposalID` vaut `0`. Le résultat définitif n'est disponible qu'après `tallyVotes`.
- Les getters de propositions et d'électeurs sont réservés aux électeurs. Les événements d'inscription permettent d'obtenir une adresse d'électeur pour les appels de lecture `eth_call`. Cette lecture ne signe aucune transaction. Les écritures, elles, sont toujours signées par le wallet connecté.
- Les événements `VoterRegistered`, `ProposalRegistered`, `Voted` et `WorkflowStatusChange` permettent de reconstruire les listes et l'activité depuis le bloc de déploiement. Les données de vote sur la chaîne sont publiques ; il ne s'agit pas d'un scrutin secret.
- Le contrat n'impose ni longueur maximale ni unicité des descriptions. Ses droits et conditions restent vérifiés sur la chaîne, indépendamment des contrôles de l'interface.

## Sources

- Code de référence : [`Voting.sol`](../contracts/Voting.sol), [`Voting.ts`](../test/Voting.ts), [`hardhat.config.ts`](../hardhat.config.ts).
- [Documentation Hardhat 3](https://hardhat.org/llms.txt), [nœud local](https://hardhat.org/docs/guides/hardhat-node), [variables de configuration](https://hardhat.org/docs/guides/configuration-variables), [Network Manager](https://hardhat.org/docs/reference/network-manager).
- [ethers v6](https://docs.ethers.org/v6/), [Next.js](https://nextjs.org/docs), [Tailwind CSS](https://tailwindcss.com/docs), [shadcn/ui](https://ui.shadcn.com/docs).
- [wagmi](https://wagmi.sh/react/getting-started), [RainbowKit](https://rainbowkit.com/docs/installation), [Reown Dashboard](https://dashboard.reown.com/).
