const express = require('express');
const path = require('path');
const app = express();

// Serve static files
app.use(express.static(path.join(__dirname)));

// Serve CSS files
app.use('/css', express.static(path.join(__dirname, 'css')));

// Serve JS files
app.use('/js', express.static(path.join(__dirname, 'js')));

// Endpoint to return JSON data
app.get('/repository/data.json', (req, res) => {
    res.sendFile(path.join(__dirname, 'data.json'));
});

// Serve index.html for the root path
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running at http://localhost:${PORT}`);
});