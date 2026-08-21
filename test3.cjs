const fs = require('fs');
const txt = fs.readFileSync('src/pages/FinancePage.tsx', 'utf-8');
const i = txt.indexOf('<PageHeader');
console.log(txt.substring(Math.max(0, i-500), i+500));
