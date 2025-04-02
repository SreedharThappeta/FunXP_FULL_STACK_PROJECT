
const mongoose = require("mongoose");

const gameSchema = new mongoose.Schema(
    {
        "GameName":{type:String},
        "createdBy":{type:String},
        "players": {type:[String], maxlength:4},
        "data": {type:[Number]},
        "ready":{ type:Number}
    }
);

const Game = mongoose.model("Games", gameSchema);

module.exports = {Game};
