const mongoose = require("mongoose");

const messageSchema = new mongoose.Schema({
    sender: { type: mongoose.Schema.Types.ObjectId, ref: "Users" },
    recipient: { type: mongoose.Schema.Types.ObjectId, ref: "Users" },
    content: { type: String, required: true },
    timestamp: { type: Date, default: Date.now },
}, { timestamps: true });

const Message = mongoose.model("Message", messageSchema);
module.exports = { Message };