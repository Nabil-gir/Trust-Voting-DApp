# Vérification de la DApp Trust

Vérifications réalisées le 7 novembre 2026 dans ce dépôt, sous Windows avec Node.js 24.22.0. Les résultats ci-dessous correspondent aux commandes exécutées pendant la réalisation, et non à une certification de sécurité.

| Contrôle | Résultat |
| --- | --- |
| Compilation Hardhat avec Solidity 0.8.38 | Réussite, profils normal et optimisé |
| TypeScript du projet Hardhat | Réussite |
| Suite `test/Voting.ts` | 49 tests réussis |
| Ensemble des tests Mocha du backend | 59 tests réussis |
| Lint du frontend | Réussite |
| TypeScript du frontend | Réussite, également exécuté par le build Next.js |
| Build de production `next build` | Réussite, pages `/` et `/_not-found` générées |
| Tests d’intégration du lecteur blockchain | 4 tests réussis sur de vrais contrats locaux isolés |
| HTTP du serveur de production | Accueil 200, CSS 200, icône 200, page inconnue 404 |
| Document initial | Langue française, titre et navigation présents ; feuille de style compilée chargée |
| Préservation de la configuration | Identifiant Reown conservé ; `.env.local`, `.next` et `node_modules` ignorés par Git |

Les tests d’intégration vérifient les six étapes du scrutin, l’inscription de deux électeurs, les descriptions Unicode longues, le vote unique, le départage des égalités, un vrai vote pour GENESIS et le dépouillement sans électeur. Ils contrôlent aussi la lecture publique sans appel de signature, les limites de plages RPC et le refus d’un historique incomplet, d’un bloc futur ou d’une adresse sans contrat. Ils ne modifient pas le contrat configuré pour l’interface. Source : [`voting-reader.test.ts`](../voting-dapp/tests/voting-reader.test.ts).

Le démarrage `npm.cmd run dapp:local` a été essayé avec un nœud déjà présent et depuis des ports libres : création du nœud, déploiement confirmé, génération de l’ABI, configuration publique et démarrage de Next.js. Le contrôle d’un port frontend occupé a également été vérifié avant déploiement.

Le contrôle HTTP a également réussi sur ce démarrage à froid. L’arrêt par `Ctrl+C` a libéré les ports 3000 et 8545 ; aucun serveur de vérification n’est laissé actif.

Versions installées relevées : Next.js 16.4.5, React 19.3.1, Tailwind CSS 4.3.5, wagmi 2.19.5, viem 2.57.16, RainbowKit 2.2.11 et Radix UI 1.8.1. Les versions et dépendances exactes sont conservées dans [`voting-dapp/package-lock.json`](../voting-dapp/package-lock.json).

## Limites constatées

Le service de contrôle du navigateur et le service Windows Computer Use étaient indisponibles. Il n’y a donc pas eu de vérification visuelle interactive, d’import de compte MetaMask, d’appairage WalletConnect réel ou de signature depuis une extension utilisateur. Les contrôles HTTP ne remplacent pas ces essais. L’identifiant Reown est configuré ; son acceptation effective par le service n’a pas été vérifiée.

L’audit de dépendances conserve des alertes transitives documentées dans [`DEPENDENCIES.md`](DEPENDENCIES.md). Les contrôles du 7 novembre précèdent le déploiement du frontend sur Vercel le 9 novembre. Le contrat a également été déployé sur Sepolia, comme indiqué ci-dessous.

## Déploiement Sepolia confirmé

Le contrat [`0x139a9158e889E0aA584709E053CA1BFF03E40845`](https://sepolia.etherscan.io/address/0x139a9158e889E0aA584709E053CA1BFF03E40845) a été créé au bloc `12086200`, par la transaction [`0x89c21650102bd6c24bcac68efae1cf0cbed6d072764d2d25dee1a2696cb5abf8`](https://sepolia.etherscan.io/tx/0x89c21650102bd6c24bcac68efae1cf0cbed6d072764d2d25dee1a2696cb5abf8). Le [reçu et les résultats des contrôles](../deployments/sepolia/Voting-89c21650102b.json) contiennent uniquement des informations publiques.

Vérifications effectuées par RPC sur la chaîne `11155111` : reçu réussi ; bytecode runtime identique à l'artifact optimisé Solidity 0.8.38 ; propriétaire `0x7745C2b7A0a3f0cE2Bb4f9A23D732CF1fB7B7d30` ; étape initiale `0` ; identifiant gagnant initial `0` ; événement constructeur `OwnershipTransferred` correct.

Une vérification indépendante avec le véritable `readVotingSnapshot` du frontend et le RPC Publicnode, au bloc `12086208`, a retrouvé ce propriétaire, cette étape et des listes d'électeurs, de propositions et d'activité vides. Le déploiement disposait alors de neuf confirmations. Aucune inscription ni transition n'a été envoyée sur ce scrutin. La configuration publique du frontend a été mise à jour vers ce contrat, puis le build de production a réussi.

Le serveur de production reconstruit pour Sepolia a ensuite passé `test:http` : accueil 200, CSS 200, icône 200 et page inconnue 404. Le JavaScript compilé contient l'adresse du contrat ci-dessus, et les quatre variables publiques du frontend correspondent au reçu. Le serveur de vérification a été arrêté après ces contrôles.

La clé utilisée pour signer a été fournie dans la conversation et n'a pas été écrite dans les fichiers du projet. Ce compte doit rester réservé aux tests ; le partage d'une clé privée compromet sa confidentialité. [Consignes MetaMask sur les clés privées](https://support.metamask.io/stay-safe/safety-in-web3/basic-safety-and-security-tips-for-metamask/).

## Reproduire

Depuis la racine, utiliser les commandes du [guide](VOTING-DAPP.md). Pour les vérifications spécifiques au frontend :

```powershell
npm.cmd --prefix voting-dapp run lint
npm.cmd --prefix voting-dapp run typecheck
npm.cmd --prefix voting-dapp run build
```

Avec un nœud local et les contrats compilés, `npm.cmd --prefix voting-dapp run test:integration` exécute les quatre tests. Avec le frontend démarré, `npm.cmd --prefix voting-dapp run test:http` exécute le [contrôle HTTP](../voting-dapp/scripts/check-http.mjs).
