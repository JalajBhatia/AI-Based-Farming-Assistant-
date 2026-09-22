const fs = require('fs');
const path = require('path');

const transPath = path.join(__dirname, 'frontend', 'js', 'translations.js');
let content = fs.readFileSync(transPath, 'utf8');

// 1. Remove "Mobile only — no password" across ALL languages globally.
// Replace `login_sub` with "Login to continue to FarmSaathi" globally (or specific localized if we had them, but English is fine to enforce the subtitle).
content = content.replace(/login_sub:\s*".*?"/g, 'login_sub: "Login to continue to FarmSaathi"');
// Also remove Hindi/other variants of "Mobile only" that might exist, though the regex above catches the key `login_sub:` globally.

// 2. Fix `login` to "Welcome back 👋" globally so it matches the requested vibe.
// Since `login` key doesn't explicitly exist in the old translations (only `login_title` did), let's add it.
// We will inject missing UI keys into the English block so fallback covers everything perfectly.

// First, inject the missing raw keys into the `en` block:
const enMissing = `
    login: "Welcome back 👋",
    login_sub: "Login to continue to FarmSaathi",
    remember_me: "Remember me",
    no_account: "Don't have an account?",
    register: "Register",
    forgot_password: "Forgot password?",
    username_email_ph: "Username or Email",
    password_ph: "Password",
    username: "Username",
    password: "Password",
    or: "Or",
    login_btn: "Login",
    register_btn: "Register",
`;

// Insert into English block at the start of en: {
content = content.replace(/en:\s*\{/, 'en: {' + enMissing);

// Also remove any stray "Mobile only — no password" phrases that might not be under login_sub just in case
content = content.replace(/Mobile only — no password/g, 'Login to continue to FarmSaathi');
content = content.replace(/केवल मोबाइल नंबर — पासवर्ड नहीं/g, 'FarmSaathi में आपका स्वागत है');
content = content.replace(/ਸਿਰਫ ਮੋਬਾਇਲ/g, 'FarmSaathi');
content = content.replace(/फक्त मोबाईल — पासवर्ड नाही/g, 'FarmSaathi');
content = content.replace(/మొబైల్ మాత్రమే/g, 'FarmSaathi');
content = content.replace(/மொபைல் மட்டும்/g, 'FarmSaathi');

fs.writeFileSync(transPath, content, 'utf8');
console.log('Translations cleaned successfully.');
