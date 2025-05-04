document.addEventListener('DOMContentLoaded', function() {
    const gameBoard = document.getElementById('game-board');
    const turnIndicator = document.getElementById('turn-indicator');
    const captureCount = document.getElementById('capture-count');
    const resetBtn = document.getElementById('reset-btn');
    const gameOverDiv = document.getElementById('game-over');
    const winnerMessage = document.getElementById('winner-message');

    const socket = io();
    let playerRole = null;

    // Role selection
    const roleSelect = document.getElementById('role-select');
    const waitingMessage = document.getElementById('waiting-message');

    // Make game board initially hidden
    gameBoard.classList.add('hidden');

    // Make selectRole function globally accessible
    window.selectRole = function(role) {
        socket.emit('select-role', role);
    }

    socket.on('role-assigned', (role) => {
        playerRole = role;
        roleSelect.classList.add('hidden');
        waitingMessage.textContent = 'Waiting for other player...';
        waitingMessage.classList.remove('hidden');
    });

    socket.on('role-taken', () => {
        alert('This role is already taken. Please choose another.');
    });

    socket.on('players-status', (status) => {
        updatePlayersStatus(status);
    });

    socket.on('game-start', () => {
        waitingMessage.classList.add('hidden');
        gameBoard.classList.remove('hidden');
    });

    socket.on('game-updated', (newState) => {
        window.gameState = newState;
        updateUI(newState);
    });

    let selectedPiece = null;
    let possibleMoves = [];

    // Create the game board cells
    for (let i = 0; i < 25; i++) {
        const cell = document.createElement('div');
        cell.className = 'cell';
        cell.dataset.index = i;
        cell.addEventListener('click', handleCellClick);
        gameBoard.appendChild(cell);
    }

    // Initialize game
    fetchGameState();

    // Reset game button
    resetBtn.addEventListener('click', resetGame);

    // Handle cell click
    function handleCellClick(event) {
        // Get the cell element (handle clicks on pieces too)
        const cell = event.target.closest('.cell');
        if (!cell) return;
        
        const index = parseInt(cell.dataset.index);
        
        // If a piece is selected and this is a possible move
        const isPossibleMove = possibleMoves.some(move => move.to === index);
        if (selectedPiece && isPossibleMove) {
            const move = possibleMoves.find(move => move.to === index);
            makeMove(move);
            return;
        }

        // Otherwise, select a piece
        selectPiece(index);
    }

    // Select a piece
    function selectPiece(index) {
        if (!playerRole) return;
        if ((playerRole === 'tigers' && window.gameState.turn !== 'tigers') ||
            (playerRole === 'goats' && window.gameState.turn !== 'goats')) {
            return;
        }

        // Clear previous selection
        clearSelection();

        // Check if there's a piece at this position
        fetch('/game-state')
            .then(response => response.json())
            .then(gameState => {
                // During goat placement phase, any empty cell is a valid move
                if (gameState.turn === 'goats' && gameState.goatsToPlace > 0) {
                    if (!gameState.board[index]) {
                        possibleMoves = [{ from: -1, to: index }];
                        const cell = document.querySelector(`.cell[data-index="${index}"]`);
                        cell.classList.add('possible-move');
                        makeMove(possibleMoves[0]);
                        return;
                    }
                    return;
                }

                const piece = gameState.board[index];
                if (!piece) return;

                // Check if it's the correct turn
                if ((piece.type === 'goat' && gameState.turn !== 'goats') || 
                    (piece.type === 'tiger' && gameState.turn !== 'tigers')) {
                    return;
                }

                // Highlight selected piece
                const cell = document.querySelector(`.cell[data-index="${index}"]`);
                cell.classList.add('selected');
                selectedPiece = { type: piece.type, id: piece.id, position: index };

                // Get possible moves
                if (piece.type === 'tiger') {
                    // For tigers, get both moves and captures
                    const moves = getValidMoves(index);
                    const captures = getValidCaptures(index);
                    
                    possibleMoves = [
                        ...moves.map(to => ({ from: index, to })),
                        ...captures
                    ];
                } else {
                    // For goats, just get moves
                    possibleMoves = getValidMoves(index).map(to => ({ from: index, to }));
                }

                // Highlight possible moves
                possibleMoves.forEach(move => {
                    const cell = document.querySelector(`.cell[data-index="${move.to}"]`);
                    if (cell) cell.classList.add('possible-move');
                });
            });
    }

    // Clear selection
    function clearSelection() {
        document.querySelectorAll('.selected').forEach(el => el.classList.remove('selected'));
        document.querySelectorAll('.possible-move').forEach(el => el.classList.remove('possible-move'));
        selectedPiece = null;
        possibleMoves = [];
    }

    // Get valid moves for a position (client-side for responsiveness)
    function getValidMoves(position) {
        const moves = [];
        const { row, col } = indexToCoords(position);

        // Check all adjacent positions
        for (const [dr, dc] of adjacentPositions) {
            const newRow = row + dr;
            const newCol = col + dc;
            
            if (isValidPosition(newRow, newCol)) {
                const newIndex = coordsToIndex(newRow, newCol);
                moves.push(newIndex);
            }
        }

        return moves;
    }

    // Get valid captures for a tiger (client-side for responsiveness)
    function getValidCaptures(position) {
        const captures = [];
        const { row, col } = indexToCoords(position);

        // Check all possible jumps
        for (const [dr, dc] of adjacentPositions) {
            const midRow = row + dr;
            const midCol = col + dc;
            const jumpRow = row + 2 * dr;
            const jumpCol = col + 2 * dc;

            if (isValidPosition(midRow, midCol) && isValidPosition(jumpRow, jumpCol)) {
                const midIndex = coordsToIndex(midRow, midCol);
                const jumpIndex = coordsToIndex(jumpRow, jumpCol);
                captures.push({
                    from: position,
                    to: jumpIndex,
                    capturedGoat: midIndex
                });
            }
        }

        return captures;
    }

    // Make a move
    function makeMove(move) {
        let endpoint, body;

        if (!window.gameState) {
            console.error('Game state not loaded');
            return;
        }

        if (window.gameState.turn === 'goats' && window.gameState.goatsToPlace > 0) {
            endpoint = '/place-goat';
            body = { position: move.to };
        } else if (selectedPiece) {
            if (selectedPiece.type === 'tiger') {
                endpoint = '/move-tiger';
                body = { tigerId: selectedPiece.id, toPosition: move.to };
            } else {
                endpoint = '/move-goat';
                body = { goatId: selectedPiece.id, toPosition: move.to };
            }
        } else {
            return;
        }

        fetch(endpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(body),
        })
        .then(response => {
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            return response.json();
        })
        .then(data => {
            if (data.valid) {
                fetchGameState();
            } else {
                alert(data.message || 'Invalid move');
            }
        })
        .catch(error => {
            console.error('Error:', error);
            alert('An error occurred. Please try again.');
        });
    }

    // Update the UI with current game state
    function updateUI(gameState) {
        // Update board
        const cells = document.querySelectorAll('.cell');
        cells.forEach((cell, index) => {
            cell.innerHTML = '';
            const piece = gameState.board[index];
            
            if (piece) {
                const pieceDiv = document.createElement('div');
                pieceDiv.className = `piece ${piece.type}`;
                pieceDiv.textContent = piece.type === 'tiger' ? 'T' : 'G';
                cell.appendChild(pieceDiv);
            }
        });

        // Update player indicators
        const players = document.querySelectorAll('.player');
        players.forEach(p => p.classList.remove('active'));
        if (gameState.turn === 'tigers') {
            players[0].classList.add('active');
        } else {
            players[1].classList.add('active');
        }

        // Update game info
        const totalCaptures = gameState.tigers.reduce((sum, tiger) => sum + tiger.capturedGoats, 0);
        captureCount.textContent = `Tigers captured: ${totalCaptures} goats`;

        if (gameState.goatsToPlace > 0) {
            turnIndicator.textContent = `Player 2's Turn (Place goats: ${gameState.goatsToPlace} left)`;
        } else {
            const currentPlayer = gameState.turn === 'tigers' ? 'Player 1' : 'Player 2';
            turnIndicator.textContent = `${currentPlayer}'s Turn`;
        }

        // Check if game is over
        if (gameState.gameOver) {
            endGame(gameState.winner);
        }
    }

    // Fetch current game state from server
    function fetchGameState() {
        fetch('/game-state')
            .then(response => response.json())
            .then(data => {
                window.gameState = data; // Store for client-side checks
                updateUI(data);
                clearSelection();
            })
            .catch(error => {
                console.error('Error:', error);
            });
    }

    // Reset the game
    function resetGame() {
        fetch('/reset-game', {
            method: 'POST',
        })
        .then(response => response.json())
        .then(data => {
            updateUI(data);
            gameOverDiv.classList.add('hidden');
        })
        .catch(error => {
            console.error('Error:', error);
        });
    }

    // Handle game over
    function endGame(winner) {
        const playerWon = winner === 'tigers' ? 'Player 1' : 'Player 2';
        const message = winner === 'tigers' 
            ? `${playerWon} (Tigers) wins! They captured enough goats.` 
            : `${playerWon} (Goats) wins! They blocked all tigers.`;
        
        winnerMessage.textContent = message;
        gameOverDiv.classList.remove('hidden');
    }

    // Helper functions for coordinate conversion
    function indexToCoords(index) {
        return {
            row: Math.floor(index / 5),
            col: index % 5
        };
    }

    function coordsToIndex(row, col) {
        return row * 5 + col;
    }

    function isValidPosition(row, col) {
        return row >= 0 && row < 5 && col >= 0 && col < 5;
    }

    // Adjacent positions (for move calculations)
    const adjacentPositions = [
        [-1, -1], [-1, 0], [-1, 1],
        [0, -1],           [0, 1],
        [1, -1],  [1, 0], [1, 1]
    ];

    // Add function to update players status
    function updatePlayersStatus(status) {
        const players = document.querySelectorAll('.player');
        if (status.tigers) {
            players[0].classList.add('connected');
        } else {
            players[0].classList.remove('connected');
        }
        if (status.goats) {
            players[1].classList.add('connected');
        } else {
            players[1].classList.remove('connected');
        }
    }
});