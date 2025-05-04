const mongoose = require("mongoose");

const gameSchema = new mongoose.Schema(
    {
        "GameName": {type: String, required: true},
        "createdBy": {type: mongoose.Schema.Types.ObjectId, ref: "Users", required: true},
        "players": [{type: mongoose.Schema.Types.ObjectId, ref: "Users"}],
        "maxPlayers": {type: Number, default: 2},
        "data": [{type: Number}], // Called numbers
        "ready": {type: Number, default: 0},
        "currentTurn": {type: mongoose.Schema.Types.ObjectId, ref: "Users"},
        "state": {type: String, enum: ['waiting', 'playing', 'finished'], default: 'waiting'},
        "messages": [{
            sender: { type: mongoose.Schema.Types.ObjectId, ref: "Users" },
            content: String,
            timestamp: { type: Date, default: Date.now }
        }],
        "boards": [{
            playerId: { type: mongoose.Schema.Types.ObjectId, ref: "Users" },
            numbers: [[Number]] // 5x5 grid of numbers
        }]
    }
);

const Game = mongoose.model("Games", gameSchema);

module.exports = {Game};
