const express = require('express');
const router = express.Router();
const { User } = require('../Models/user');

// Get user stats
router.get('/:userId', async (req, res) => {
    try {
        const user = await User.findById(req.params.userId)
            .select('stats username avatar')
            .populate('stats.gameHistory.opponent', 'username avatar');
        
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        
        res.json(user);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Update stats after a game
router.post('/update-game', async (req, res) => {
    try {
        const { userId, gameType, result, opponentId } = req.body;
        
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Update game counts
        user.stats.gamesPlayed += 1;
        if (result === 'win') {
            user.stats.gamesWon += 1;
            user.stats.xp += 10; // More XP for winning
        } else if (result === 'loss') {
            user.stats.gamesLost += 1;
            user.stats.xp += 5; // Less XP for losing
        } else {
            user.stats.gamesTied += 1;
            user.stats.xp += 7; // Medium XP for tie
        }

        // Calculate win rate
        user.stats.winRate = (user.stats.gamesWon / user.stats.gamesPlayed) * 100;

        // Calculate level (every 100 XP = 1 level)
        user.stats.level = Math.floor(user.stats.xp / 100) + 1;

        // Add to game history
        user.stats.gameHistory.push({
            gameType,
            result,
            opponent: opponentId,
            date: new Date()
        });

        await user.save();
        res.json(user.stats);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Reset user stats
router.post('/reset/:userId', async (req, res) => {
    try {
        const user = await User.findById(req.params.userId);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        user.stats = {
            gamesPlayed: 0,
            gamesWon: 0,
            gamesLost: 0,
            gamesTied: 0,
            winRate: 0,
            xp: 0,
            level: 1,
            gameHistory: []
        };

        await user.save();
        res.json(user.stats);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

module.exports = router;