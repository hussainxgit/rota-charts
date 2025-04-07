// 1. Create a script to pre-process your data for static hosting
// save as scripts/prepare-for-github.js

const fs = require('fs');
const path = require('path');

// Copy data.json to docs folder
const sourceDataPath = path.join(__dirname, '../lib/repository/data.json');
const destDir = path.join(__dirname, '../docs');
const destDataPath = path.join(destDir, 'data.json');

// Create docs directory if it doesn't exist
if (!fs.existsSync(destDir)) {
  fs.mkdirSync(destDir, { recursive: true });
}

// Copy data file
fs.copyFileSync(sourceDataPath, destDataPath);

// Copy HTML, CSS, and JS files
const sourceHtmlPath = path.join(__dirname, '../lib/index.html');
const destHtmlPath = path.join(destDir, 'index.html');
fs.copyFileSync(sourceHtmlPath, destHtmlPath);

// Create CSS directory
const cssDest = path.join(destDir, 'css');
if (!fs.existsSync(cssDest)) {
  fs.mkdirSync(cssDest, { recursive: true });
}

// Copy CSS file
const sourceCssPath = path.join(__dirname, '../lib/css/styles.css');
const destCssPath = path.join(cssDest, 'styles.css');
fs.copyFileSync(sourceCssPath, destCssPath);

// Create JS directory
const jsDest = path.join(destDir, 'js');
if (!fs.existsSync(jsDest)) {
  fs.mkdirSync(jsDest, { recursive: true });
}

// Modify JS file for GitHub Pages
const sourceJsPath = path.join(__dirname, '../lib/js/script.js');
let jsContent = fs.readFileSync(sourceJsPath, 'utf8');

// Update data.json path for GitHub Pages
jsContent = jsContent.replace(
  "const response = await fetch('/repository/data.json');",
  "const response = await fetch('./data.json');"
);

// Write modified JS file
const destJsPath = path.join(jsDest, 'script.js');
fs.writeFileSync(destJsPath, jsContent);

console.log('Files prepared for GitHub Pages in the "docs" folder');