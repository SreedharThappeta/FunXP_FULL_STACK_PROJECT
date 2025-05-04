const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// Serve static files from the 'public' folder
app.use(express.static(path.join(__dirname, 'public')));

let players = {}; // Track connected players
let gameState = {
  board: Array(9).fill(''),
  currentPlayer: 'X',
  playersConnected: 0
};

// Handle socket connections
io.on('connection', (socket) => {
  console.log('Player connected:', socket.id);

  // Assign player X or O
  if (gameState.playersConnected < 2) {
    gameState.playersConnected++;
    players[socket.id] = gameState.playersConnected === 1 ? 'X' : 'O';
    socket.emit('playerAssignment', { player: players[socket.id], board: gameState.board });
    io.emit('gameStatus', `${gameState.playersConnected} player(s) connected`);
  } else {
    socket.emit('gameStatus', 'Game is full!');
    socket.disconnect();
    return;
  }

  // Handle player moves
  socket.on('move', (data) => {
    if (players[socket.id] === gameState.currentPlayer && !gameState.board[data.index]) {
      gameState.board[data.index] = gameState.currentPlayer;
      gameState.currentPlayer = gameState.currentPlayer === 'X' ? 'O' : 'X';
      io.emit('move', { index: data.index, player: players[socket.id], currentPlayer: gameState.currentPlayer });
      checkGameEnd();
    }
  });

  // Handle disconnects
  socket.on('disconnect', () => {
    console.log('Player disconnected:', socket.id);
    delete players[socket.id];
    gameState.playersConnected--;
    io.emit('gameStatus', 'A player disconnected. Waiting for another player...');
    resetGame();
  });
});

// Check for win or draw
function checkGameEnd() {
  const wins = [
    [0, 1, 2], [3, 4, 5], [6, 7, 8], // Rows
    [0, 3, 6], [1, 4, 7], [2, 5, 8], // Columns
    [0, 4, 8], [2, 4, 6]             // Diagonals
  ];
  for (let [a, b, c] of wins) {
    if (gameState.board[a] && gameState.board[a] === gameState.board[b] && gameState.board[a] === gameState.board[c]) {
      io.emit('gameEnd', `${gameState.board[a]} wins!`);
      resetGame();
      return;
    }
  }
  if (!gameState.board.includes('')) {
    io.emit('gameEnd', 'Draw!');
    resetGame();
  }
}

// Reset the game state
function resetGame() {
  gameState.board = Array(9).fill('');
  gameState.currentPlayer = 'X';
  io.emit('reset', gameState);
}

server.listen(3003, () => console.log('Server running on http://localhost:3000'));