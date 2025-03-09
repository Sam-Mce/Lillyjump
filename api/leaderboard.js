// In-memory leaderboard (for serverless environment)
let leaderboard = [];

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
            
            leaderboard.push(newScore);
            
            // Keep only top 100 scores
            leaderboard.sort((a, b) => b.score - a.score);
            leaderboard = leaderboard.slice(0, 100);
            
            res.status(200).json({ success: true, entry: newScore });
        } catch (error) {
            console.error('Error submitting score:', error);
            res.status(500).json({ error: 'Failed to submit score' });
        }
    } else {
        res.status(405).json({ error: 'Method not allowed' });
    }
} 