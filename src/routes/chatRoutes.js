const express = require("express");
const { Message } = require("../Models/message.js");
const { userAuth } = require("../Utils/userAuthentication.js");

const router = express.Router();

// Send Message
router.post("/send", userAuth, async (req, res) => {
    const { recipientId, content } = req.body;
    try {
        const message = new Message({ sender: req.user._id, recipient: recipientId, content });
        await message.save();

        // Emit the message to both the sender and recipient
        req.app.get("io").to(recipientId).emit("receiveMessage", {
            senderId: req.user._id,
            recipientId,
            content,
        });
        req.app.get("io").to(req.user._id).emit("receiveMessage", {
            senderId: req.user._id,
            recipientId,
            content,
        });

        res.json({ success: true, message: "Message sent!" });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// Get Messages
router.get("/:friendId", userAuth, async (req, res) => {
    const { friendId } = req.params;
    try {
        const messages = await Message.find({
            $or: [
                { sender: req.user._id, recipient: friendId },
                { sender: friendId, recipient: req.user._id },
            ],
        }).sort({ timestamp: 1 });
        res.json({ success: true, messages });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// Respond to Friend Request
router.post("/respond", userAuth, async (req, res) => {
    const { requestId, status } = req.body;
    try {
        const friendRequest = await Friend.findById(requestId);
        if (!friendRequest || friendRequest.recipient.toString() !== req.user._id.toString()) {
            throw new Error("Invalid request");
        }
        friendRequest.status = status;
        await friendRequest.save();
        res.json({ success: true, message: `Friend request ${status}` });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// Get Friend Requests
router.get("/requests", userAuth, async (req, res) => {
    try {
        const requests = await Friend.find({ recipient: req.user._id, status: "pending" })
            .populate("requester", "emailId");
        res.json({ success: true, requests });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

module.exports = router;