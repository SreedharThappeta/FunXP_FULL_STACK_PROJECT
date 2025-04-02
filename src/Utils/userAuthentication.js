const jwt = require("jsonwebtoken");
const { User } = require("../Models/user");

const userAuth = async function (req,res,next) {
    try{
        console.log(req.cookies);
        const token = req.cookies.usertoken;

        if(!token){
            throw new Error("Login First!");
        }
        const data = jwt.verify(token,"#FUNxp@5#!");
        const user = await User.findById(data.userId);
        req.user = user;

        console.log(user);
        next();
    }
    catch(err)
    {
        res.status(400).json({"ERROR": err.message,"success":false});
    }
}



module.exports = {userAuth};