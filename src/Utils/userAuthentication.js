const jwt = require("jsonwebtoken");
const { User } = require("../Models/user");

const userAuth = async function (req, res, next) {
    try {
        const token = req.cookies.usertoken;

        if (!token) {
            // For API requests, return JSON error
            if (req.xhr || req.headers.accept?.includes('application/json')) {
                throw new Error("Login First!");
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
        // For API requests, return JSON error

            // For page requests, redirect to login
            res.redirect('/');
    }
}

module.exports = { userAuth };