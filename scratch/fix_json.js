const fs = require('fs');
let content = fs.readFileSync('service-account.json', 'utf8');

// Replace the bad escape \QDrc with \nQDrc
if (content.includes('\\QDrc')) {
  content = content.replace('\\QDrc', '\\nQDrc');
  fs.writeFileSync('service-account.json', content, 'utf8');
  console.log("Replaced \\QDrc with \\nQDrc successfully!");
} else {
  console.log("Could not find \\QDrc in the file.");
}

// Verify if it parses now
try {
  JSON.parse(content);
  console.log("JSON parsed successfully after fix!");
} catch (e) {
  console.log("Error still persists:", e.message);
}
