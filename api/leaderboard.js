// Store scores in memory (note: will reset on server restart)
let leaderboard = [];

export default function handler(req, res) {
    // Enable CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    // Handle OPTIONS request for CORS preflight
    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    if (req.method === 'GET') {
        // Get top scores
        const topScores = leaderboard
            .sort((a, b) => b.score - a.score)
            .slice(0, 10);
        res.status(200).json(topScores);
    } else if (req.method === 'POST') {
        const { name, score } = req.body;
        if (!name || !score) {
            return res.status(400).json({ error: 'Name and score are required' });
        }
        
        leaderboard.push({
            name,
            score,
            date: new Date()
        });
        
        res.status(200).json({ success: true });
    } else {
        res.status(405).json({ error: 'Method not allowed' });
    }
} 