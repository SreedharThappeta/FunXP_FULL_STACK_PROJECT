// server.js
const express = require('express');
const path = require('path');
const app = express();
const port = 3000;

// Serve static files
app.use(express.static('public'));
app.use(express.json());

// FLAMES calculation function
function calculateFlames(name1, name2) {
    // Remove non-alphabetic characters and convert to lowercase
    name1 = name1.replace(/[^a-zA-Z]/g, '').toLowerCase();
    name2 = name2.replace(/[^a-zA-Z]/g, '').toLowerCase();
    
    let name1Array = [...name1];
    let name2Array = [...name2];
    
    // Find and remove matching characters
    for (let i = 0; i < name1Array.length; i++) {
        const matchIndex = name2Array.indexOf(name1Array[i]);
        if (matchIndex !== -1) {
            name1Array[i] = null;
            name2Array[matchIndex] = null;
        }
    }
    
    // Count remaining characters
    const remainingCount = 
        name1Array.filter(char => char !== null).length + 
        name2Array.filter(char => char !== null).length;
    
    // FLAMES array
    const flames = ['Friends', 'Lovers', 'Affection', 'Marriage', 'Enemies', 'Siblings'];
    const position = remainingCount % 6;
    const result = flames[position === 0 ? 5 : position - 1];
    
    console.log(`Names: ${name1} & ${name2}, Count: ${remainingCount}, Result: ${result}`);
    return result;
}

// API endpoint for FLAMES calculation
app.post('/calculate-flames', (req, res) => {
    const { name1, name2 } = req.body;
    console.log('Received names:', name1, name2);
    
    if (!name1 || !name2) {
        return res.status(400).json({ error: 'Both names are required' });
    }
    
    try {
        const result = calculateFlames(name1, name2);
        console.log('Sending result:', result);
        res.json({ result });
    } catch (error) {
        console.error('Calculation error:', error);
        res.status(500).json({ error: 'Calculation failed' });
    }
});

// Serve the HTML file
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(port, () => {
    console.log(`FLAMES game running at http://localhost:${port}`);
});