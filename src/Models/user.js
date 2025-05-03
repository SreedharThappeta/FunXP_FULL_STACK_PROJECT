const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
    {
        "username": {
            type: String,
            required: true,
            unique: true,
            trim: true,
            minlength: 3,
            maxlength: 30
        },
        "emailId": {
            type: String,
            unique: true,
            required: true,
            trim: true,
            lowercase: true,
            match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
        },
        "password": {
            type: String,
            required: true,
            minlength: 6
        },
        "avatar": {
            type: String,
            default: "😊"
        },
        "stats": {
            gamesPlayed: { type: Number, default: 0 },
            gamesWon: { type: Number, default: 0 },
            gamesLost: { type: Number, default: 0 },
            gamesTied: { type: Number, default: 0 },
            winRate: { type: Number, default: 0 },
            xp: { type: Number, default: 0 },
            level: { type: Number, default: 1 },
            gameHistory: [{
                gameType: String,
                result: { type: String, enum: ['win', 'loss', 'tie'] },
                opponent: { type: mongoose.Schema.Types.ObjectId, ref: 'Users' },
                date: { type: Date, default: Date.now }
            }]
        },
        "createdAt": {
            type: Date,
            default: Date.now
        }
    }
);

const User = mongoose.model("Users", userSchema);

module.exports = {User};