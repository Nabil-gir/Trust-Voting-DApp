Les tests `voting-reader.test.ts` vérifient le lecteur réellement utilisé par la
DApp sur des contrats Voting isolés, compilés depuis `contracts/Voting.sol`.
Ils ne changent ni le contrat configuré pour l'application, ni son fichier `.env`.

Depuis la racine du dépôt, compiler le contrat et démarrer le nœud local :

```powershell
npm.cmd run build
npm.cmd run voting:node
```

Dans un second terminal, depuis `voting-dapp` :

```powershell
npm.cmd run test:integration
```

La commande équivalente sans script npm est :

```powershell
$env:VOTING_INTEGRATION = "1"
npm.cmd test
Remove-Item Env:VOTING_INTEGRATION
```

`npm test` ignore ces tests réseau si `VOTING_INTEGRATION` n'est pas activé.
L'URL par défaut est `http://127.0.0.1:8545`, personnalisable avec
`VOTING_TEST_RPC_URL`. Par sécurité les transactions de test exigent un hôte
local, le réseau 31337 et trois comptes de développement déverrouillés.
Aucune clé privée ou phrase de récupération n'est nécessaire.

Couverture : les six étapes, électeurs et propositions, textes longs et Unicode,
lecture publique sans signature, compte administrateur non électeur, vote unique,
égalité départagée par le contrat, proposition GENESIS avec et sans électeur,
indexation des événements et limitations de plages RPC, absence de contrat,
bloc futur et historique incomplet.
