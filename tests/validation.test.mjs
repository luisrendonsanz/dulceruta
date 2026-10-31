import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
const run = () => spawnSync(process.execPath, [new URL('../scripts/validate-public-json.mjs', import.meta.url).pathname], { encoding: 'utf8' });
test('El JSON público actual cumple las reglas y no contiene nombres personales', () => {
  const result = run();
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /válido/);
});
test('GitHub Pages dispone de entrada pública, registro y editor', async () => {
  const { existsSync } = await import('node:fs');
  for (const path of ['index.html','registro.html','editor.html','public/sw.js','public/manifest.webmanifest','.github/workflows/deploy.yml']) {
    assert.equal(existsSync(new URL('../' + path, import.meta.url)), true, path);
  }
});
