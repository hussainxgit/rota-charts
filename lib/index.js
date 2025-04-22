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
app.get('/repository/rota_april_data.json', (req, res) => {
    res.sendFile(path.join(__dirname, 'repository', 'rota_april_data.json'));
});

// Endpoint to return residents JSON data
app.get('/repository/residents_data.json', (req, res) => {
    res.sendFile(path.join(__dirname, 'repository', 'residents_data.json'));
});

// Serve landing page for the root path
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Serve index.html for the /rota path
app.get('/rota', (req, res) => {
    res.sendFile(path.join(__dirname, 'rota_charts.html'));
});

// Serve residents.html for /residents path
app.get('/residents', (req, res) => {
    res.sendFile(path.join(__dirname, 'residents_charts.html'));
});

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running at http://localhost:${PORT}`);
    console.log(`Main dashboard: http://localhost:${PORT}/`);
    console.log(`ROTA charts: http://localhost:${PORT}/rota`);
    console.log(`Residents data: http://localhost:${PORT}/residents`);
});