const express = require('express');
const path = require('path');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);
const { v4: uuidv4 } = require('uuid');

// Game rooms storage
const games = new Map();

// Serve static files from public directory
app.use(express.static('public'));

// Socket.IO connection handling
io.on('connection', (socket) => {
    console.log('User connected');

    // Create a new game
    socket.on('createGame', () => {
        const gameId = uuidv4().substring(0, 8);
        games.set(gameId, {
            white: socket.id,
            black: null,
            moves: []
        });
        socket.join(gameId);
        socket.emit('gameCreated', gameId);
    });

    // Join an existing game
    socket.on('joinGame', (gameId) => {
        const game = games.get(gameId);
        if (!game) {
            socket.emit('error', 'Game not found');
            return;
        }
        if (game.black) {
            socket.emit('error', 'Game is full');
            return;
        }
        
        game.black = socket.id;
        socket.join(gameId);
        socket.emit('gameJoined', gameId);
        io.to(game.white).emit('gameStart');
    });

    // Join game room (for reconnection)
    socket.on('joinGameRoom', (gameId) => {
        if (games.has(gameId)) {
            socket.join(gameId);
        }
    });

    // Handle moves
    socket.on('move', ({ gameId, move, board }) => {
        socket.to(gameId).emit('move', { move, board });
    });

    // Handle draw offers
    socket.on('drawOffer', (gameId) => {
        socket.to(gameId).emit('drawOffer');
    });

    socket.on('drawAccepted', (gameId) => {
        io.to(gameId).emit('drawResponse', true);
    });

    socket.on('drawDeclined', (gameId) => {
        io.to(gameId).emit('drawResponse', false);
    });

    // Handle resignation
    socket.on('resign', (gameId) => {
        socket.to(gameId).emit('opponentResigned');
    });

    // Handle disconnection
    socket.on('disconnect', () => {
        console.log('User disconnected');
    });
});

const PORT = process.env.PORT || 3002;
http.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
