# Dépendances du frontend et avis de sécurité

Revue effectuée le 7 novembre 2026. Les versions réellement installées sont
figées dans `voting-dapp/package-lock.json`. Les avis et les versions publiées
peuvent évoluer : relancer l'audit après toute mise à jour.

## Compatibilité RainbowKit et wagmi

La DApp utilise RainbowKit `2.2.11` et wagmi `2.19.5`. Le manifeste publié de
RainbowKit impose le peer `wagmi: ^2.9.0`, ainsi que `viem: 2.x` et React
`>=18`. Une mise à jour automatique vers wagmi 3 ne respecte donc pas ce
contrat de compatibilité. La suggestion de `npm audit fix --force` n'est pas
appliquée. [Manifeste officiel RainbowKit 2.2.11](https://registry.npmjs.org/@rainbow-me%2Frainbowkit/2.2.11).

## Peers optionnels du SDK Coinbase

Les dépendances directes `@x402/core`, `@x402/evm` et `@x402/svm`, toutes en
version `2.29.0`, permettent à Next.js de résoudre les imports optionnels du
SDK Coinbase `1.61.0`, atteint par la chaîne `@wagmi/connectors` →
`@base-org/account` → `@coinbase/cdp-sdk`. Le SDK charge ces modules avec des
imports dynamiques ; le compilateur du frontend doit néanmoins pouvoir les
résoudre. Ces trois versions respectent les peers `^2.29.0` de son manifeste.
Le code de signature x402 du SDK mentionne explicitement ces trois paquets
dans son message d'installation. Ils servent ici à assurer la compilation
de l'intégration des wallets ; le réseau du scrutin reste celui configuré
par les variables `NEXT_PUBLIC_*`.
[Documentation officielle du SDK](https://github.com/coinbase/cdp-sdk/blob/main/typescript/packages/cdp-sdk/README.md#x402-payment-protocol),
[module officiel de signature](https://github.com/coinbase/cdp-sdk/blob/main/typescript/packages/cdp-sdk/src/actions/x402/signX402Payment.ts),
[manifeste publié de Coinbase 1.61.0](https://registry.npmjs.org/@coinbase%2Fcdp-sdk/1.61.0).

## Overrides retenus

Les substitutions ciblent des dépendances transitives ; elles ne modifient ni
le smart contract, ni les signatures des fonctions de vote. La syntaxe
`$viem` référence la dépendance directe déclarée par le frontend.
[Documentation npm : overrides](https://docs.npmjs.com/cli/v11/configuring-npm/package-json/#overrides).

```json
{
  "overrides": {
    "viem": "$viem",
    "ws@>=8 <9": "8.22.1",
    "@walletconnect/utils": "2.21.10",
    "@vanilla-extract/css": "1.21.3"
  }
}
```

| Substitution | Motif et vérification de compatibilité |
| --- | --- |
| `viem` vers la dépendance directe | Évite les copies anciennes `2.23.2` imposées par WalletConnect et conserve la branche majeure 2 déjà utilisée par l'application. Le manifeste de viem `2.57.16`, consulté pendant la revue, dépend de `abitype 1.2.3` et `ws 8.21.0`, au lieu des anciennes copies concernées par les chaînes d'avis. [Manifeste viem 2.57.16](https://registry.npmjs.org/viem/2.57.16). |
| `ws` version 8 vers `8.22.1` | Mise à jour dans la même branche majeure, limitée aux copies 8.x ; les copies 7.x ne sont pas remplacées par une version majeure différente. Le correctif de divulgation mémoire est disponible depuis `8.20.1` et celui d'épuisement mémoire depuis `8.21.0`. [GHSA-58qx-3vcg-4xpx](https://github.com/advisories/GHSA-58qx-3vcg-4xpx), [GHSA-96hv-2xvq-fx4p](https://github.com/advisories/GHSA-96hv-2xvq-fx4p). |
| `@walletconnect/utils 2.21.10` | Cette version retire les dépendances `query-string` et viem présentes dans `2.21.1`. La comparaison des déclarations exportées des deux archives officielles a trouvé 206 puis 217 symboles déclarés, sans symbole retiré. Ce contrôle réduit le risque d'incompatibilité ; il ne remplace pas un essai de connexion WalletConnect réelle. [Manifeste 2.21.1](https://registry.npmjs.org/@walletconnect%2Futils/2.21.1), [manifeste 2.21.10](https://registry.npmjs.org/@walletconnect%2Futils/2.21.10). |
| `@vanilla-extract/css 1.21.3` | Mise à jour de la branche majeure 1 utilisée par RainbowKit. La publication officielle remplace `deepmerge` par `deepmerge-ts`. L'avis sur `deepmerge <=4.3.1` ne propose aucune version corrigée de ce paquet ; la correction passe par son parent. [Publication officielle 1.21.3](https://github.com/vanilla-extract-css/vanilla-extract/releases/tag/@vanilla-extract%2Fcss@1.21.3), [GHSA-gcqx-w48m-w2h4](https://github.com/advisories/GHSA-gcqx-w48m-w2h4). |

Le retrait de `query-string` évite de remplacer directement
`decode-uri-component 0.2.2` par `0.5.1` : le premier s'insère dans la chaîne
CommonJS actuelle, tandis que le second est publié comme module ESM. Les deux
avis sur le décodage URI indiquent respectivement les correctifs `0.5.0` et
`0.5.1`. La substitution de WalletConnect utilise le code maintenu en amont.
[GHSA-vcc3-ghjq-m6fr](https://github.com/advisories/GHSA-vcc3-ghjq-m6fr),
[GHSA-qr28-fpjm-wq7f](https://github.com/advisories/GHSA-qr28-fpjm-wq7f),
[manifeste decode-uri-component 0.5.1](https://registry.npmjs.org/decode-uri-component/0.5.1).

Le manifeste de WalletConnect utils `2.21.10` indique une licence à consulter
dans son fichier `LICENSE.md`, alors que `2.21.1` déclarait Apache-2.0. Cette
information doit être revue pour les conditions d'une future redistribution.
Les manifestes officiels cités ci-dessus permettent de vérifier ce changement.

## Alertes qui demandent une correction en amont

Après application des quatre overrides, l'audit de production du 7 novembre
2026, obtenu avec `npm.cmd audit --omit=dev --json`, signale **20 alertes :
12 élevées et 8 modérées**, sans alerte critique. Les deux avis à l'origine
des chaînes restantes concernent Zod et UUID ; npm compte également les
paquets parents qui en dépendent. Le rapport complet est conservé dans
[`voting-dapp/audit-report.json`](../voting-dapp/audit-report.json).
L'audit incluant les dépendances de développement signale **28 alertes :
12 élevées et 16 modérées**. Ces résultats décrivent cet état du fichier de
verrouillage et de la base d'avis, et ne constituent pas une garantie d'absence
d'autres vulnérabilités.

L'avis Zod couvre les versions `<4.6.6` et ne mentionne aucun correctif dans
la branche 3. Pendant cette revue, le dernier manifeste publié de
`@reown/appkit-wallet`, version `1.8.24`, impose encore `zod 3.22.4` ; celui
de `@coinbase/cdp-sdk`, version `1.61.0`, déclare `zod ^3.25.76`. Forcer Zod 4
dans ces SDK changerait leur version majeure attendue. Aucun override Zod
n'est appliqué. [GHSA-mrhx-c7xc-m3w5](https://github.com/advisories/GHSA-mrhx-c7xc-m3w5),
[manifeste Reown 1.8.24](https://registry.npmjs.org/@reown%2Fappkit-wallet/1.8.24),
[manifeste Coinbase 1.61.0](https://registry.npmjs.org/@coinbase%2Fcdp-sdk/1.61.0).

L'avis UUID concerne les appels `v3`, `v5` et `v6` avec un tampon de sortie et
indique notamment le correctif `11.1.1`. Les SDK MetaMask installés utilisent
encore UUID 8/9. Leur remplacement constitue un changement majeur ; aucun
override UUID n'est appliqué dans cette passe.
[GHSA-w5hq-g745-h8pq](https://github.com/advisories/GHSA-w5hq-g745-h8pq).

La présence d'un avis dans l'arbre npm ne prouve pas à elle seule qu'un chemin
exploitable existe dans cette DApp. Elle ne permet pas non plus de déclarer le
risque absent. Les alertes restantes doivent être suivies lors des mises à jour
des SDK de connexion.

## Reproduire la vérification

Depuis `voting-dapp`, utiliser `npm.cmd` sous PowerShell si l'exécution de
`npm.ps1` est bloquée :

```powershell
npm.cmd run lint
npm.cmd run typecheck
npm.cmd run build
npm.cmd audit --omit=dev
```

Les tests `npm.cmd run test:integration`, avec le nœud local disponible,
exercent les lectures du frontend et les transactions sur de vrais contrats
Voting isolés. Ils vérifient aussi que la consultation publique n'appelle aucune
méthode de signature ni d'envoi de transaction.

Ces vérifications automatisées ne constituent pas un appairage réel avec un
wallet mobile par WalletConnect ou une signature dans une extension de wallet.
Cette étape doit être effectuée avec le wallet choisi avant une utilisation
sur un réseau public.
