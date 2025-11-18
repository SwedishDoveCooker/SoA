import { promises as fs } from 'fs';
import path from 'path';
import { spawn } from 'child_process';
import base92Module from 'base92'; 
import process from 'process';

let base92Instance;
try {
  const Base92 = base92Module.Base92 || base92Module.default?.Base92 || base92Module;
  if (typeof Base92 === 'function') {
    base92Instance = new Base92();
  } else {
    base92Instance = Base92;
  }
} catch (e) {
  console.warn("Base92 Init Err:", e.message);
}

const localesDir = path.resolve('locales'); 
const enPath = path.join(localesDir, 'en', 'translation.json');
const base92Path = path.join(localesDir, 'base92', 'translation.json');
const base100Path = path.join(localesDir, 'base100', 'translation.json');

async function transformStrings(obj, transformer) {
  const newObj = {};
  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      const value = obj[key];
      if (typeof value === 'string') {
        newObj[key] = await transformer(value);
      } else if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        newObj[key] = await transformStrings(value, transformer);
      } else {
        newObj[key] = value;
      }
    }
  }
  return newObj;
}

function toBase92(str) {
  if (!str) return "";
  if (!base92Instance || typeof base92Instance.encode !== 'function') return str;
  
  try {
    const encoder = new TextEncoder();
    const data = encoder.encode(str);
    return base92Instance.encode(data);
  } catch (e) {
    console.warn(`Base92 Encode Err ("${str}"):`, e.message);
    return str;
  }
}

function toBase100(str) {
  if (str === "") return Promise.resolve("");
  return new Promise((resolve) => {
    try {
      const base100Process = spawn('base100');
      let stdoutData = '';
      
      base100Process.stdout.on('data', (data) => { stdoutData += data.toString(); });
      
      base100Process.on('close', (code) => {
        if (code !== 0) resolve(str);
        else resolve(stdoutData.trim());
      });

      base100Process.on('error', () => resolve(str));
      
      base100Process.stdin.write(str);
      base100Process.stdin.end();
    } catch {
      resolve(str);
    }
  });
}

async function generateLocales() {
  try {
    let enContent;
    try {
      enContent = await fs.readFile(enPath, 'utf-8');
    } catch {
      console.error(`Err: Unable to read 'en' source file: ${enPath}`);
      console.error('Please ensure i18next-parser has run successfully and generated the file.');
      return;
    }

    const enJson = JSON.parse(enContent);

    console.log("Generating base92 locale file...");
    const base92Json = await transformStrings(enJson, toBase92);

    console.log("Generating base100 locale file...");
    const base100Json = await transformStrings(enJson, toBase100);

    await fs.mkdir(path.join(localesDir, 'base92'), { recursive: true });
    await fs.mkdir(path.join(localesDir, 'base100'), { recursive: true });

    await fs.writeFile(base92Path, JSON.stringify(base92Json, null, 2), 'utf-8');
    console.log(`Generated: ${base92Path}`);

    await fs.writeFile(base100Path, JSON.stringify(base100Json, null, 2), 'utf-8');
    console.log(`Generated: ${base100Path}`);

  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

generateLocales();