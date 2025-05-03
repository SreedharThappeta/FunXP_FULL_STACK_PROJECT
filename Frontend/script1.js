// Firebase initialization
const firebaseConfig = {
    apiKey: "YOUR_API_KEY",
    authDomain: "your-gamehub.firebaseapp.com",
    projectId: "your-gamehub",
    storageBucket: "your-gamehub.appspot.com",
    messagingSenderId: "123456789",
    appId: "1:123456789:web:abcdef1234567890"
  };
  
  // Initialize Firebase
  firebase.initializeApp(firebaseConfig);
  
  // Example: Live player counter
  const playerCountRef = firebase.database().ref('playerCount');
  playerCountRef.on('value', (snapshot) => {
    document.getElementById('player-count').textContent = snapshot.val();
  });