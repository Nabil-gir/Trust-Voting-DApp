import assert from "node:assert/strict";

const base = process.env.VOTING_HTTP_URL || "http://127.0.0.1:3000";
const response = await fetch(base);
assert.equal(response.status, 200, "La page principale doit répondre HTTP 200.");
assert.equal(new URL(response.url).origin, new URL(base).origin,
  "La page publique ne doit pas rediriger vers une connexion Vercel.");
const html = await response.text();
for (const text of ['lang="fr"', "Trust", "Chaque voix compte", "Propositions", "wallet"]) {
  assert.ok(html.includes(text), `Contenu attendu dans le document initial : ${text}`);
}
assert.match(html, /<title>Trust[^<]*Chaque voix compte<\/title>/,
  "Le document retourné doit être celui de Trust.");
const styles = [...html.matchAll(/href="([^"]+\.css(?:\?[^"]*)?)"/g)].map((match) => match[1]);
assert.ok(styles.length > 0, "Au moins une feuille de style doit être chargée.");
let cssBytes = 0;
for (const href of styles) {
  const css = await fetch(new URL(href, base));
  assert.equal(css.status, 200, `Feuille de style disponible : ${href}`);
  const content = await css.text();
  assert.ok(content.length > 100, "La feuille de style ne doit pas être vide.");
  cssBytes += content.length;
}
const icon = await fetch(new URL("/icon.svg", base));
assert.equal(icon.status, 200);
const missing = await fetch(new URL("/page-inexistante", base));
assert.equal(missing.status, 404);
console.log(JSON.stringify({ home: response.status, frenchDocument: true, cssFiles: styles.length, cssBytes, icon: icon.status, notFound: missing.status }, null, 2));
console.log("Contrôle HTTP réussi. Ce contrôle ne remplace pas un test interactif dans un navigateur.");
