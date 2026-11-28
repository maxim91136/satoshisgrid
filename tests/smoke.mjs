#!/usr/bin/env node
// Rauchtest ohne Netz und ohne Abhängigkeiten (nur Node).
// Prüft: (1) CSP-Hashes in _headers passen zu den Inline-Skripten in index.html,
//        (2) alle lokal verlinkten Dateien existieren (HTML, CSS, Importmap, JS-Modulgraph, Modell, Audio),
//        (3) keine fremden Skripte oder Stylesheets werden eingebunden.
// Start: node tests/smoke.mjs
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { dirname, join, resolve, relative, basename } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const errors = [];
let checks = 0;
const ok = (cond, msg) => { checks++; if (!cond) errors.push(msg); };
const read = (p) => readFileSync(join(ROOT, p), 'utf8');
const isExternal = (u) => /^(https?:)?\/\//i.test(u);
const isIgnorable = (u) => !u || /^(#|data:|blob:|mailto:|javascript:)/i.test(u);

const html = read('index.html');
const headers = read('_headers');

// ---------- (1) CSP-Hashes ----------
const cspLine = headers.split('\n').find((l) => /^\s*Content-Security-Policy:/i.test(l));
ok(!!cspLine, '_headers: keine Content-Security-Policy gefunden');
const csp = Object.fromEntries(
  (cspLine || '').replace(/^\s*Content-Security-Policy:\s*/i, '').split(';')
    .map((d) => d.trim().split(/\s+/)).filter((p) => p[0]).map(([k, ...v]) => [k.toLowerCase(), v])
);
const scriptSrc = csp['script-src'] || csp['default-src'] || [];
const cspHashes = new Set(scriptSrc.filter((s) => /^'sha(256|384|512)-/.test(s)).map((s) => s.slice(1, -1)));

const scriptRe = /<script\b([^>]*)>([\s\S]*?)<\/script>/gi;
const attr = (attrs, name) => {
  const m = attrs.match(new RegExp(`\\b${name}\\s*=\\s*("([^"]*)"|'([^']*)'|([^\\s>]+))`, 'i'));
  return m ? (m[2] ?? m[3] ?? m[4]) : null;
};
const usedHashes = new Set();
let importmap = null;
for (const m of html.matchAll(scriptRe)) {
  const [, attrs, body] = m;
  const src = attr(attrs, 'src');
  const type = (attr(attrs, 'type') || '').toLowerCase();
  if (src) continue;
  if (type === 'importmap') importmap = JSON.parse(body);
  // Datenblöcke (z. B. JSON-LD) werden nicht ausgeführt und brauchen keinen Hash.
  if (type && !['module', 'importmap', 'text/javascript', 'application/javascript'].includes(type)) continue;
  const hash = 'sha256-' + createHash('sha256').update(body, 'utf8').digest('base64');
  usedHashes.add(hash);
  ok(cspHashes.has(hash), `CSP: Inline-Skript (${type || 'classic'}, beginnt mit "${body.trim().slice(0, 40)}…") fehlt in script-src: '${hash}'`);
}
for (const h of cspHashes) ok(usedHashes.has(h), `CSP: Hash '${h}' in _headers passt zu keinem Inline-Skript (veraltet?)`);
ok(!scriptSrc.includes("'unsafe-inline'"), "CSP: script-src erlaubt 'unsafe-inline'");
ok(!scriptSrc.includes("'unsafe-eval'"), "CSP: script-src erlaubt 'unsafe-eval'");

// ---------- (3) keine fremden Skripte/Stylesheets ----------
for (const dir of ['script-src', 'style-src']) {
  for (const s of csp[dir] || []) {
    ok(!(isExternal(s) || /^[a-z0-9-]+\.[a-z]/i.test(s) || s === '*' || s === 'https:' || s === 'http:'),
      `CSP: ${dir} erlaubt fremde Quelle ${s}`);
  }
}
for (const m of html.matchAll(scriptRe)) {
  const src = attr(m[1], 'src');
  if (src) ok(!isExternal(src), `index.html: fremdes Skript ${src}`);
}
const linkRe = /<link\b([^>]*)>/gi;
for (const m of html.matchAll(linkRe)) {
  const rel = (attr(m[1], 'rel') || '').toLowerCase();
  const href = attr(m[1], 'href');
  if (/stylesheet|modulepreload|preload|prefetch|import/.test(rel)) {
    ok(!isExternal(href), `index.html: fremde Ressource (${rel}) ${href}`);
  }
}
if (importmap) {
  for (const [k, v] of Object.entries({ ...importmap.imports })) ok(!isExternal(v), `Importmap: ${k} zeigt nach außen (${v})`);
}

// ---------- (2) lokale Dateien ----------
const exists = (p) => existsSync(p);
const localFromRoot = (u, baseDir) => {
  const clean = u.split(/[?#]/)[0];
  return clean.startsWith('/') ? join(ROOT, clean) : resolve(baseDir, clean);
};

// HTML: src/href
for (const m of html.matchAll(/\b(?:src|href)\s*=\s*"([^"]*)"/gi)) {
  const u = m[1];
  if (isIgnorable(u) || isExternal(u)) continue;
  ok(exists(localFromRoot(u, ROOT)), `index.html: Datei fehlt: ${u}`);
}

// CSS: url(...) und @import
const cssFiles = [...html.matchAll(/<link\b[^>]*rel="stylesheet"[^>]*href="([^"]+)"/gi)].map((m) => m[1]).filter((u) => !isExternal(u));
for (const css of cssFiles) {
  const p = localFromRoot(css, ROOT);
  if (!exists(p)) continue;
  const text = readFileSync(p, 'utf8');
  for (const m of text.matchAll(/@import\s+(?:url\()?\s*["']?([^"')\s;]+)/gi)) {
    ok(!isExternal(m[1]), `${css}: fremdes @import ${m[1]}`);
  }
  for (const m of text.matchAll(/url\(\s*["']?([^"')]+)["']?\s*\)/gi)) {
    const u = m[1].trim();
    if (isIgnorable(u)) continue;
    ok(!isExternal(u), `${css}: fremde Datei ${u}`);
    if (!isExternal(u)) ok(exists(localFromRoot(u, dirname(p))), `${css}: Datei fehlt: ${u}`);
  }
}

// Importmap-Ziele
const imports = importmap?.imports || {};
for (const [k, v] of Object.entries(imports)) ok(exists(localFromRoot(v, ROOT)), `Importmap: Ziel fehlt für ${k}: ${v}`);
const resolveSpecifier = (spec, fromFile) => {
  if (spec.startsWith('./') || spec.startsWith('../') || spec.startsWith('/')) return localFromRoot(spec, dirname(fromFile));
  if (isExternal(spec)) return null;
  if (imports[spec]) return localFromRoot(imports[spec], ROOT);
  const prefix = Object.keys(imports).filter((k) => k.endsWith('/') && spec.startsWith(k)).sort((a, b) => b.length - a.length)[0];
  if (prefix) return localFromRoot(imports[prefix] + spec.slice(prefix.length), ROOT);
  return undefined; // nicht auflösbar
};

// JS-Modulgraph ab den Modul-Einstiegen
const entries = [...html.matchAll(scriptRe)].map((m) => attr(m[1], 'src')).filter((s) => s && !isExternal(s)).map((s) => localFromRoot(s, ROOT));
const seen = new Set();
const queue = [...entries];
const importRe = /(?:\bimport\s*(?:[\w*{}\s,$]+\s*from\s*)?|\bexport\s*(?:\*|\{[^}]*\})\s*from\s*|\bimport\s*\(\s*)["']([^"']+)["']/g;
while (queue.length) {
  const file = queue.shift();
  if (seen.has(file)) continue;
  seen.add(file);
  const rel = relative(ROOT, file);
  if (!exists(file)) { ok(false, `Modul fehlt: ${rel}`); continue; }
  const code = readFileSync(file, 'utf8');
  for (const m of code.matchAll(importRe)) {
    const spec = m[1];
    const target = resolveSpecifier(spec, file);
    if (target === null) { ok(false, `${rel}: fremdes Modul ${spec}`); continue; }
    if (target === undefined) { ok(false, `${rel}: Modul nicht auflösbar: ${spec}`); continue; }
    ok(exists(target), `${rel}: importiertes Modul fehlt: ${spec}`);
    queue.push(target);
  }
  // Eigene Skripte: Pfade auf Modelle, Audio, Fonts, Bilder
  if (!rel.startsWith('vendor')) {
    for (const m of code.matchAll(/["'`](\/?(?:models|audio|fonts|css|img|images)\/[^"'`]+)["'`]/g)) {
      const u = m[1];
      if (u.includes('${')) {
        // Vorlage wie `/audio/${mode}.mp3`: es muss mindestens eine passende Datei geben.
        const dirPart = u.slice(0, u.lastIndexOf('/', u.indexOf('${')) + 1);
        const pattern = new RegExp('^' + u.slice(dirPart.length).split(/\$\{[^}]*\}/).map((s) => s.replace(/[.*+?^()|[\]\\]/g, '\\$&')).join('.+') + '$');
        const dir = localFromRoot(dirPart, ROOT);
        const hits = exists(dir) ? readdirSync(dir).filter((f) => pattern.test(f)) : [];
        ok(hits.length > 0, `${rel}: keine Datei passt zu ${u}`);
      } else {
        ok(exists(localFromRoot(u, ROOT)), `${rel}: Datei fehlt: ${u}`);
      }
    }
  }
}
ok(seen.size > 1, 'JS-Modulgraph: keine Module gefunden');

// Audio-Modi aus audio.js einzeln prüfen (chilled/wild …), falls benannt
const audioSrc = existsSync(join(ROOT, 'js/audio.js')) ? read('js/audio.js') : '';
const modes = new Set([...audioSrc.matchAll(/rideMode\s*={1,3}\s*['"](\w+)['"]/g)].map((m) => m[1]));
for (const mode of modes) ok(exists(join(ROOT, 'audio', `${mode}.mp3`)), `Audio fehlt: audio/${mode}.mp3`);

// ---------- Ergebnis ----------
if (errors.length) {
  console.error(`Rauchtest: ${errors.length} Fehler bei ${checks} Prüfungen`);
  for (const e of errors) console.error('  ✗ ' + e);
  process.exit(1);
}
console.log(`Rauchtest: ok (${checks} Prüfungen, ${seen.size} Module, ${usedHashes.size} Inline-Skripte mit Hash)`);
