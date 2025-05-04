const socket = io();
let board = null;
let game = new Chess();
let gameId = localStorage.getItem('gameId');
let playerColor = localStorage.getItem('playerColor');
let isMyTurn = playerColor === 'white';

// Display game information
document.getElementById('gameId').textContent = gameId;
document.getElementById('playerColor').textContent = playerColor;

// Initialize the board
function initializeBoard() {
    const config = {
        draggable: true,
        position: 'start',
        orientation: playerColor,
        onDragStart: onDragStart,
        onDrop: onDrop,
        onSnapEnd: onSnapEnd,
        pieceTheme: 'https://chessboardjs.com/img/chesspieces/wikipedia/{piece}.png'
    };
    board = Chessboard('board', config);
    updateStatus();
}

// Handle the start of a drag
function onDragStart(source, piece) {
    // Don't allow piece movement if the game is over or if it's not your turn
    if (game.game_over() || !isMyTurn || 
        (game.turn() === 'w' && piece.search(/^b/) !== -1) ||
        (game.turn() === 'b' && piece.search(/^w/) !== -1) ||
        (game.turn() === 'w' && playerColor === 'black') ||
        (game.turn() === 'b' && playerColor === 'white')) {
        return false;
    }
}

// Handle the dropping of a piece
function onDrop(source, target) {
    const move = game.move({
        from: source,
        to: target,
        promotion: 'q'
    });

    if (move === null) return 'snapback';

    socket.emit('move', {
        gameId: gameId,
        move: move,
        board: game.fen()
    });

    isMyTurn = false;
    updateStatus();
}

// Update board position after piece snap
function onSnapEnd() {
    board.position(game.fen());
}

// Update the game status
function updateStatus() {
    let status = '';
    let moveColor = game.turn() === 'b' ? 'Black' : 'White';

    if (game.in_checkmate()) {
        status = `Game over, ${moveColor} is in checkmate.`;
    } else if (game.in_draw()) {
        status = 'Game over, drawn position';
    } else {
        status = `${moveColor} to move`;
        if (game.in_check()) {
            status += `, ${moveColor} is in check`;
        }
    }

    $('#game-status').html(status);
    $('#player-turn').html(isMyTurn ? 'Your turn' : "Opponent's turn");
}

// Handle opponent's move
socket.on('move', function(msg) {
    game.move(msg.move);
    board.position(game.fen());
    isMyTurn = true;
    updateStatus();
});

// Handle game over events
socket.on('gameOver', function(msg) {
    alert(msg);
    game.reset();
    board.start();
});

// Handle draw offers
document.getElementById('drawBtn').addEventListener('click', () => {
    socket.emit('drawOffer', gameId);
});

socket.on('drawOffer', () => {
    if (confirm('Your opponent offers a draw. Accept?')) {
        socket.emit('drawAccepted', gameId);
    } else {
        socket.emit('drawDeclined', gameId);
    }
});

socket.on('drawResponse', (accepted) => {
    alert(accepted ? 'Draw offer accepted. Game is a draw!' : 'Draw offer declined.');
    if (accepted) {
        game.reset();
        board.start();
    }
});

// Handle resignation
document.getElementById('resignBtn').addEventListener('click', () => {
    if (confirm('Are you sure you want to resign?')) {
        socket.emit('resign', gameId);
        alert('You resigned. Game over!');
        game.reset();
        board.start();
    }
});

socket.on('opponentResigned', () => {
    alert('Your opponent resigned. You win!');
    game.reset();
    board.start();
});

// Join the game room
socket.emit('joinGameRoom', gameId);

// Initialize the board when the page loads
$(document).ready(initializeBoard);