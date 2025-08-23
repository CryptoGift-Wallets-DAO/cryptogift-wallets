// Test JSX syntax by parsing the component
const fs = require('fs');

try {
  const content = fs.readFileSync('/mnt/c/Users/rafae/cryptogift-wallets/frontend/src/components/learn/SalesMasterclass.tsx', 'utf8');
  
  // Simple JSX bracket matching test
  let openBrackets = 0;
  let bracketStack = [];
  
  for (let i = 0; i < content.length; i++) {
    const char = content[i];
    const line = content.substring(0, i).split('\n').length;
    
    if (char === '{' && content[i-1] !== '\\') {
      openBrackets++;
      bracketStack.push({char: '{', line, pos: i});
    } else if (char === '}' && content[i-1] !== '\\') {
      openBrackets--;
      if (openBrackets < 0) {
        console.log(`ERROR: Closing bracket without opening at line ${line}, position ${i}`);
        break;
      }
      bracketStack.pop();
    }
  }
  
  if (openBrackets !== 0) {
    console.log(`ERROR: Unmatched brackets. Open brackets: ${openBrackets}`);
    console.log('Last few opened brackets:', bracketStack.slice(-5));
  } else {
    console.log('✅ Bracket matching looks correct');
  }
  
  // Check for common JSX issues
  const lines = content.split('\n');
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lineNum = i + 1;
    
    // Look for standalone { without proper JSX
    if (line.trim() === '{' && !lines[i-1]?.includes('className') && !lines[i-1]?.includes('style')) {
      console.log(`WARNING: Standalone { found at line ${lineNum}: "${line}"`);
    }
    
    // Look for malformed JSX attributes
    if (line.includes('className={') && !line.includes('}') && !lines[i+1]?.includes('}')) {
      console.log(`WARNING: Possibly unclosed className at line ${lineNum}: "${line.trim()}"`);
    }
  }
  
  console.log('File size:', content.length, 'characters');
  console.log('Line count:', lines.length);
  
} catch (error) {
  console.error('Error reading file:', error.message);
}