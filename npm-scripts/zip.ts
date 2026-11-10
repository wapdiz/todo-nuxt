import { zip } from 'zip-a-folder';
import path from 'path';

// exapmle: "zip": "npx tsx npm-scripts/zip.ts --prod --ru" --prod --ru опции для названия
// npm run zip

// const args = process.argv;
const now = new Date();
const year = now.getFullYear();
const month = now.getMonth() + 1; // Месяцы начинаются с 0
const day = now.getDate();
const hours = now.getHours();
const minutes = now.getMinutes();

const version = `-${year}-${month}-${day}-${hours}-${minutes}`;
const ext = 'zip';
const cwd = process.cwd();
const args = process.argv.filter((arg) => arg.includes('--'));
const argsName = args.length ? '-' + args.map((arg) => arg.replace('--', '')).join('-') : '';
const name = 'dist' + argsName + version;

await zip(path.resolve(cwd, 'output/public'), `${path.resolve(cwd)}/${name}.${ext}`);

console.log(`Zip file created: ${name}.${ext}`);
