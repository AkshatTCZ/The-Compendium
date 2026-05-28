const fs = require('fs');
const text = fs.readFileSync('frontend/dashboard.html', 'utf8');
const lines = text.split('\n');
const start = lines.findIndex(l => l.includes('<!DOCTYPE html>'));
// wait, the first one is at line 0! We want the SECOND one.
let secondIndex = -1;
for (let i = 1; i < lines.length; i++) {
  if (lines[i].includes('<!DOCTYPE html>')) {
    secondIndex = i;
    break;
  }
}

let modalIndex = -1;
for (let i = secondIndex; i < lines.length; i++) {
  if (lines[i].includes('<!-- Modal -->')) {
    modalIndex = i;
    break;
  }
}

if (secondIndex !== -1 && modalIndex !== -1) {
  const newLines = [...lines.slice(0, secondIndex), ...lines.slice(modalIndex)];
  fs.writeFileSync('frontend/dashboard.html', newLines.join('\n'));
}
