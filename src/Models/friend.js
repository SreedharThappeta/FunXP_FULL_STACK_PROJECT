const mongoose = require("mongoose");

const friendSchema = new mongoose.Schema({
    requester: { type: mongoose.Schema.Types.ObjectId, ref: "Users" },
    recipient: { type: mongoose.Schema.Types.ObjectId, ref: "Users" },
    status: { type: String, enum: ["pending", "accepted", "rejected"], default: "pending" },
}, { timestamps: true });

const Friend = mongoose.model("Friend", friendSchema);
module.exports = { Friend };