const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
    {
        "emailId":{
            type:String,
            unique:true,
            required:true
        },
        "password":{
            type:String,
            required:true
        }
    }
)

const User = mongoose.model("Users",userSchema);

module.exports = {User};