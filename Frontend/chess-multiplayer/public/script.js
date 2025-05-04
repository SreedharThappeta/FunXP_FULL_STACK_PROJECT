// Ensure Chess is available
if (typeof Chess === 'undefined') {
    console.error('Chess.js is not loaded properly!');
    throw new Error('Chess.js is required');
}

let board = null;
let game = new Chess();
let $status = $('#game-status');
let $playerTurn = $('#player-turn');
let whiteCaptures = [];
let blackCaptures = [];

// Initialize the board
function initializeBoard() {
    const config = {
        draggable: true,
        position: 'start',
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
    // Don't allow piece movement if the game is over
    if (game.game_over()) return false;

    // Only allow the current player to move their pieces
    if ((game.turn() === 'w' && piece.search(/^b/) !== -1) ||
        (game.turn() === 'b' && piece.search(/^w/) !== -1)) {
        return false;
    }
}

// Handle the dropping of a piece
function onDrop(source, target) {
    // Check if the move is legal
    const move = game.move({
        from: source,
        to: target,
        promotion: 'q' // Always promote to queen for simplicity
    });

    // If illegal move, snap piece back
    if (move === null) return 'snapback';

    // Check if a piece was captured
    if (move.captured) {
        if (move.color === 'w') {
            blackCaptures.push(move.captured);
        } else {
            whiteCaptures.push(move.captured);
        }
        updateCapturedPieces();
    }

    updateStatus();
}

// Update board position after the piece snap animation
function onSnapEnd() {
    board.position(game.fen());
}

// Update the game status
function updateStatus() {
    let status = '';
    let moveColor = game.turn() === 'b' ? 'Black' : 'White';

    // Checkmate?
    if (game.in_checkmate()) {
        status = `Game over, ${moveColor} is in checkmate.`;
    }
    // Draw?
    else if (game.in_draw()) {
        status = 'Game over, drawn position';
    }
    // Game still on
    else {
        status = `${moveColor} to move`;
        // Check?
        if (game.in_check()) {
            status += `, ${moveColor} is in check`;
        }
    }

    $status.html(status);
    $playerTurn.html(`${moveColor}'s Turn`);
}

// Update the display of captured pieces
function updateCapturedPieces() {
    $('.white-captured span').text(whiteCaptures.join(' '));
    $('.black-captured span').text(blackCaptures.join(' '));
}

// Handle the New Game button
$('#startBtn').on('click', () => {
    game = new Chess();
    whiteCaptures = [];
    blackCaptures = [];
    updateCapturedPieces();
    board.start();
    updateStatus();
});

// Handle the Undo Move button
$('#undoBtn').on('click', () => {
    const move = game.undo();
    if (move) {
        // If a piece was captured, remove it from captures
        if (move.captured) {
            if (move.color === 'w') {
                blackCaptures.pop();
            } else {
                whiteCaptures.pop();
            }
            updateCapturedPieces();
        }
        board.position(game.fen());
        updateStatus();
    }
});

// Initialize the game when the page loads
$(document).ready(initializeBoard);
