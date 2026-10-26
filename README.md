# Voting.sol

Projet Solidity pour mettre en place un système de vote.

Le contrat permet d'inscrire des électeurs, d'ajouter des propositions, de voter et de compter les voix.

## Tests

Les tests sont dans `test/VotingTest.ts`. Ils vérifient notamment l'inscription des électeurs, les propositions, les étapes du vote, les votes et le résultat final.

Pour lancer les tests :

npx hardhat test test/VotingTest.ts