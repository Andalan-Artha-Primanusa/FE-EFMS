const fs = require('fs');
const content = fs.readFileSync('src/pages/FinancePage.tsx', 'utf-8');
const matches = content.match(/viewTitle === ['"][^'"]+['"]/g);
console.log([...new Set(matches)]);
