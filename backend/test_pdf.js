const fs = require('fs');
async function run() {
  const pdf = (await import('pdf-parse')).default;
  let dataBuffer = fs.readFileSync('/Users/viniciussaldanharosario/Downloads/nacionalhidro-main/modelo de proposta.pdf');
  const data = await pdf(dataBuffer);
  console.log(data.text);
}
run();
