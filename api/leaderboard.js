const fs = require('fs');
const path = require('path');

// Path to the leaderboard file
const LEADERBOARD_FILE = path.join(process.cwd(), 'data', 'leaderboard.json');

// Ensure the data directory exists
if (!fs.existsSync(path.join(process.cwd(), 'data'))) {
    fs.mkdirSync(path.join(process.cwd(), 'data'));
}

// Initialize leaderboard file if it doesn't exist
if (!fs.existsSync(LEADERBOARD_FILE)) {
    fs.writeFileSync(LEADERBOARD_FILE, JSON.stringify([]));
}

// Read leaderboard from file
function getLeaderboard() {
    try {
        const data = fs.readFileSync(LEADERBOARD_FILE, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        console.error('Error reading leaderboard:', error);
        return [];
    }
}

// Save leaderboard to file
function saveLeaderboard(leaderboard) {
    try {
        fs.writeFileSync(LEADERBOARD_FILE, JSON.stringify(leaderboard, null, 2));
        return true;
    } catch (error) {
        console.error('Error saving leaderboard:', error);
        return false;
    }
}

export default function handler(req, res) {
    // Enable CORS
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

    // Handle OPTIONS request for CORS
    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    if (req.method === 'GET') {
        try {
            const leaderboard = getLeaderboard();
            const topScores = leaderboard
                .sort((a, b) => b.score - a.score)
                .slice(0, 10);
            res.status(200).json(topScores);
        } catch (error) {
            console.error('Error fetching leaderboard:', error);
            res.status(500).json({ error: 'Failed to fetch leaderboard' });
        }
    } else if (req.method === 'POST') {
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
                score: Math.floor(score),
                date: new Date().toISOString()
            };
            
            const leaderboard = getLeaderboard();
            leaderboard.push(newScore);
            
            // Keep only top 100 scores
            leaderboard.sort((a, b) => b.score - a.score);
            const topScores = leaderboard.slice(0, 100);
            
            if (saveLeaderboard(topScores)) {
                res.status(200).json({ success: true, entry: newScore });
            } else {
                throw new Error('Failed to save leaderboard');
            }
        } catch (error) {
            console.error('Error submitting score:', error);
            res.status(500).json({ error: 'Failed to submit score' });
        }
    } else {
        res.status(405).json({ error: 'Method not allowed' });
    }
} 