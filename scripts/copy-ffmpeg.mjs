import fs from 'node:fs';
import path from 'node:path';

const srcDir = path.join('node_modules', '@ffmpeg', 'core', 'dist', 'esm');
const destDir = path.join('public', 'ffmpeg');

if (fs.existsSync(srcDir)) {
  if (!fs.existsSync(destDir)) {
    fs.mkdirSync(destDir, { recursive: true });
  }
  fs.copyFileSync(path.join(srcDir, 'ffmpeg-core.js'), path.join(destDir, 'ffmpeg-core.js'));
  fs.copyFileSync(path.join(srcDir, 'ffmpeg-core.wasm'), path.join(destDir, 'ffmpeg-core.wasm'));
  console.log('Synced local ffmpeg-core assets to public/ffmpeg/');
}
