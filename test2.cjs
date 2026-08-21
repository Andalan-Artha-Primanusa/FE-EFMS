const fs = require('fs');
const code = fs.readFileSync('src/pages/FinanceBATrackerPage.tsx', 'utf-8');
const match = code.match(/return \(\s*<div className="workspace-body space-y-6">[\s\S]{1,500}/);
console.log(match ? match[0] : 'Not found');
