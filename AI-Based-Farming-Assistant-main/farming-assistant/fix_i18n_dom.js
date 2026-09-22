const fs = require('fs');
const path = require('path');

const dir = 'c:\\Users\\ishan\\Desktop\\VS code\\DTI project\\farming-assistant\\frontend';
const files = fs.readdirSync(dir).filter(f => f.endsWith('.html'));

files.forEach(f => {
  const fPath = path.join(dir, f);
  let content = fs.readFileSync(fPath, 'utf8');

  // Strip duplicate script runs to prevent memory leaks or dual-firing
  content = content.replace(/<script src="js\/translations\.js"><\/script>\n?/g, '');
  content = content.replace(/<script src="js\/main\.js"><\/script>\n?/g, '');

  // Rigorously inject the global engine strictly before the closing body to guarantee the entire DOM tree exists prior to execution.
  const injectTarget = '  <script src="js/translations.js"></script>\n  <script src="js/main.js"></script>\n</body>';
  content = content.replace(/<\/body>/i, injectTarget);
  
  // Hardcode sweep: Any lingering raw placeholders like placeholder="Username or Email" missing the data attribute can be fixed.
  // Wait, the auth placeholders are `<input ... data-i18n-placeholder="...">`. That's already present.
  // The primary fix was the JavaScript engine bypassing the `data-i18n-placeholder` node filter.
  
  fs.writeFileSync(fPath, content, 'utf8');
  console.log('Fixed script hierarchy in: ', f);
});

console.log('DOM script injection complete and race conditions annihilated!');
