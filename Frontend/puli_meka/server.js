// server.js
const express = require('express');
const path = require('path');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);
const port = 3001;

// Serve static files
app.use(express.static('public'));

app.use(express.json());

// Game state
let gameState = {
    board: Array(25).fill(null), // 5x5 board
    tigers: [
        { id: 1, position: 0, capturedGoats: 0 },
        { id: 2, position: 4, capturedGoats: 0 },
        { id: 3, position: 20, capturedGoats: 0 },
        { id: 4, position: 24, capturedGoats: 0 }
    ],
    goats: [],
    goatsToPlace: 20,
    turn: 'goats', // 'goats' or 'tigers'
    gameOver: false,
    winner: null
};

// Initialize board with tigers
gameState.tigers.forEach(tiger => {
    gameState.board[tiger.position] = { type: 'tiger', id: tiger.id };
});

// Possible moves (adjacent positions)
const adjacentPositions = [
    [-1, -1], [-1, 0], [-1, 1],
    [0, -1],           [0, 1],
    [1, -1],  [1, 0], [1, 1]
];

// Convert 1D index to 2D coordinates
function indexToCoords(index) {
    return {
        row: Math.floor(index / 5),
        col: index % 5
    };
}

// Convert 2D coordinates to 1D index
function coordsToIndex(row, col) {
    return row * 5 + col;
}

// Check if position is valid
function isValidPosition(row, col) {
    return row >= 0 && row < 5 && col >= 0 && col < 5;
}

// Get valid moves for a piece
function getValidMoves(position) {
    const { row, col } = indexToCoords(position);
    const moves = [];

    // Check all adjacent positions
    for (const [dr, dc] of adjacentPositions) {
        const newRow = row + dr;
        const newCol = col + dc;
        
        if (isValidPosition(newRow, newCol)) {
            const newIndex = coordsToIndex(newRow, newCol);
            if (gameState.board[newIndex] === null) {
                moves.push(newIndex);
            }
        }
    }

    return moves;
}

// Get valid captures for a tiger
function getValidCaptures(tiger) {
    const { row, col } = indexToCoords(tiger.position);
    const captures = [];

    // Check all possible jumps
    for (const [dr, dc] of adjacentPositions) {
        const midRow = row + dr;
        const midCol = col + dc;
        const jumpRow = row + 2 * dr;
        const jumpCol = col + 2 * dc;

        if (isValidPosition(midRow, midCol) && isValidPosition(jumpRow, jumpCol)) {
            const midIndex = coordsToIndex(midRow, midCol);
            const jumpIndex = coordsToIndex(jumpRow, jumpCol);

            // Check if there's a goat to capture and empty space to land
            if (gameState.board[midIndex]?.type === 'goat' && gameState.board[jumpIndex] === null) {
                captures.push({
                    from: tiger.position,
                    to: jumpIndex,
                    capturedGoat: midIndex
                });
            }
        }
    }

    return captures;
}

// Track connected players
let players = {
    tigers: null,
    goats: null
};

io.on('connection', (socket) => {
    console.log('Player connected:', socket.id);

    // Send initial players status
    socket.emit('players-status', {
        tigers: !!players.tigers,
        goats: !!players.goats
    });

    // Handle player role selection
    socket.on('select-role', (role) => {
        // Validate role
        if (!['tigers', 'goats'].includes(role)) {
            socket.emit('error', 'Invalid role selected');
            return;
        }

        // Check if player already has a role
        if (socket.role) {
            socket.emit('error', 'You already have a role');
            return;
        }

        if (!players[role]) {
            players[role] = socket.id;
            socket.role = role;
            socket.emit('role-assigned', role);
            
            // Notify all clients about player status
            io.emit('players-status', {
                tigers: !!players.tigers,
                goats: !!players.goats
            });

            // Start game if both players are connected
            if (players.tigers && players.goats) {
                resetGame(); // Reset game when both players connect
                io.emit('game-start');
            }
        } else {
            socket.emit('role-taken');
        }
    });

    // Handle disconnection
    socket.on('disconnect', () => {
        if (socket.role) {
            players[socket.role] = null;
            io.emit('players-status', {
                tigers: !!players.tigers,
                goats: !!players.goats
            });
        }
    });
});

// Place a goat
function placeGoat(position) {
    if (gameState.turn !== 'goats' || gameState.goatsToPlace <= 0 || gameState.board[position] !== null) {
        return { valid: false, message: 'Invalid move' };
    }

    const goatId = gameState.goats.length + 1;
    gameState.board[position] = { type: 'goat', id: goatId };
    gameState.goats.push({ id: goatId, position });
    gameState.goatsToPlace--;
    
    // Switch turn only after all goats are placed
    if (gameState.goatsToPlace === 0) {
        gameState.turn = 'tigers';
    }

    io.emit('game-updated', gameState);
    return { valid: true };
}

// Move a tiger
function moveTiger(tigerId, toPosition) {
    if (gameState.turn !== 'tigers') {
        return { valid: false, message: "Not tigers' turn" };
    }

    const tiger = gameState.tigers.find(t => t.id === tigerId);
    if (!tiger) {
        return { valid: false, message: 'Tiger not found' };
    }

    // Check if it's a valid move or capture
    const validMoves = getValidMoves(tiger.position);
    const validCaptures = getValidCaptures(tiger);

    const isMove = validMoves.includes(toPosition);
    const capture = validCaptures.find(c => c.to === toPosition);

    if (!isMove && !capture) {
        return { valid: false, message: 'Invalid move for tiger' };
    }

    // Perform the move
    gameState.board[tiger.position] = null;
    gameState.board[toPosition] = { type: 'tiger', id: tiger.id };
    tiger.position = toPosition;

    // Handle capture if applicable
    if (capture) {
        const goatIndex = gameState.goats.findIndex(g => g.position === capture.capturedGoat);
        if (goatIndex !== -1) {
            gameState.goats.splice(goatIndex, 1);
            gameState.board[capture.capturedGoat] = null;
            tiger.capturedGoats++;
        }
    }

    // Check win conditions
    if (gameState.goats.length <= 5) {
        gameState.gameOver = true;
        gameState.winner = 'tigers';
    } else if (gameState.tigers.every(t => getValidMoves(t.position).length === 0 && getValidCaptures(t).length === 0)) {
        gameState.gameOver = true;
        gameState.winner = 'goats';
    } else {
        // Switch turn if no capture was made
        if (!capture) {
            gameState.turn = 'goats';
        }
    }

    io.emit('game-updated', gameState);
    return { valid: true, captured: !!capture };
}

// Move a goat (after all are placed)
function moveGoat(goatId, toPosition) {
    if (gameState.turn !== 'goats' || gameState.goatsToPlace > 0) {
        return { valid: false, message: "Not goats' turn or still placing goats" };
    }

    const goat = gameState.goats.find(g => g.id === goatId);
    if (!goat) {
        return { valid: false, message: 'Goat not found' };
    }

    const validMoves = getValidMoves(goat.position);
    if (!validMoves.includes(toPosition)) {
        return { valid: false, message: 'Invalid move for goat' };
    }

    // Perform the move
    gameState.board[goat.position] = null;
    gameState.board[toPosition] = { type: 'goat', id: goat.id };
    goat.position = toPosition;

    // Switch turn
    gameState.turn = 'tigers';

    io.emit('game-updated', gameState);
    return { valid: true };
}

// Reset game
function resetGame() {
    gameState = {
        board: Array(25).fill(null),
        tigers: [
            { id: 1, position: 0, capturedGoats: 0 },
            { id: 2, position: 4, capturedGoats: 0 },
            { id: 3, position: 20, capturedGoats: 0 },
            { id: 4, position: 24, capturedGoats: 0 }
        ],
        goats: [],
        goatsToPlace: 20,
        turn: 'goats',
        gameOver: false,
        winner: null
    };

    // Initialize board with tigers
    gameState.tigers.forEach(tiger => {
        gameState.board[tiger.position] = { type: 'tiger', id: tiger.id };
    });

    io.emit('game-updated', gameState);
}

// API endpoints
app.get('/game-state', (req, res) => {
    res.json(gameState);
});

app.post('/place-goat', (req, res) => {
    const { position } = req.body;
    if (typeof position !== 'number' || position < 0 || position >= 25) {
        return res.status(400).json({ valid: false, message: 'Invalid position' });
    }
    const result = placeGoat(position);
    res.json(result);
});

app.post('/move-tiger', (req, res) => {
    const { tigerId, toPosition } = req.body;
    if (typeof toPosition !== 'number' || toPosition < 0 || toPosition >= 25) {
        return res.status(400).json({ valid: false, message: 'Invalid position' });
    }
    const result = moveTiger(tigerId, toPosition);
    res.json(result);
});

app.post('/move-goat', (req, res) => {
    const { goatId, toPosition } = req.body;
    if (typeof toPosition !== 'number' || toPosition < 0 || toPosition >= 25) {
        return res.status(400).json({ valid: false, message: 'Invalid position' });
    }
    const result = moveGoat(goatId, toPosition);
    res.json(result);
});

app.post('/reset-game', (req, res) => {
    resetGame();
    res.json(gameState);
});

// Serve the HTML file
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

http.listen(port, () => {
    console.log(`Puli Meka game running at http://localhost:${port}`);
});