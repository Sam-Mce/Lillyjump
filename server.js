const express = require('express');
const cors = require('cors');
const app = express();
const port = process.env.PORT || 3000;

// Enable JSON parsing and CORS
app.use(express.json());
app.use(cors());

// Store scores in memory (replace with a database in production)
let leaderboard = [];

// Get top scores
app.get('/leaderboard', (req, res) => {
    const topScores = leaderboard
        .sort((a, b) => b.score - a.score)
        .slice(0, 10);
    res.json(topScores);
});

// Submit a new score
app.post('/score', (req, res) => {
    const { name, score } = req.body;
    if (!name || !score) {
        return res.status(400).json({ error: 'Name and score are required' });
    }
    
    leaderboard.push({
        name,
        score,
        date: new Date()
    });
    
    res.json({ success: true });
});

// Serve static files
app.use(express.static('.'));

// Handle 404s
app.use((req, res) => {
    res.status(404).json({ error: 'Not found' });
});

// Error handler
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ error: 'Something broke!' });
});

app.listen(port, () => {
    console.log(`Server running on port ${port}`);
}); 