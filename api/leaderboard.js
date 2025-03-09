// Store scores in memory (this will reset on each deployment)
let leaderboard = [];

export default async function handler(req, res) {
    // Set CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Accept');

    // Handle OPTIONS request for CORS preflight
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    // Route handling based on path
    const path = req.url.split('?')[0];

    if (path === '/api/leaderboard' && req.method === 'GET') {
        try {
            // Sort scores in descending order and get top 10
            const topScores = [...leaderboard]
                .sort((a, b) => b.score - a.score)
                .slice(0, 10);
            
            console.log('Returning leaderboard scores:', topScores);
            return res.status(200).json(topScores);
        } catch (error) {
            console.error('Error fetching leaderboard:', error);
            return res.status(500).json({ error: 'Failed to fetch leaderboard' });
        }
    }

    if (path === '/api/score' && req.method === 'POST') {
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
                date: new Date().toISOString()
            };
            
            // Add new score
            leaderboard.push(newScore);
            
            // Sort scores in descending order and keep top 100
            leaderboard = leaderboard
                .sort((a, b) => b.score - a.score)
                .slice(0, 100);
            
            console.log('Added new score:', newScore);
            console.log('Current leaderboard length:', leaderboard.length);
            
            return res.status(200).json({ 
                success: true, 
                entry: newScore,
                position: leaderboard.findIndex(entry => 
                    entry.name === newScore.name && 
                    entry.score === newScore.score
                ) + 1
            });
        } catch (error) {
            console.error('Error submitting score:', error);
            return res.status(500).json({ error: 'Failed to submit score' });
        }
    }

    // Handle 404s
    return res.status(404).json({ error: 'Not found' });
} 