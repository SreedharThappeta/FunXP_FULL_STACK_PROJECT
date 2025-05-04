const socket = io();
let myPlayer = null;

const board = document.getElementById('board');
const status = document.getElementById('status');
const cells = document.querySelectorAll('.cell');

// Assign player and initial board state
socket.on('playerAssignment', (data) => {
  myPlayer = data.player;
  data.board.forEach((value, index) => cells[index].textContent = value);
  status.textContent = `You are ${myPlayer}. ${myPlayer === 'X' ? 'Your turn!' : 'Waiting for X...'}`;
});

// Update board on move
socket.on('move', (data) => {
  cells[data.index].textContent = data.player;
  status.textContent = `Turn: ${data.currentPlayer}`;
});

// Game status updates
socket.on('gameStatus', (msg) => {
  status.textContent = msg;
});

// Game end notification
socket.on('gameEnd', (msg) => {
  status.textContent = msg;
  board.style.pointerEvents = 'none'; // Disable clicks
});

// Reset game
socket.on('reset', (gameState) => {
  gameState.board.forEach((value, index) => cells[index].textContent = value);
  board.style.pointerEvents = 'auto';
  status.textContent = `You are ${myPlayer}. ${myPlayer === 'X' ? 'Your turn!' : 'Waiting for X...'}`;
});

// Handle cell clicks
cells.forEach(cell => {
  cell.addEventListener('click', () => {
    const index = cell.getAttribute('data-index');
    socket.emit('move', { index: parseInt(index) });
  });
});