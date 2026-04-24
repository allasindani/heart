import AdmZip from 'adm-zip';
import fs from 'fs';
import path from 'path';

const zip = new AdmZip();
const distPath = path.join(process.cwd(), 'dist');
const zipPath = path.join(process.cwd(), 'dist', 'heart-connect-update.zip');

if (fs.existsSync(distPath)) {
  zip.addLocalFolder(distPath);
  zip.writeZip(zipPath);
  console.log(`Update bundle created at: ${zipPath}`);
} else {
  console.error('dist folder not found. Run vite build first.');
}
