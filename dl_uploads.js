const https = require('https');
const fs = require('fs');
const { execSync } = require('child_process');

const url = 'https://web-production-83b4ae.up.railway.app/api/export/uploads?key=gM3f9xK7vQ2pL8nR4wE6';
const dest = '/app/data/_import.tar.gz';

console.log('[dl] Baixando uploads do Railway...');
const file = fs.createWriteStream(dest);
https.get(url, res => {
  let received = 0;
  res.on('data', chunk => {
    received += chunk.length;
    process.stdout.write('\r[dl] ' + Math.round(received / 1048576) + ' MB');
  });
  res.pipe(file);
  file.on('finish', () => {
    file.close();
    console.log('\n[dl] Download concluido: ' + Math.round(received / 1048576) + ' MB');
    console.log('[dl] Extraindo...');
    execSync('tar -xzf ' + dest + ' -C /app/data', { stdio: 'inherit' });
    fs.unlinkSync(dest);
    console.log('[dl] Uploads extraidos com sucesso!');
    process.exit(0);
  });
}).on('error', err => {
  console.error('[dl] Erro:', err.message);
  process.exit(1);
});
