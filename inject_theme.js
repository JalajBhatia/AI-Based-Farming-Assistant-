const fs = require('fs');
const path = require('path');

const dir = 'c:\\Users\\ishan\\Desktop\\VS code\\DTI project\\farming-assistant\\frontend';
const files = fs.readdirSync(dir).filter(f => f.endsWith('.html'));

const toggleHTML = `\n  <button class="theme-toggle-fab" aria-label="Toggle Theme">🌙</button>\n`;

files.forEach(f => {
  const fPath = path.join(dir, f);
  let content = fs.readFileSync(fPath, 'utf-8');
  
  // Clean up any existing floating toggle if ran multiple times
  content = content.replace(/<button class="theme-toggle-fab".*?<\/button>/gi, '');
  
  // Inject exactly inside the opening body tag
  content = content.replace(/(<body[^>]*>)/i, `$1${toggleHTML}`);

  fs.writeFileSync(fPath, content, 'utf-8');
  console.log('Injected Theme Toggle into: ', f);
});

console.log('HTML floating theme toggles globally injected.');
