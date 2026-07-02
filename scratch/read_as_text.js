const fs = require('fs');
const content = fs.readFileSync('service-account.json', 'utf8');
console.log("Length:", content.length);
try {
  JSON.parse(content);
  console.log("Parsed successfully!");
} catch (e) {
  console.log("Error:", e.message);
  const match = e.message.match(/position (\d+)/);
  if (match) {
    const pos = parseInt(match[1]);
    console.log("Around position:", content.substring(Math.max(0, pos - 40), Math.min(content.length, pos + 40)));
  }
}
