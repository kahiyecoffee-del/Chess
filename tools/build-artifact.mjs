// dist/index.html'i paylaşılabilir önizleme sayfasına çevirir (doctype/html/head/body iskeleti olmadan).
import { readFileSync, writeFileSync } from 'node:fs';

const html = readFileSync('dist/index.html', 'utf8');
const pick = (re) => [...html.matchAll(re)].map((m) => m[0]).join('\n');
const title = pick(/<title>[\s\S]*?<\/title>/g);
const fonts = pick(/<link[^>]+fonts\.(googleapis|gstatic)[^>]*>/g);
const styles = pick(/<style[\s\S]*?<\/style>/g);
const scripts = pick(/<script[\s\S]*?<\/script>/g);
const body = html.match(/<body>([\s\S]*?)<\/body>/)[1].replace(/<script[\s\S]*?<\/script>/g, '');
const out = [title, fonts, styles, body.trim(), scripts].join('\n');
writeFileSync('dist/preview.html', out);
console.log(`dist/preview.html ${(out.length / 1024).toFixed(0)} KB`);
