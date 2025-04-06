const express = require("express");
const { Friend } = require("../Models/friend.js");
const { userAuth } = require("../Utils/userAuthentication.js");

const router = express.Router();

router.get("/", userAuth, async (req, res) => {
    try {
        const friends = await Friend.find({
            $or: [
                { requester: req.user._id, status: "accepted" },
                { recipient: req.user._id, status: "accepted" },
            ],
        })
            .populate("requester", "emailId")
            .populate("recipient", "emailId");

        console.log(friends);
        res.json({ success: true, friends });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});
// Send Friend Request
router.post("/request", userAuth, async (req, res) => {
    const { recipientId } = req.body;
    try {
        const friendRequest = new Friend({ requester: req.user._id, recipient: recipientId });
        await friendRequest.save();
        res.json({ success: true, message: "Friend request sent!" });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// Get Friend Requests
router.get("/requests", userAuth, async (req, res) => {
    try {
        console.log("hii");
        const requests = await Friend.find({ recipient: req.user._id, status: "pending" }).populate("requester", "emailId");
        console.log(requests);
        res.json({ success: true, requests });
    } catch (err) {
        res.status(501).json({ success: false, error: err.message });
    }
});

// Accept/Reject Friend Request
router.post("/respond", userAuth, async (req, res) => {
    const { requestId, status } = req.body;
    try {
        const friendRequest = await Friend.findById(requestId);
        if (!friendRequest || friendRequest.recipient.toString() !== req.user._id.toString()) {
            throw new Error("Invalid request");
        }
        friendRequest.status = status;
        await friendRequest.save();

        if (status === "accepted") {
            // Emit event to both users
            req.app.get("io").to(friendRequest.requester.toString()).emit("friendAccepted", {
                friendId: req.user._id,
                emailId: req.user.emailId,
            });
            req.app.get("io").to(req.user._id.toString()).emit("friendAccepted", {
                friendId: friendRequest.requester,
                emailId: friendRequest.requester.emailId,
            });
        }

        res.json({ success: true, message: `Friend request ${status}` });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

module.exports = router;