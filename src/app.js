const express = require("express");
const socketio = require("socket.io");
const http = require("node:http");
const path = require("node:path")
const jwt = require("jsonwebtoken");
const cookieParser = require("cookie-parser");
const cors = require("cors");


const {connectDB} = require("./Database/database.js");
const {User} = require("./Models/user.js");
const {userAuth} = require("./Utils/userAuthentication.js");
const {Game} = require("./Models/game.js");

const app = express();

const server = http.createServer(app);

const io = new socketio.Server(server);


app.use(express.json());
app.use(cookieParser());
app.use(cors({
    origin:"http://localhost:5500",
    credentials:true}));


app.use("/signup", async (req,res)=>{
    const {emailId, password} = req.body;

    const user = User({"emailId":emailId, "password":password});
    try{
        await user.save()
            .then(()=>{
                res.json({"success":true})
            })
            .catch(err=>{
                throw new Error(err.message);
            });
    }
    catch(err){
        res.status(500).json({"success":false,"Error":err.message});
    }
});

app.use("/login", async (req,res) =>{

    // console.log(req.body);
    const {emailId, password} = req.body;
    
        try{
            const user = await User.findOne({emailId:emailId});
            if(!user){
                throw new Error("Invalid Credentials")
            }
            if(password != user.password){
                throw new Error("Invalid Credentials");
            }

            const token = jwt.sign({"userId":user._id},"#FUNxp@5#!");
    
            res.cookie("usertoken",token, {
                maxAge: 7 * 24 * 60 * 60 * 1000,
                path: "/",
                secure:true,
                sameSite:"none"
            });
            
            // console.log(req.cookies);
            res.json({"success":true,"cookie":token});
        }
        catch(err)
        {
            res.status(400).json({"ERROR": err.message,"success":false});
        }
});

app.use("/logout",(req,res) =>{
    res.cookie("usertoken",null,{
        maxAge:0
    });

    res.json({"success":true});
});

app.use("/home",userAuth,(req,res)=>{
    res.sendFile(path.join(__dirname,"..","Frontend","home.html"));
});


app.use("/Bingo/:gameId/winner", userAuth, async (req,res) => {
    const game = await Game.findById(req.params.gameId);
    console.log(req.body);
    console.log(game.data);
    if(req.body.strikes.length == game.data.length){
        let set1 = new Set(req.body.strikes);
        console.log(set1);
        const isWinner = game.data.filter(num => set1.has(-1*num));
        if(isWinner.length == game.data.length){
            console.log(isWinner);
            io.to(req.params.gameId).emit("winner", {strikes:req.body.strikes, winner:req.user._id});
            await Game.findByIdAndDelete(req.params.gameId);
            res.json({"success":true});
        }
        else{
            res.json({"success":false});
        }
    }
    else{
        res.json({"success":false});
    }
});

const palyersocket = {};
const socketplayer = {};
const playerready = {};
app.use("/Bingo/:gameId/start", userAuth, (req,res) => {
    // console.log(req.body);
    const sockedId = req.body.id;
    const userId = req.user._id;
    palyersocket[sockedId] = userId;
    socketplayer[userId] = sockedId;

    res.json({"success":true});
});

app.use("/Bingo/:gameId", userAuth, async (req, res) => {
   try{     
        const user = req.user;

        const gameId = req.params.gameId;
        const game = await Game.findById(gameId);
        // console.log(game);
        if(!(game.players?.includes(user._id)))
        {
            game.players.push(user._id);
        }
        await game.save();
        res.sendFile(path.join(__dirname,"..","Frontend","Bingo.html"));
    }catch(err)
    {
        res.json({"message":"Game Expired!", "ERROR":err.message});
    }
    // res.json({"message":"game will begin shortly"});
})


io.on("connection", (socket) => {
    socket.on("Bingo", (msg) => {
        console.log(msg);
        socket.join(msg);
        console.log(socket.rooms);

        socket.on("gamestarted", async function(data) {
            playerready[palyersocket[socket.id]] = true;
            const game = await Game.findById(data.room);
            game.ready = game.ready + 1;

            console.log(game);
            await game.save();
            if(game.ready >= 2){
                console.log("send"+game.ready);
                io.to(socketplayer[game.createdBy]).emit("submit",0);
                console.log(game.createdBy);
            }
        });

        socket.on("move", async function(data) {
            console.log(data);
            io.to(data.room).emit("moveIn", data.move, palyersocket[socket.id]);
            const game = await Game.findById(data.room);
            game.data.push(data.move);
            game.save();
            sendnext(data.index,data.room);
        });

        async function sendnext(index, gameid){
            const game = await Game.findById(gameid);
            io.to(socketplayer[game.players[index%2]]).emit("submit",index);
        }
    });

});



app.use("/Bingo", userAuth, async (req,res) => {

    const user = req.user;

    const bingo = await Game({"gameName":"Bingo","createdBy":user._id,"ready":0});
    // console.log(bingo);
    await bingo.save();
    res.json({"success":true, "gameId":bingo._id});
});






app.use("/",(req,res) => {
    res.sendFile(path.join(__dirname,"..","Frontend","index.html"));
});


connectDB()
    .then(() =>{
    server.listen(5500, ()=>{
        console.log("The server is listenting on port 5500");
    });
})

