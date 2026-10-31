import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const html=readFileSync(new URL('../editor.html',import.meta.url),'utf8');
const script=readFileSync(new URL('../src/editor.ts',import.meta.url),'utf8');
test('administrador tiene mapa privado independiente de edicion',()=>{
  assert.match(html,/id="preview-map"/);
  assert.match(html,/id="editor-map"/);
  assert.match(script,/L\.map\('preview-map'\)/);
  assert.match(script,/L\.map\('editor-map'\)/);
});
test('muestra pendientes y borrador sin publicar',()=>{
  assert.match(script,/pending\.map\(\(\{ point \}\)/);
  assert.match(script,/draft\.map\(point/);
  assert.match(script,/previewLayer\.clearLayers\(\)/);
  assert.match(html,/Esta vista previa no publica ni guarda cambios en D1/);
});
test('previsualizacion nunca revela nombres de los solicitantes',()=>{
  const match=script.match(/function drawPreview\(\): void \{([\s\S]*?)\n\}\ngetElement\('preview-all'\)/);
  assert.ok(match);
  assert.doesNotMatch(match[1],/contact|solicitante/);
});
