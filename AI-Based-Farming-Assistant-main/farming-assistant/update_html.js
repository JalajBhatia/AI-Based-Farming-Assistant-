const fs = require('fs');
const path = require('path');

const dir = 'c:\\Users\\ishan\\Desktop\\VS code\\DTI project\\farming-assistant\\frontend';

function processFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf-8');
  
  // 1. Ensure links to force-antigravity.css exists in <head> AT THE VERY END
  if (!content.includes('force-antigravity.css')) {
    content = content.replace(/<\/head>/i, '  <link rel="stylesheet" href="css/force-antigravity.css" />\n</head>');
  }

  // 2. Replace old btn styles explicitly per user request
  content = content.replace(/\bbtn--primary\b/g, 'btn-primary');
  content = content.replace(/\bbtn--secondary\b/g, 'btn-secondary');
  content = content.replace(/\bbtn-green\b/g, 'btn-primary');
  
  // 3. Make all cards explicitly glass-cards
  content = content.replace(/\bclass="card\b/g, 'class="glass-card');
  content = content.replace(/\bclass="card /g, 'class="glass-card ');
  
  // Cleanup duplicates just in case "glass-card glass-card" happens
  content = content.replace(/\bglass-card glass-card\b/g, 'glass-card');
  content = content.replace(/\bglass-card\s+glass-card\b/g, 'glass-card');

  fs.writeFileSync(filePath, content, 'utf-8');
}

const files = fs.readdirSync(dir).filter(f => f.endsWith('.html'));

files.forEach(f => {
  const fPath = path.join(dir, f);
  console.log('Updating', fPath);
  processFile(fPath);
});

console.log('All HTML files aggressively updated with force-antigravity CSS.');
