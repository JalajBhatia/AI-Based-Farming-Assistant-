const fs = require('fs');
const path = require('path');

const dir = 'c:\\Users\\ishan\\Desktop\\VS code\\DTI project\\farming-assistant\\frontend';
const files = fs.readdirSync(dir).filter(f => f.endsWith('.html'));

const selectHTML = `
  <select class="global-lang-select input-field" style="position: fixed; top: 20px; left: 20px; z-index: 10000; max-width: 150px; cursor: pointer; padding: 10px 15px; border-radius: 50px;" aria-label="Select Language">
    <option value="en">English</option>
  </select>
`;

files.forEach(f => {
  const fPath = path.join(dir, f);
  let content = fs.readFileSync(fPath, 'utf-8');
  
  // Clean up any existing floating select if ran before
  content = content.replace(/<select class="global-lang-select.*?<\/select>\n?/s, '');

  content = content.replace(/(<body[^>]*>)/i, `$1${selectHTML}`);
  
  fs.writeFileSync(fPath, content, 'utf-8');
  console.log('Injected Language Dropdown into: ', f);
});

// Re-inject the data-i18n span tags we hardcoded earlier in login.html and register.html
['login.html', 'register.html'].forEach(authFile => {
  const authPath = path.join(dir, authFile);
  if (fs.existsSync(authPath)) {
    let authContent = fs.readFileSync(authPath, 'utf-8');
    // If it currently just says <span>Login</span> we change it back
    authContent = authContent.replace(/<span>Login<\/span>/g, '<span data-i18n="login_btn">Login</span>');
    authContent = authContent.replace(/<span>Register<\/span>/g, '<span data-i18n="register_btn">Register</span>');
    fs.writeFileSync(authPath, authContent, 'utf-8');
    console.log(`Reverted localization spans back into ${authFile}`);
  }
});

console.log('Global language structural modifications complete.');
