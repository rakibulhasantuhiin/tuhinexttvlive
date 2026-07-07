import * as fs from 'fs';

const code = fs.readFileSync('src/App.tsx', 'utf-8');
const lines = code.split('\n');

let balance = 0;
for (let i = 2125; i < 2631; i++) {
  const line = lines[i];
  const opens = (line.match(/<div/g) || []).length;
  // Account for self-closing or <div/> (though usually they are just <div> or <div ...>)
  const closes = (line.match(/<\/div>/g) || []).length;
  balance += opens - closes;
  if(balance < 0) console.log("went negative at", i+1);
}
console.log("Balance at 2630:", balance, ' (should be 0 if all are closed)');
