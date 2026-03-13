const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// MongoDB Connection
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/solana-tanks';
mongoose.connect(MONGO_URI)
    .then(() => console.log('Connected to MongoDB'))
    .catch(err => console.error('MongoDB connection error:', err));

// Schema
const scoreSchema = new mongoose.Schema({
    id: { type: String, required: true, unique: true }, // seekerId or walletAddress
    displayName: String,
    totalScore: { type: Number, default: 0 },
    totalSKR: { type: Number, default: 0 },
    gamesPlayed: { type: Number, default: 0 },
    lastUpdated: { type: Date, default: Date.now }
});

const Score = mongoose.model('Score', scoreSchema);

// Webhook / API Endpoints
app.post('/api/scores', async (req, res) => {
    const { id, displayName, score, skr } = req.body;

    if (!id) return res.status(400).json({ error: 'ID is required' });

    try {
        let userScore = await Score.findOne({ id });

        if (userScore) {
            userScore.totalScore += score;
            userScore.totalSKR += skr;
            userScore.gamesPlayed += 1;
            userScore.lastUpdated = Date.now();
            if (displayName) userScore.displayName = displayName;
            await userScore.save();
        } else {
            userScore = new Score({
                id,
                displayName: displayName || id,
                totalScore: score,
                totalSKR: skr,
                gamesPlayed: 1
            });
            await userScore.save();
        }

        res.json(userScore);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/leaderboard', async (req, res) => {
    try {
        const leaderboard = await Score.find()
            .sort({ totalScore: -1 })
            .limit(50);
        res.json(leaderboard);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/scores/:id', async (req, res) => {
    try {
        const userScore = await Score.findOne({ id: req.params.id });
        if (userScore) {
            res.json(userScore);
        } else {
            res.json({ totalScore: 0, totalSKR: 0, gamesPlayed: 0 });
        }
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
