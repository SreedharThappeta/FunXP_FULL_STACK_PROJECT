var errors = 0;
var player1Score = 0;
var player2Score = 0;
var currentPlayer = 1; // 1 for Player 1, 2 for Player 2
var matchedPairs = 0;
var totalPairs = 10; // Since we have 10 pairs (20 cards)
var gameStartTime;
var timerInterval;
var gameActive = true;

var cardList = [
    "darkness",
    "double",
    "fairy",
    "fighting",
    "fire",
    "grass",
    "lightning",
    "metal",
    "psychic",
    "water"
]

var cardSet;
var board = [];
var rows = 4;
var columns = 5;

var card1Selected;
var card2Selected;

window.onload = function() {
    shuffleCards();
    startGame();
}

function startTimer() {
    gameStartTime = new Date();
    timerInterval = setInterval(updateTimer, 1000);
}

function updateTimer() {
    if (!gameActive) return;
    
    var currentTime = new Date();
    var elapsedTime = Math.floor((currentTime - gameStartTime) / 1000);
    var minutes = Math.floor(elapsedTime / 60);
    var seconds = elapsedTime % 60;
    
    // Add leading zeros
    minutes = minutes < 10 ? "0" + minutes : minutes;
    seconds = seconds < 10 ? "0" + seconds : seconds;
    
    document.getElementById("timer").textContent = minutes + ":" + seconds;
}

function shuffleCards() {
    cardSet = cardList.concat(cardList); //two of each card
    //shuffle
    for (let i = 0; i < cardSet.length; i++) {
        let j = Math.floor(Math.random() * cardSet.length);
        let temp = cardSet[i];
        cardSet[i] = cardSet[j];
        cardSet[j] = temp;
    }
}

function startGame() {
    // Reset game state
    player1Score = 0;
    player2Score = 0;
    currentPlayer = 1;
    matchedPairs = 0;
    errors = 0;
    gameActive = true;
    
    document.getElementById("player1").textContent = "0";
    document.getElementById("player2").textContent = "0";
    document.getElementById("errors").textContent = "0";
    document.getElementById("current-player").textContent = "Player 1";
    
    // Clear the board
    document.getElementById("board").innerHTML = "";
    board = [];
    
    // Create new board
    for (let r = 0; r < rows; r++) {
        let row = [];
        for (let c = 0; c < columns; c++) {
            let cardImg = cardSet.pop();
            row.push(cardImg);

            let card = document.createElement("img");
            card.id = r.toString() + "-" + c.toString();
            card.src = cardImg + ".jpg";
            card.classList.add("card");
            card.addEventListener("click", selectCard);
            document.getElementById("board").append(card);
        }
        board.push(row);
    }

    setTimeout(hideCards, 1000);
    startTimer();
}

function hideCards() {
    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < columns; c++) {
            let card = document.getElementById(r.toString() + "-" + c.toString());
            card.src = "back.jpg";
        }
    }
}

function selectCard() {
    if (!gameActive) return;
    
    if (this.src.includes("back")) {
        if (!card1Selected) {
            card1Selected = this;
            let coords = card1Selected.id.split("-");
            let r = parseInt(coords[0]);
            let c = parseInt(coords[1]);
            card1Selected.src = board[r][c] + ".jpg";
        }
        else if (!card2Selected && this != card1Selected) {
            card2Selected = this;
            let coords = card2Selected.id.split("-");
            let r = parseInt(coords[0]);
            let c = parseInt(coords[1]);
            card2Selected.src = board[r][c] + ".jpg";
            setTimeout(update, 1000);
        }
    }
}

function update() {
    if (card1Selected.src != card2Selected.src) {
        card1Selected.src = "back.jpg";
        card2Selected.src = "back.jpg";
        errors += 1;
        document.getElementById("errors").innerText = errors;
        switchPlayer();
    } else {
        // Successful match
        matchedPairs++;
        if (currentPlayer === 1) {
            player1Score++;
            document.getElementById("player1").textContent = player1Score;
        } else {
            player2Score++;
            document.getElementById("player2").textContent = player2Score;
        }
        
        // Remove event listeners for matched cards
        card1Selected.removeEventListener("click", selectCard);
        card2Selected.removeEventListener("click", selectCard);
        
        // Check for game completion
        if (matchedPairs === totalPairs) {
            endGame();
        }
    }

    card1Selected = null;
    card2Selected = null;
    
    // Only switch players if the match was unsuccessful
    if (card1Selected && card2Selected && card1Selected.src === card2Selected.src) {
        switchPlayer();
    }
}

function switchPlayer() {
    currentPlayer = currentPlayer === 1 ? 2 : 1;
    document.getElementById("current-player").textContent = "Player " + currentPlayer;
}

function endGame() {
    gameActive = false;
    clearInterval(timerInterval);
    
    var finalTime = document.getElementById("timer").textContent;
    document.getElementById("final-time").textContent = finalTime;
    
    var winnerText = "";
    if (player1Score > player2Score) {
        winnerText = "Player 1 Wins!";
    } else if (player2Score > player1Score) {
        winnerText = "Player 2 Wins!";
    } else {
        winnerText = "It's a Tie!";
    }
    
    document.getElementById("winner-text").textContent = winnerText;
    document.getElementById("game-over").classList.remove("hidden");
}

function resetGame() {
    document.getElementById("game-over").classList.add("hidden");
    shuffleCards();
    startGame();
}
