const fs = require('fs');
const path = require('path');

// Define paths
const srcDir = path.join(__dirname, '..', 'lib');
const destDir = path.join(__dirname, '..', 'docs');

// Create destination directory if it doesn't exist
if (!fs.existsSync(destDir)) {
    fs.mkdirSync(destDir, { recursive: true });
}

// Copy CSS directory
copyDirectory(path.join(srcDir, 'css'), path.join(destDir, 'css'));

// Copy JS directory
copyDirectory(path.join(srcDir, 'js'), path.join(destDir, 'js'));

// Copy repository directory
copyDirectory(path.join(srcDir, 'repository'), path.join(destDir, 'repository'));

// Copy HTML files
copyFile(path.join(srcDir, 'index.html'), path.join(destDir, 'index.html'));
copyFile(path.join(srcDir, 'screens', 'rota_charts.html'), path.join(destDir, 'rota_charts.html'));
copyFile(path.join(srcDir, 'screens', 'residents_charts.html'), path.join(destDir, 'residents_charts.html'));

// Create .nojekyll file to prevent GitHub from ignoring files that begin with underscores
fs.writeFileSync(path.join(destDir, '.nojekyll'), '');

console.log('Files prepared for GitHub Pages in the docs directory');

// Helper functions
function copyFile(src, dest) {
    try {
        const data = fs.readFileSync(src);
        fs.writeFileSync(dest, data);
        console.log(`Copied: ${path.basename(src)} to ${dest}`);
    } catch (err) {
        console.error(`Error copying ${src}: ${err.message}`);
    }
}

function copyDirectory(src, dest) {
    // Create destination directory if it doesn't exist
    if (!fs.existsSync(dest)) {
        fs.mkdirSync(dest, { recursive: true });
    }

    // Read directory contents
    const entries = fs.readdirSync(src, { withFileTypes: true });

    // Copy each entry
    for (const entry of entries) {
        const srcPath = path.join(src, entry.name);
        const destPath = path.join(dest, entry.name);

        if (entry.isDirectory()) {
            copyDirectory(srcPath, destPath);
        } else {
            copyFile(srcPath, destPath);
        }
    }
}