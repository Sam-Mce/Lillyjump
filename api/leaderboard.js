// Store scores in memory (this will reset on each deployment)
let leaderboard = [];

export default async function handler(req, res) {
    console.log('Received request:', {
        method: req.method,
        path: req.url,
        body: req.body,
        headers: req.headers
    });

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
    console.log('Processing path:', path);

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
            return res.status(500).json({ error: 'Failed to fetch leaderboard: ' + error.message });
        }
    }

    if (path === '/api/score' && req.method === 'POST') {
        try {
            console.log('Processing score submission:', req.body);
            
            if (!req.body) {
                throw new Error('Request body is missing');
            }
            
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
            
            console.log('Created new score entry:', newScore);
            
            // Add new score
            leaderboard.push(newScore);
            
            // Sort scores in descending order and keep top 100
            leaderboard = leaderboard
                .sort((a, b) => b.score - a.score)
                .slice(0, 100);
            
            console.log('Current leaderboard length:', leaderboard.length);
            
            const position = leaderboard.findIndex(entry => 
                entry.name === newScore.name && 
                entry.score === newScore.score
            ) + 1;
            
            console.log('Score position:', position);
            
            const response = { 
                success: true, 
                entry: newScore,
                position: position
            };
            
            console.log('Sending response:', response);
            return res.status(200).json(response);
        } catch (error) {
            console.error('Error submitting score:', error);
            return res.status(500).json({ 
                error: 'Failed to submit score: ' + error.message,
                details: {
                    name: error.name,
                    message: error.message,
                    stack: error.stack
                }
            });
        }
    }

    // Handle 404s
    console.log('Path not found:', path);
    return res.status(404).json({ error: 'Not found', path: path });
} 