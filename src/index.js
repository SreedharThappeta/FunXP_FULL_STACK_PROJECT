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

// Enable CORS
app.use(cors({
    origin: true,
    credentials: true
}));

// Serve static files from Frontend directory
app.use(express.static(path.join(__dirname, "..", "Frontend")));

const io = new socketio.Server(server, {
    cors: {
        origin: true,
        credentials: true
    }
});

app.set("io", io);
app.use(express.json());
app.use(cookieParser());

app.get("/users", userAuth, async (req, res) => {
    const { email } = req.query;
    console.log(email);
    try {
        const user = await User.findOne({ emailId: email });
        if (!user) {
            throw new Error("User not found");
        }
        res.json({ success: true, user });
    } catch (err) {
        res.status(404).json({ success: false, error: err.message });
    }
});



// app.use(cors({
//     origin:"http://3.109.212.63:3000",
//     credentials:true}));

app.get("/me", userAuth, (req, res) => {
    res.json({ 
        success: true, 
        userId: req.user._id,
        username: req.user.username,
        avatar: req.user.avatar
    });
});
const friendRoutes = require("./routes/friendRoutes.js");
const chatRoutes = require("./routes/chatRoutes.js");
app.use("/friends", friendRoutes);
app.use("/chat", chatRoutes);
io.on("connection", (socket) => {
    console.log("A user connected:", socket.id);

    socket.on("joinChat", (userId) => {
        if (!userId) {
            console.error("Invalid user ID");
            return;
        }
        socket.join(userId);
        console.log(`User ${userId} joined their chat room`);
    });

    socket.on("sendMessage", (data) => {
        const { senderId, recipientId, content } = data;
        // Emit to both sender and recipient rooms
        io.to(recipientId).to(senderId).emit("receiveMessage", { senderId, recipientId, content });
    });

    socket.on("disconnect", () => {
        console.log("A user disconnected:", socket.id);
    });

    // Bingo game events
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


app.use("/signup", async (req, res) => {
    const { username, emailId, password, avatar } = req.body;

    try {
        // Validate inputs
        if (!username || username.length < 3 || username.length > 30) {
            throw new Error("Username must be between 3 and 30 characters");
        }
        if (!emailId || !emailId.match(/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/)) {
            throw new Error("Invalid email address");
        }
        if (!password || password.length < 6) {
            throw new Error("Password must be at least 6 characters");
        }

        // Check for existing user
        const existingUser = await User.findOne({
            $or: [{ emailId }, { username }]
        });
        if (existingUser) {
            throw new Error(
                existingUser.emailId === emailId 
                    ? "Email already registered" 
                    : "Username already taken"
            );
        }

        // Create new user
        const user = new User({
            username,
            emailId,
            password, // In a real app, hash the password before saving
            avatar: avatar || "😊"
        });

        await user.save();

        // Create and send JWT token
        const token = jwt.sign({ "userId": user._id }, "#FUNxp@5#!");
        res.cookie("usertoken", token, {
            maxAge: 7 * 24 * 60 * 60 * 1000,
            path: "/",
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: "lax"
        });

        res.json({ "success": true });
    } catch (err) {
        res.status(400).json({
            "success": false,
            "ERROR": err.message
        });
    }
});

app.use("/login", async (req, res) => {
    const { emailId, password } = req.body;
    
    try {
        // Input validation
        if (!emailId || !password) {
            throw new Error("Email and password are required");
        }

        // Find user and include username and avatar in the response
        const user = await User.findOne({ emailId });
        if (!user) {
            throw new Error("Invalid email or password");
        }
        if (password !== user.password) { // In a real app, compare hashed passwords
            throw new Error("Invalid email or password");
        }

        const token = jwt.sign({ "userId": user._id }, "#FUNxp@5#!");
        res.cookie("usertoken", token, {
            maxAge: 7 * 24 * 60 * 60 * 1000,
            path: "/",
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: "lax"
        });
        
        res.json({
            "success": true,
            "username": user.username,
            "avatar": user.avatar
        });
    } catch (err) {
        res.status(401).json({
            "success": false,
            "ERROR": err.message
        });
    }
});

app.use("/logout",(req,res) =>{
    res.cookie("usertoken",null,{
        maxAge:0
    });

    res.json({"success":true});
});

app.use("/home",userAuth,(req,res)=>{
    res.sendFile(path.join(__dirname,"..","Frontend","index_2.html"));
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

const PORT = process.env.PORT || 80;
connectDB()
    .then(() =>{
    server.listen(PORT, ()=>{
        console.log("The server is listenting on port "+PORT);
    });
})

