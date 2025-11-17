// Test to identify syntax issue in background service worker
const fs = require('fs');

try {
  const content = fs.readFileSync('background/service-worker.js', 'utf8');
  
  // Try to parse with Node.js to find exact error
  new Function(content);
  
  console.log('✅ Background service worker syntax is valid');
} catch (error) {
  console.log('❌ Syntax error found:', error.message);
  
  // Try to find approximate location
  const lines = content.split('\n');
  const errorMatch = error.message.match(/at position (\d+)/);
  if (errorMatch) {
    const position = parseInt(errorMatch[1]);
    let currentPos = 0;
    
    for (let i = 0; i < lines.length; i++) {
      const lineLength = lines[i].length + 1; // +1 for newline
      if (currentPos + lineLength > position) {
        console.log(`Error around line ${i + 1}:`, lines[i].trim());
        break;
      }
      currentPos += lineLength;
    }
  }
}