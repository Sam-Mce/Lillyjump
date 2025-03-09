const express = require('express');
const cors = require('cors');
const app = express();
const port = process.env.PORT || 3000;

// Enable JSON parsing and CORS with specific options
app.use(express.json());
app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Accept']
}));

// Store scores in memory (replace with a database in production)
let leaderboard = [];

// Get top scores
app.get('/leaderboard', (req, res) => {
    try {
        const topScores = leaderboard
            .sort((a, b) => b.score - a.score)
            .slice(0, 10);
        res.json(topScores);
    } catch (error) {
        console.error('Error fetching leaderboard:', error);
        res.status(500).json({ error: 'Failed to fetch leaderboard' });
    }
});

// Submit a new score
app.post('/score', (req, res) => {
    try {
        const { name, score } = req.body;
        
        if (!name || typeof name !== 'string' || name.trim().length === 0) {
            return res.status(400).json({ error: 'Valid name is required' });
        }
        
        if (score === undefined || typeof score !== 'number' || isNaN(score)) {
            return res.status(400).json({ error: 'Valid score is required' });
        }
        
        const newScore = {
            name: name.trim(),
            score: Math.floor(score), // Ensure integer score
            date: new Date()
        };
        
        leaderboard.push(newScore);
        
        // Keep only top 100 scores to manage memory
        if (leaderboard.length > 100) {
            leaderboard.sort((a, b) => b.score - a.score);
            leaderboard = leaderboard.slice(0, 100);
        }
        
        res.json({ success: true, entry: newScore });
    } catch (error) {
        console.error('Error submitting score:', error);
        res.status(500).json({ error: 'Failed to submit score' });
    }
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
    console.log(`Server running at http://localhost:${port}`);
}); 