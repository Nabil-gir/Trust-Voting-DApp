// La démo locale doit afficher les comptes Hardhat afin de pouvoir les importer
// dans un wallet de développement. Ces clés sont connues publiquement et ne
// doivent jamais être utilisées hors du réseau local 31337.
process.env.SHOW_HARDHAT_ACCOUNTS = "true";

await import("./start-voting-local.mjs");
