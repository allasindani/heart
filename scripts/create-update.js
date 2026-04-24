import AdmZip from 'adm-zip';
import fs from 'fs';
import path from 'path';

const zip = new AdmZip();
const distPath = path.join(process.cwd(), 'dist');
const zipPath = path.join(process.cwd(), 'dist', 'heart-connect-update.zip');
const versionPath = path.join(process.cwd(), 'version.json');

// Auto-increment version
let version = '1.0.0';
if (fs.existsSync(versionPath)) {
  try {
    const versionData = JSON.parse(fs.readFileSync(versionPath, 'utf-8'));
    const parts = versionData.version.split('.');
    parts[2] = parseInt(parts[2]) + 1;
    version = parts.join('.');
    versionData.version = version;
    fs.writeFileSync(versionPath, JSON.stringify(versionData, null, 2));
    console.log(`Bumped version to: ${version}`);
  } catch (e) {
    console.error('Failed to auto-increment version:', e);
  }
}

if (fs.existsSync(distPath)) {
  zip.addLocalFolder(distPath);
  zip.writeZip(zipPath);
  console.log(`Update bundle created at: ${zipPath}`);
} else {
  console.error('dist folder not found. Run vite build first.');
}
