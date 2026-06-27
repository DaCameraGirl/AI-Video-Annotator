import fs from 'node:fs';

const path = process.argv[2] || 'README.md';
let md = fs.readFileSync(path, 'utf8');

const cap = (title) =>
  `https://capsule-render.vercel.app/api?type=rect&color=0b1010&height=50&section=header&text=${encodeURIComponent(title)}&fontSize=22&fontColor=f7f2e8`;

const divider = '<p align="center"><img src="docs/readme-divider.svg" width="720" alt="" /></p>';
const section = (title) => `${divider}\n<p align="center"><img src="${cap(title)}" width="720" alt="${title}" /></p>\n`;

md = md.replace(/^## (.+)$/gm, (_match, title) => section(title));
md = md.replace(/```mermaid\n/g, '```mermaid\n%%{init: {\'theme\': \'dark\'}}%%\n');

fs.writeFileSync(path, md);
console.log(`Updated ${path}`);