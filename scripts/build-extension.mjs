import { cp, mkdir, rm, writeFile, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const distDir = path.join(rootDir, 'dist');
const extensionDir = path.join(rootDir, 'extension');

async function main() {
  // Clean and recreate extension directory
  await rm(extensionDir, { recursive: true, force: true });
  await mkdir(extensionDir, { recursive: true });

  // Copy built app into extension folder
  await cp(distDir, extensionDir, { recursive: true });

  // Tweak the extension's HTML so the popup is larger,
  // without changing the normal web build.
  const indexPath = path.join(extensionDir, 'index.html');
  let indexHtml = await readFile(indexPath, 'utf8');
  const popupStyles = `
  <style>
    body {
      min-width: 1100px;
      min-height: 700px;
      overflow-x: auto;
    }
  </style>`;
  indexHtml = indexHtml.replace('</head>', `${popupStyles}\n</head>`);
  await writeFile(indexPath, indexHtml, 'utf8');

  // Write Chrome extension manifest (MV3)
  const manifest = {
    manifest_version: 3,
    name: 'Design to Code',
    version: '1.0.0',
    action: {
      default_popup: 'index.html',
      default_title: 'Design to Code'
    },
    host_permissions: [
      "https://generativelanguage.googleapis.com/*"
    ]
  };

  await writeFile(
    path.join(extensionDir, 'manifest.json'),
    JSON.stringify(manifest, null, 2),
    'utf8'
  );
}

main().catch((err) => {
  console.error('Failed to build Chrome extension:', err);
  process.exit(1);
});
