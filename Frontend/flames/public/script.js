document.addEventListener('DOMContentLoaded', function() {
    const calculateBtn = document.getElementById('calculate-btn');
    const name1Input = document.getElementById('name1');
    const name2Input = document.getElementById('name2');
    const resultDiv = document.getElementById('result');
    const relationshipDiv = document.getElementById('relationship');

    function createStars() {
        const container = document.getElementById('stars-container');
        if (!container) return; // Add null check
        
        for (let i = 0; i < 100; i++) {
            const star = document.createElement('div');
            star.className = 'stars';
            star.style.left = `${Math.random() * 100}vw`;
            star.style.top = `${Math.random() * 100}vh`;
            star.style.animationDelay = `${Math.random() * 2}s`;
            container.appendChild(star);
        }
    }
    createStars();

    function clearInputs() {
        name1Input.value = '';
        name2Input.value = '';
        name1Input.focus();
        resultDiv.classList.add('hidden');
        calculateBtn.textContent = 'Calculate';
    }

    document.getElementById('clear-btn').addEventListener('click', clearInputs);

    calculateBtn.addEventListener('click', function() {
        const name1 = name1Input.value.trim();
        const name2 = name2Input.value.trim();
        
        if (!name1 || !name2) {
            alert('Please enter both names!');
            return;
        }
        
        calculateBtn.disabled = true;
        calculateBtn.textContent = 'Calculating...';
        
        fetch('/calculate-flames', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name1, name2 })
        })
        .then(response => response.json())
        .then(data => {
            const emojis = {
                'Friends': '🤝',
                'Lovers': '💑',
                'Affection': '💖',
                'Marriage': '💍',
                'Enemies': '⚔️',
                'Siblings': '🤗'
            };

            relationshipDiv.innerHTML = `
                <div class="result-emoji">${emojis[data.result] || '✨'}</div>
                <div class="result-title">${data.result}</div>
            `;
            
            resultDiv.classList.remove('hidden');
            resultDiv.classList.add('show');
            
            confetti({
                particleCount: 100,
                spread: 70,
                origin: { y: 0.6 }
            });

            calculateBtn.disabled = false;
            calculateBtn.textContent = 'Calculate Again';
        })
        .catch(error => {
            console.error('Error:', error);
            alert('Calculation failed. Please try again.');
            calculateBtn.disabled = false;
            calculateBtn.textContent = 'Calculate';
        });
    });
});