// Elimina comentarios // y /* */ y comas colgantes de un texto JSONC.
export function parseJsonc(text) {
  // quita /* */ (no dentro de strings — aproximación suficiente para estos packs)
  let s = text.replace(/\/\*[\s\S]*?\*\//g, '');
  // quita // hasta fin de línea, respetando que no esté dentro de una string
  s = s.split('\n').map(line => {
    let inStr = false, esc = false, out = '';
    for (let i = 0; i < line.length; i++) {
      const c = line[i];
      if (esc) { out += c; esc = false; continue; }
      if (c === '\\' && inStr) { out += c; esc = true; continue; }
      if (c === '"') { inStr = !inStr; out += c; continue; }
      if (!inStr && c === '/' && line[i+1] === '/') break; // resto es comentario
      out += c;
    }
    return out;
  }).join('\n');
  // comas colgantes antes de } o ]
  s = s.replace(/,(\s*[}\]])/g, '$1');
  return JSON.parse(s);
}
