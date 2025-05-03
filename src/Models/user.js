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
        "createdAt": {
            type: Date,
            default: Date.now
        }
    }
);

const User = mongoose.model("Users", userSchema);

module.exports = {User};