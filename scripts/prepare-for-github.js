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

// Copy JS directory and update API paths
copyDirectory(path.join(srcDir, 'js'), path.join(destDir, 'js'), true);

// Copy repository directory
copyDirectory(path.join(srcDir, 'repository'), path.join(destDir, 'repository'));

// Copy and modify HTML files
copyFileWithModifications(path.join(srcDir, 'index.html'), path.join(destDir, 'index.html'));
copyFileWithModifications(path.join(srcDir, 'rota_charts.html'), path.join(destDir, 'rota.html'));
copyFileWithModifications(path.join(srcDir, 'residents_charts.html'), path.join(destDir, 'residents.html'));

// Create routes.html file in the docs directory to redirect from index
createRoutesHTML();

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

function copyFileWithModifications(src, dest) {
    try {
        let data = fs.readFileSync(src, 'utf8');
        
        // Update paths in HTML files
        data = data.replace(/\/css\//g, './css/');
        data = data.replace(/\/js\//g, './js/');
        data = data.replace(/\/repository\//g, './repository/');
        
        // Update navigation links
        data = data.replace(/href="\/"/g, 'href="./index.html"');
        data = data.replace(/href="\/rota"/g, 'href="./rota.html"');
        data = data.replace(/href="\/residents"/g, 'href="./residents.html"');
        
        fs.writeFileSync(dest, data);
        console.log(`Copied with modifications: ${path.basename(src)} to ${dest}`);
    } catch (err) {
        console.error(`Error copying ${src}: ${err.message}`);
    }
}

function copyDirectory(src, dest, modifyJs = false) {
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
            copyDirectory(srcPath, destPath, modifyJs);
        } else {
            if (modifyJs && entry.name.endsWith('.js')) {
                // Modify JavaScript files to use relative paths
                let data = fs.readFileSync(srcPath, 'utf8');
                
                // Update fetch URLs in JS files
                data = data.replace(/fetch\('\/repository\//g, "fetch('./repository/");
                
                // Update any other paths
                data = data.replace(/\/css\//g, './css/');
                data = data.replace(/\/js\//g, './js/');
                
                fs.writeFileSync(destPath, data);
                console.log(`Modified and copied: ${entry.name}`);
            } else {
                copyFile(srcPath, destPath);
            }
        }
    }
}

function createRoutesHTML() {
    // Create a simple HTML file that provides links to the main pages
    const routesHTML = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>AlBahar Charts & Analysis</title>
    <link rel="stylesheet" href="./css/landing.css">
    <style>
        body {
            font-family: Arial, sans-serif;
            padding: 20px;
            max-width: 800px;
            margin: 0 auto;
        }
        .links {
            display: flex;
            flex-direction: column;
            gap: 10px;
            margin-top: 20px;
        }
        .link-item {
            padding: 15px;
            border: 1px solid #ddd;
            border-radius: 5px;
            text-decoration: none;
            color: #333;
            transition: background-color 0.3s;
        }
        .link-item:hover {
            background-color: #f5f5f5;
        }
    </style>
</head>
<body>
    <h1>AlBahar Eye Center Dashboard</h1>
    <p>Please select a page to view:</p>
    
    <div class="links">
        <a href="./index.html" class="link-item">Home Page</a>
        <a href="./rota.html" class="link-item">ROTA Charts</a>
        <a href="./residents.html" class="link-item">Residents Data</a>
    </div>
</body>
</html>`;

    fs.writeFileSync(path.join(destDir, 'routes.html'), routesHTML);
    console.log('Created routes.html');
}