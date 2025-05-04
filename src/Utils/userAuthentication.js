const jwt = require("jsonwebtoken");
const { User } = require("../Models/user");

const userAuth = async function (req, res, next) {
    try {
        const token = req.cookies.usertoken;

        if (!token) {
            // For API requests or AJAX calls, return JSON error
            if (req.xhr || req.headers.accept?.includes('application/json') || req.headers['content-type']?.includes('application/json')) {
                return res.status(401).json({ success: false, error: "Authentication required" });
            }
            // For page requests, redirect to login
            return res.redirect('/');
        }

        const data = await jwt.verify(token, "#FUNxp@5#!");
        const user = await User.findById(data.userId);
        
        if (!user) {
            throw new Error("User not found");
        }

        req.user = user;
        next();
    } catch (err) {
        // For API requests or AJAX calls, return JSON error
        if (req.xhr || req.headers.accept?.includes('application/json') || req.headers['content-type']?.includes('application/json')) {
            return res.status(401).json({ success: false, error: err.message });
        }
        // For page requests, redirect to login
        res.redirect('/');
    }
}

module.exports = { userAuth };