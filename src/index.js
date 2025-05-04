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

app.get("/users/:userId", userAuth, async (req, res) => {
    try {
        const user = await User.findById(req.params.userId).select('username avatar');
        if (!user) {
            throw new Error("User not found");
        }
        res.json({ success: true, user });
    } catch (err) {
        res.status(404).json({ success: false, error: err.message });
    }
});

app.get("/me", userAuth, (req, res) => {
    res.json({ 
        success: true, 
        userId: req.user._id,
        username: req.user.username,
        avatar: req.user.avatar
    });
});

app.post("/me/update", userAuth, async (req, res) => {
    try {
        const { username, avatar } = req.body;
        
        // Validate username
        if (!username || username.length < 3 || username.length > 30) {
            throw new Error("Username must be between 3 and 30 characters");
        }

        // Check if username is taken by another user
        const existingUser = await User.findOne({
            username,
            _id: { $ne: req.user._id }
        });
        if (existingUser) {
            throw new Error("Username already taken");
        }

        // Update user
        req.user.username = username;
        req.user.avatar = avatar;
        await req.user.save();

        res.json({
            success: true,
            username: req.user.username,
            avatar: req.user.avatar
        });
    } catch (err) {
        res.status(400).json({
            success: false,
            error: err.message
        });
    }
});

// Import and use routes
const friendRoutes = require("./routes/friendRoutes.js");
const chatRoutes = require("./routes/chatRoutes.js");
const statsRoutes = require("./routes/statsRoutes.js");

app.use("/friends", friendRoutes);
app.use("/chat", chatRoutes);
app.use("/stats", statsRoutes);


    //         if (!games.has(gameId)) {
    //             games.set(gameId, {
    //                 players: new Set(),
    //                 boards: new Map(),
    //                 ready: new Set(),
    //                 calledNumbers: new Set(),
    //                 currentTurn: null,
    //                 gameStarted: false,
    //                 creator: game.createdBy
    //             });
    //         }

    //         const gameState = games.get(gameId);
    //         gameState.players.add(userId);

    //         const user = await User.findById(userId);
    //         io.to(gameId).emit('playerJoined', {
    //             players: Array.from(gameState.players),
    //             username: user.username
    //         });

    //     } catch (error) {
    //         socket.emit('error', { message: error.message });
    //     }
    // });

    // socket.on('playerReady', async ({ gameId, board }) => {
    //     try {
    //         const gameState = games.get(gameId);
    //         if (!gameState) throw new Error('Game not found');

    //         // Validate board
    //         const numbers = new Set(board.flat().filter(n => n));
    //         if (numbers.size !== 25 || ![...numbers].every(n => n >= 1 && n <= 25)) {
    //             throw new Error('Invalid board');
    //         }

    //         gameState.boards.set(socket.userId, board);
    //         gameState.ready.add(socket.userId);

    //         io.to(gameId).emit('playerReady', { userId: socket.userId });

    //         // Start game if all players are ready
    //         if (gameState.ready.size === gameState.players.size && gameState.players.size >= 2) {
    //             gameState.gameStarted = true;
    //             gameState.currentTurn = gameState.creator;
    //             io.to(gameId).emit('gameStart', { currentTurn: gameState.currentTurn });
    //         }

    //     } catch (error) {
    //         socket.emit('error', { message: error.message });
    //     }
    // });

    // socket.on('callNumber', async ({ gameId, number }) => {
    //     try {
    //         const gameState = games.get(gameId);
    //         if (!gameState || !gameState.gameStarted) 
    //             throw new Error('Game not started');

    //         if (gameState.currentTurn !== socket.userId)
    //             throw new Error('Not your turn');

    //         if (gameState.calledNumbers.has(number))
    //             throw new Error('Number already called');

    //         if (number < 1 || number > 25)
    //             throw new Error('Invalid number');

    //         gameState.calledNumbers.add(number);

    //         // Update turn
    //         const players = Array.from(gameState.players);
    //         const currentIndex = players.indexOf(gameState.currentTurn);
    //         const nextTurn = players[(currentIndex + 1) % players.length];
    //         gameState.currentTurn = nextTurn;

    //         io.to(gameId).emit('numberCalled', { number, nextTurn });

    //     } catch (error) {
    //         socket.emit('error', { message: error.message });
    //     }
    // });

    // socket.on('bingoClaim', async ({ gameId, board }) => {
    //     try {
    //         const gameState = games.get(gameId);
    //         if (!gameState || !gameState.gameStarted) 
    //             throw new Error('Game not started');

    //         // Verify win condition
    //         if (validateBingoWin(board, gameState.calledNumbers)) {
    //             // Update game in database
    //             await Game.findByIdAndUpdate(gameId, {
    //                 state: 'completed',
    //                 winner: socket.userId,
    //                 endedAt: new Date()
    //             });

    //             io.to(gameId).emit('gameWon', { winnerId: socket.userId });
    //             games.delete(gameId);
    //         }
    //     } catch (error) {
    //         socket.emit('error', { message: error.message });
    //     }
    // });

    // socket.on('gameChat', ({ gameId, message }) => {
    //     io.to(gameId).emit('chatMessage', {
    //         userId: socket.userId,
    //         message
    //     });
    // });

//     socket.on('disconnect', () => {
//         for (const [gameId, gameState] of games.entries()) {
//             if (gameState.players.has(socket.userId)) {
//                 gameState.players.delete(socket.userId);
//                 gameState.ready.delete(socket.userId);
//                 gameState.boards.delete(socket.userId);
                
//                 if (gameState.players.size === 0) {
//                     games.delete(gameId);
//                 } else {
//                     io.to(gameId).emit('playerLeft', {
//                         userId: socket.userId,
//                         players: Array.from(gameState.players)
//                     });
//                 }
//             }
//         }
//     });
// });



// const activeGames = new Map();
// const playerGameMap = new Map();

io.on("connection", (socket) => {
    console.log("A user connected:", socket.id);

    // Handle chat connections
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

app.use("/profile", userAuth, (req,res) => {
    res.sendFile(path.join(__dirname,"..","Frontend","profile.html"));
});

// app.use("/Bingo/:gameId/winner", userAuth, async (req,res) => {
//     try {
//         const game = await Game.findById(req.params.gameId);
//         if (!game || game.state !== 'playing') {
//             return res.json({"success": false, "message": "Invalid game state"});
//         }

//         // Validate that all called numbers match the strikes
//         if (req.body.strikes.length === game.data.length) {
//             const strikeSet = new Set(req.body.strikes);
//             const calledNumbers = game.data.map(num => -1 * num);
//             const isValid = calledNumbers.every(num => strikeSet.has(num));
            
//             if (isValid) {
//                 // Update winner's stats
//                 const winnerId = req.user._id;
//                 const loserId = game.players.find(id => id.toString() !== winnerId.toString());
                
//                 // Update winner stats
//                 const winner = await User.findById(winnerId);
//                 if (!winner.stats) {
//                     winner.stats = {
//                         gamesPlayed: 0,
//                         gamesWon: 0,
//                         gamesLost: 0,
//                         gamesTied: 0,
//                         winRate: 0,
//                         xp: 0,
//                         level: 1,
//                         gameHistory: []
//                     };
//                 }
                
//                 winner.stats.gamesPlayed += 1;
//                 winner.stats.gamesWon += 1;
//                 winner.stats.xp += 10;
//                 winner.stats.winRate = (winner.stats.gamesWon / winner.stats.gamesPlayed) * 100;
//                 winner.stats.level = Math.floor(winner.stats.xp / 100) + 1;
//                 winner.stats.gameHistory.push({
//                     gameType: 'Bingo',
//                     result: 'win',
//                     opponent: loserId,
//                     date: new Date()
//                 });
//                 await winner.save();

//                 // Update loser stats
//                 const loser = await User.findById(loserId);
//                 if (!loser.stats) {
//                     loser.stats = {
//                         gamesPlayed: 0,
//                         gamesWon: 0,
//                         gamesLost: 0,
//                         gamesTied: 0,
//                         winRate: 0,
//                         xp: 0,
//                         level: 1,
//                         gameHistory: []
//                     };
//                 }
                
//                 loser.stats.gamesPlayed += 1;
//                 loser.stats.gamesLost += 1;
//                 loser.stats.xp += 5;
//                 loser.stats.winRate = (loser.stats.gamesWon / loser.stats.gamesPlayed) * 100;
//                 loser.stats.level = Math.floor(loser.stats.xp / 100) + 1;
//                 loser.stats.gameHistory.push({
//                     gameType: 'Bingo',
//                     result: 'loss',
//                     opponent: winnerId,
//                     date: new Date()
//                 });
//                 await loser.save();

//                 // Mark game as finished and notify players
//                 game.state = 'finished';
//                 await game.save();

//                 io.to(req.params.gameId).emit("winner", {
//                     strikes: req.body.strikes, 
//                     winner: req.user._id
//                 });
                
//                 // Delete game after short delay to ensure notifications are sent
//                 setTimeout(async () => {
//                     await Game.findByIdAndDelete(req.params.gameId);
//                 }, 5000);
                
//                 return res.json({"success": true});
//             }
//         }
        
//         res.json({"success": false, "message": "Invalid win condition"});
//     } catch (error) {
//         console.error('Error in winner route:', error);
//         res.status(500).json({"success": false, "error": error.message});
//     }
// });

// app.post("/Bingo/:gameId/winner", userAuth, async (req, res) => {
//     try {
//         const game = await Game.findById(req.params.gameId);
//         if (!game) {
//             return res.status(404).json({ success: false, message: "Game not found" });
//         }

//         const { strikes } = req.body;
//         if (!Array.isArray(strikes) || strikes.length !== 5) {
//             return res.status(400).json({ success: false, message: "Invalid win claim" });
//         }

//         // Check if all numbers in strikes are actually called numbers (negated)
//         const calledNumbers = new Set(game.moves.map(m => -m)); // Negate called numbers to match
//         if (!strikes.every(num => calledNumbers.has(num))) {
//             return res.status(400).json({ 
//                 success: false, 
//                 message: "Win claim contains uncalled numbers" 
//             });
//         }

//         // Get player's board
//         const playerBoard = game.boards.find(b => 
//             b.playerId.toString() === req.user._id.toString()
//         );

//         if (!playerBoard) {
//             return res.status(400).json({ success: false, message: "Player board not found" });
//         }

//         // Verify numbers exist on player's board
//         const boardNumbers = new Set(playerBoard.numbers.flat());
//         if (!strikes.every(num => boardNumbers.has(Math.abs(num)))) {
//             return res.status(400).json({ 
//                 success: false, 
//                 message: "Win claim contains numbers not on your board" 
//             });
//         }

//         // Calculate XP gain (base 50 + 10 per opponent)
//         const xpGain = 50 + ((game.players.length - 1) * 10);
        
//         // Update game state
//         game.state = 'completed';
//         game.winner = req.user._id;
//         game.endedAt = new Date();
//         await game.save();

//         // Update user stats
//         await User.findByIdAndUpdate(req.user._id, {
//             $inc: { 
//                 xp: xpGain,
//                 gamesWon: 1,
//                 totalGames: 1
//             }
//         });

//         // Update other players' stats
//         const losers = game.players.filter(p => p.toString() !== req.user._id.toString());
//         await User.updateMany(
//             { _id: { $in: losers } },
//             { $inc: { totalGames: 1 } }
//         );

//         res.json({ 
//             success: true,
//             xpGain
//         });

//     } catch (error) {
//         console.error('Error validating winner:', error);
//         res.status(500).json({ success: false, message: error.message });
//     }
// });

// app.use("/Bingo/:gameId/start", userAuth, (req,res) => {
//     const sockedId = req.body.id;
//     const userId = req.user._id;
//     playerSocket[sockedId] = userId;
//     socketPlayer[userId] = sockedId;

//     res.json({"success":true});
// });

// app.get("/Bingo/:gameId/info", userAuth, async (req, res) => {
//     try {
//         const game = await Game.findById(req.params.gameId);
//         if (!game) {
//             return res.json({ success: false, message: "Game not found" });
//         }
//         res.json({
//             success: true,
//             createdBy: game.createdBy,
//             maxPlayers: game.maxPlayers,
//             state: game.state,
//             players: game.players
//         });
//     } catch (err) {
//         res.status(500).json({ success: false, error: err.message });
//     }
// });

// app.post("/Bingo/:gameId/join", userAuth, async (req, res) => {
//     try {
//         const game = await Game.findById(req.params.gameId);
//         if (!game) {
//             return res.json({ success: false, message: "Game not found" });
//         }

//         // Check if player is already in the game
//         const isPlayerInGame = game.players.some(playerId => playerId.toString() === req.user._id.toString());

//         if (game.state !== 'waiting') {
//             // If player is already in game, let them rejoin
//             if (isPlayerInGame) {
//                 // Update socket mappings
//                 if (req.body.socketId) {
//                     playerSocket[req.body.socketId] = req.user._id;
//                     socketPlayer[req.user._id] = req.body.socketId;
//                 }
//                 return res.json({ success: true, message: "Rejoined game" });
//             }
//             return res.json({ success: false, message: "Game already started" });
//         }

//         // For games in waiting state
//         if (!isPlayerInGame) {
//             if (game.players.length >= game.maxPlayers) {
//                 return res.json({ success: false, message: "Game is full" });
//             }
//             game.players.push(req.user._id);
//             await game.save();
            
//             // Notify other players
//             io.to(req.params.gameId).emit("playerJoined", game.players);
//         }

//         // Update socket mappings
//         if (req.body.socketId) {
//             playerSocket[req.body.socketId] = req.user._id;
//             socketPlayer[req.user._id] = req.body.socketId;
//         }

//         res.json({ success: true });
//     } catch (err) {
//         res.status(500).json({ success: false, error: err.message });
//     }
// });

// app.post("/Bingo/:gameId/board", userAuth, async (req, res) => {
//     try {
//         const game = await Game.findById(req.params.gameId);
//         if (!game) {
//             return res.status(404).json({ success: false, message: "Game not found" });
//         }

//         const { board } = req.body;
        
//         // Validate board structure
//         if (!Array.isArray(board) || board.length !== 5 || 
//             !board.every(row => Array.isArray(row) && row.length === 5)) {
//             return res.status(400).json({ 
//                 success: false, 
//                 message: "Invalid board format - must be 5x5 grid" 
//             });
//         }

//         // Validate numbers (1-75, no duplicates)
//         const numbers = new Set(board.flat());
//         if (numbers.size !== 25 || 
//             ![...numbers].every(n => Number.isInteger(n) && n >= 1 && n <= 75)) {
//             return res.status(400).json({ 
//                 success: false, 
//                 message: "Invalid numbers - must be unique integers from 1-75" 
//             });
//         }

//         // Store the board
//         const existingBoardIndex = game.boards.findIndex(b => 
//             b.playerId.toString() === req.user._id.toString()
//         );

//         if (existingBoardIndex >= 0) {
//             game.boards[existingBoardIndex].numbers = board;
//         } else {
//             game.boards.push({
//                 playerId: req.user._id,
//                 numbers: board
//             });
//         }

//         await game.save();
//         res.json({ success: true });
//     } catch (error) {
//         console.error('Error saving board:', error);
//         res.status(500).json({ success: false, message: error.message });
//     }
// });

// app.use("/Bingo/:gameId", userAuth, async (req, res) => {
//     try {     
//         const user = req.user;
//         const gameId = req.params.gameId;
//         const game = await Game.findById(gameId);

//         if (!game) {
//             return res.json({"message": "Game not found", "success": false});
//         }

//         if (game.state === 'finished') {
//             return res.json({"message": "Game already finished", "success": false});
//         }

//         // Check if player is already in the game
//         const isPlayerInGame = game.players.some(playerId => playerId.toString() === user._id.toString());

//         // If player is not in game and game is full, reject
//         if (!isPlayerInGame && game.players.length >= game.maxPlayers) {
//             return res.json({"message": "Game is full", "success": false});
//         }

//         // If player is not in game, add them
//         if (!isPlayerInGame) {
//             game.players.push(user._id);
//             await game.save();
//         }

//         res.sendFile(path.join(__dirname, "..", "Frontend", "Bingo.html"));
//     } catch(err) {
//         res.json({"message": "Game Error", "ERROR": err.message});
//     }
// });

// app.use("/Bingo", userAuth, async (req,res) => {
//     try {
//         const user = req.user;
//         const maxPlayers = req.body.maxPlayers || 2;

//         const bingo = new Game({
//             "GameName": "Bingo",
//             "createdBy": user._id,
//             "maxPlayers": maxPlayers,
//             "ready": 0,
//             "state": 'waiting',
//             "players": [user._id],
//             "data": []
//         });

//         await bingo.save();
//         res.json({"success": true, "gameId": bingo._id});
//     } catch (error) {
//         console.error('Error creating Bingo game:', error);
//         res.status(500).json({"success": false, "message": error.message});
//     }
// });

app.get("/MemoryGame", (req,res) => {
    res.sendFile(path.join(__dirname, "..", "Frontend","MemoryGame" ,"index.html"));
})

app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "..", "Frontend", "index.html"));
});

const PORT = process.env.PORT || 8080;
connectDB()
    .then(() =>{
    server.listen(PORT, ()=>{
        console.log("The server is listenting on port "+PORT);
    });
});

