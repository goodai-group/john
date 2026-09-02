import https from 'https';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const URL = 'https://john-ui6s.vercel.app/assets/index-iqSmeXbj.js';
const LOCAL = path.join(__dirname, '..', 'dist', 'assets', 'index-iqSmeXbj.js');

https.get(URL, (res) => {
  let data = '';
  res.on('data', (c) => (data += c));
  res.on('end', () => {
    const onlineSize = Buffer.byteLength(data);
    const localSize = fs.existsSync(LOCAL) ? fs.statSync(LOCAL).size : -1;
    console.log('online-bytes:', onlineSize);
    console.log('local-bytes :', localSize);
    console.log('size-match  :', onlineSize === localSize);
    console.log('has-AI-helper-text:', data.includes('AI') || data.includes('\u7b54\u7591'));
  });
}).on('error', (e) => {
  console.error('FETCH_ERROR:', e.message);
  process.exit(1);
});
