let userId = null;
let friendId = null;
let isChatOpen = false;

// Initialize socket connection with error handling
let socket;
try {
    socket = io();
    console.log('Socket.IO initialized');
} catch (error) {
    console.error('Socket.IO initialization failed:', error);
}

// Debug function
function debugLog(message, data = null) {
    console.log(`Debug: ${message}`, data || '');
}

// Game functions
function highlightCard(cardId) {
    const cards = document.querySelectorAll('.card');
    cards.forEach(card => {
        card.classList.remove('highlight-card');
    });
    const selectedCard = document.getElementById(cardId);
    selectedCard.classList.add('highlight-card');

    // Handle game navigation
    if (cardId === 'bingo-card') {
        fetch(window.location.origin + "/Bingo", {
            credentials: "include",
        })
        .then((res) => res.json())
        .then((res) => {
            if (res.success) {
                window.location.href = window.location.origin + "/Bingo/" + res.gameId;
            } else {
                console.log("Bingo ERROR");
            }
        });
    }
}

function navigateToGame() {
    const gameDropdown = document.getElementById('game-dropdown');
    const selectedGameId = gameDropdown.value;
    
    if (selectedGameId) {
        highlightCard(selectedGameId);
        const selectedCard = document.getElementById(selectedGameId);
        selectedCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
}

// Chat functions
async function fetchUserId() {
    try {
        const response = await fetch("/me", { credentials: "include" });
        const data = await response.json();
        if (data.success) {
            userId = data.userId;
            debugLog('User ID fetched:', userId);
            socket.emit("joinChat", userId);
        }
    } catch (err) {
        console.error("Failed to fetch user ID:", err);
    }
}

function toggleChat() {
    debugLog('Toggle chat clicked');
    const chatContent = document.getElementById("chat-content");
    isChatOpen = !isChatOpen;
    chatContent.style.display = isChatOpen ? "block" : "none";
    if (isChatOpen) {
        fetchFriends(); // Refresh friends list when opening chat
    }
}

async function fetchRequests() {
    const response = await fetch("/friends/requests", { credentials: "include" });
    const data = await response.json();
    if (data.success) {
        const requestsList = document.getElementById("requests-list");
        requestsList.innerHTML = "";

        data.requests.forEach((request) => {
            const requestDiv = document.createElement("div");
            const emailSpan = document.createElement("span");
            emailSpan.textContent = request.requester.emailId;
            
            const buttonsDiv = document.createElement("div");
            buttonsDiv.className = "friend-request-buttons";

            const acceptButton = document.createElement("button");
            acceptButton.textContent = "Accept";
            acceptButton.className = "accept-button";
            acceptButton.onclick = () => respondToRequest(request._id, "accepted");

            const rejectButton = document.createElement("button");
            rejectButton.textContent = "Reject";
            rejectButton.className = "reject-button";
            rejectButton.onclick = () => respondToRequest(request._id, "rejected");

            buttonsDiv.appendChild(acceptButton);
            buttonsDiv.appendChild(rejectButton);
            requestDiv.appendChild(emailSpan);
            requestDiv.appendChild(buttonsDiv);
            requestsList.appendChild(requestDiv);
        });
    }
}

async function respondToRequest(requestId, status) {
    await fetch("/friends/respond", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ requestId, status }),
        credentials: "include",
    });
    fetchRequests();
}

function showRequests() {
    document.getElementById("friend-list").style.display = "none";
    document.getElementById("friend-requests").style.display = "block";
    document.getElementById("send-request").style.display = "block";
    document.getElementById("toggle-requests").style.display = "none";
    document.getElementById("chat-window").style.display = "none";
    document.getElementById("back-to-friends").style.display = "inline-block";
    fetchRequests();
}

function showFriends() {
    document.getElementById("friend-list").style.display = "block";
    document.getElementById("friend-requests").style.display = "none";
    document.getElementById("send-request").style.display = "none";
    document.getElementById("chat-window").style.display = "none";
    document.getElementById("toggle-requests").style.display = "inline-block";
    document.getElementById("back-to-friends").style.display = "none";
}

async function sendRequest() {
    const email = document.getElementById("recipient-email").value;
    const response = await fetch(`/users?email=${email}`, { credentials: "include" });
    const data = await response.json();

    if (data.success && data.user) {
        const recipientId = data.user._id;
        await fetch("/friends/request", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ recipientId }),
            credentials: "include",
        });
        alert("Friend request sent!");
    } else {
        alert("User not found!");
    }
}

async function fetchFriends() {
    const response = await fetch("/friends", { credentials: "include" });
    const data = await response.json();
    if (data.success) {
        const friendList = document.getElementById("friend-list");
        friendList.innerHTML = "";

        data.friends.forEach((friend) => {
            const friendDiv = document.createElement("div");
            const friendEmail = friend.requester._id === userId ? friend.recipient.emailId : friend.requester.emailId;
            friendDiv.textContent = friendEmail;
            friendDiv.onclick = () => openChat(friend.requester._id === userId ? friend.recipient._id : friend.requester._id);
            friendList.appendChild(friendDiv);
        });
    }
}

function openChat(id) {
    friendId = id;
    document.getElementById("friend-list").style.display = "none";
    document.getElementById("chat-window").style.display = "flex";
    fetchMessages();
}

async function fetchMessages() {
    const response = await fetch(`/chat/${friendId}`, { credentials: "include" });
    const data = await response.json();

    if (data.success) {
        const messagesDiv = document.getElementById("messages");
        messagesDiv.innerHTML = "";

        data.messages.forEach((message) => {
            const messageDiv = document.createElement("div");
            messageDiv.textContent = `${message.sender === userId ? "You" : "Friend"}: ${message.content}`;
            messageDiv.className = message.sender === userId ? "sent" : "received";
            messagesDiv.appendChild(messageDiv);
        });
        messagesDiv.scrollTop = messagesDiv.scrollHeight;
    }
}

// Socket event listeners with debug logging
socket.on("connect", () => {
    debugLog('Socket connected:', socket.id);
});

socket.on("disconnect", () => {
    debugLog('Socket disconnected');
});

socket.on("receiveMessage", (data) => {
    debugLog('Message received:', data);
    if (data.senderId === friendId || data.recipientId === friendId) {
        const messageDiv = document.createElement("div");
        messageDiv.textContent = `${data.senderId === userId ? "You" : "Friend"}: ${data.content}`;
        messageDiv.className = data.senderId === userId ? "sent" : "received";
        const messagesDiv = document.getElementById("messages");
        messagesDiv.appendChild(messageDiv);
        messagesDiv.scrollTop = messagesDiv.scrollHeight;
    }
});

socket.on("friendAccepted", (data) => {
    debugLog('Friend request accepted:', data);
    const friendList = document.getElementById("friend-list");
    const friendDiv = document.createElement("div");
    friendDiv.textContent = data.emailId;
    friendDiv.onclick = () => openChat(data.friendId);
    friendList.appendChild(friendDiv);
});

// Initialize chat
document.addEventListener('DOMContentLoaded', () => {
    debugLog('Page loaded, initializing chat');
    fetchUserId();
    
    // Show initial chat state
    const chatContainer = document.getElementById('chat-container');
    if (chatContainer) {
        debugLog('Chat container found');
        showFriends(); // Set initial view to friends list
    } else {
        console.error('Chat container not found');
    }
    document.getElementById("chat-content").style.display = "none";

    // Initialize message input and send button
    const sendButton = document.getElementById("send-button");
    const messageInput = document.getElementById("message-input");
    
    if (sendButton && messageInput) {
        debugLog('Message controls initialized');
        sendButton.addEventListener("click", sendMessage);
        messageInput.addEventListener("keypress", (e) => {
            if (e.key === "Enter") {
                sendMessage();
            }
        });
    }
});

async function sendMessage() {
    const content = document.getElementById("message-input").value;
    if (!content.trim()) return;

    await fetch("/chat/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ recipientId: friendId, content }),
        credentials: "include",
    });
    document.getElementById("message-input").value = "";
    fetchMessages();
}

function logout() {
    fetch("/logout", {
        method: "GET",
        credentials: "include"
    }).then(() => {
        window.location.href = "/";
    });
}