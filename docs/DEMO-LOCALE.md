# Démonstration locale du devoir

Ce guide permet de filmer un scrutin complet sur votre ordinateur, sans ETH réel et sans utiliser votre compte personnel.

## Avant de commencer

Fermez les autres commandes `dapp:local`, `dapp:demo`, `dapp:dev` et `hardhat node` avec `Ctrl+C`. Elles peuvent occuper les ports `3000` ou `8545`.

Depuis la racine du projet, lancez :

```powershell
npm.cmd run dapp:demo
```

Si le port `3000` est occupé, choisissez par exemple `3001` :

```powershell
$env:PORT = 3001
npm.cmd run dapp:demo
```

Attendez le message `DApp : http://localhost:...`. Gardez ce terminal ouvert pendant toute la vidéo : il exécute le nœud Hardhat, le contrat local et Next.js.

`dapp:demo` affiche les comptes et leurs clés **de développement Hardhat** dans ce terminal. Ils sont publics et ne sont utilisables que sur ce réseau local. Ne les utilisez jamais sur Sepolia, Ethereum ou avec des fonds réels.

## Configurer le wallet de développement

Dans MetaMask, ajoutez le réseau suivant :

| Champ | Valeur |
| --- | --- |
| Nom du réseau | Hardhat local |
| URL RPC | `http://127.0.0.1:8545` |
| ID de chaîne | `31337` |
| Symbole | `ETH` |
| Explorateur | laisser vide |

Depuis le terminal qui exécute `dapp:demo`, importez avec **Importer un compte** :

1. le premier compte Hardhat : administrateur ;
2. le deuxième compte Hardhat : électeur.

Les adresses attendues sont affichées au démarrage. Le premier compte déploie le contrat, donc il est automatiquement son administrateur. N'utilisez pas la phrase de récupération de votre wallet personnel pour cette démo.

## Déroulé à filmer

1. Ouvrez l’URL indiquée dans le terminal, puis connectez le compte administrateur au réseau **Hardhat local**.
2. Dans « Électeurs », copiez l’adresse du deuxième compte depuis MetaMask, inscrivez-la, puis confirmez la transaction. Montrez que l’électeur apparaît dans la liste.
3. Avec l’administrateur, ouvrez l’enregistrement des propositions et confirmez. La proposition `GENESIS` est alors créée automatiquement.
4. Dans MetaMask, changez pour le deuxième compte. Dans « Propositions », saisissez une idée, publiez-la et confirmez la transaction.
5. Revenez sur le premier compte. Clôturez les propositions puis ouvrez le vote, en confirmant chaque action.
6. Changez de nouveau pour le deuxième compte. Choisissez la proposition créée à l’étape 4, puis confirmez le vote.
7. Revenez sur l’administrateur. Fermez le vote, puis comptabilisez les voix.
8. Montrez le résultat final, la proposition gagnante et l’onglet « Activité ».

L’administrateur n’a pas besoin de voter pour cette démo. S’il doit aussi proposer ou voter, il faut l’inscrire dans la liste électorale avant l’ouverture des propositions.

## Recommencer la démo

Arrêtez `dapp:demo` avec `Ctrl+C`, puis relancez la commande. Le nœud Hardhat local repartira avec un nouveau scrutin. L’état du précédent scrutin local est perdu : c’est attendu.

Pour revenir au contrat Sepolia déjà configuré après la démo, arrêtez le processus, puis lancez :

```powershell
npm.cmd run dapp:dev
```

## Ce que montre cette démo

Elle couvre la liste blanche des électeurs, le dépôt de propositions, le vote unique, les transitions réservées à l’administrateur, le comptage, le résultat et l’historique blockchain. Ce sont les fonctionnalités demandées par le sujet.
