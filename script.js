// Variables to control game state
let gameRunning = false; // Keeps track of whether game is active or not

let dropMaker; // Will store our timer that creates drops regularly
let countdownInterval; // Track countdown interval globally

let score = document.getElementById("score");
// Winning and losing messages
const winningMessages = [
  "Amazing! You brought clean water!",
  "You did it! Every drop counts!",
  "Victory! You're a water hero!",
  "Fantastic! You made a difference!",
  "Great job! Water for all!"
];
const losingMessages = [
  "Try again! Every drop matters.",
  "Keep going! You can do it!",
  "Almost there! Give it another shot.",
  "Don't give up! Water is life.",
  "So close! Try once more."
];
let timer = document.getElementById("timer");
// Update score bar when score changes
function updateScoreBar() {
  const scoreValue = parseInt(score.innerText);
  // Assume max score for bar is 30 for demo, can be adjusted
  const maxScore = 30;
  const percent = Math.min(100, Math.round((scoreValue / maxScore) * 100));
  document.getElementById('score-bar-fill').style.width = percent + '%';
  document.getElementById('score-bar-label').innerText = percent + '%';
}

// Update score bar on score change
function setScore(val) {
    // Prevent score from going below 0
    const safeVal = Math.max(0, parseInt(val));
    score.innerText = safeVal;
    updateScoreBar();
}

// Wait for button click to start the game

document.getElementById("start-btn").addEventListener("click", startGame);
document.getElementById("reset-btn").addEventListener("click", resetGame);


// Improved: Only prevent scrolling for vertical swipes, not taps/clicks
const gameContainer = document.getElementById("game-container");
let touchStartY = null;
gameContainer.addEventListener("touchstart", function(e) {
  if (e.touches.length === 1) {
    touchStartY = e.touches[0].clientY;
  }
}, { passive: true });
gameContainer.addEventListener("touchmove", function(e) {
  if (touchStartY !== null) {
    const touchCurrentY = e.touches[0].clientY;
    const deltaY = Math.abs(touchCurrentY - touchStartY);
    // Only prevent default if it's a vertical swipe (not a tap)
    if (deltaY > 10) {
      e.preventDefault();
    }
  }
}, { passive: false });
gameContainer.addEventListener("touchend", function() {
  touchStartY = null;
});


function resetGame() {
  // Stop any running intervals
  gameRunning = false;
  if (dropMaker) {
    clearInterval(dropMaker);
    dropMaker = null;
  }
  if (countdownInterval) {
    clearInterval(countdownInterval);
    countdownInterval = null;
  }
  // Remove all drops
  const drops = document.getElementsByClassName("water-drop");
  while (drops[0]) {
    drops[0].parentNode.removeChild(drops[0]);
  }
  // Reset score and timer
  setScore("0");
  timer.innerText = "30";
  // Start the game immediately
  startGame();
}

function startGame() {
  // Prevent default mouse events on game container
  const gameContainer = document.getElementById("game-container");
  gameContainer.addEventListener("mousedown", function(e) { e.preventDefault(); });
  gameContainer.addEventListener("dragstart", function(e) { e.preventDefault(); });
  // Prevent multiple games from running at once
  if (gameRunning) {
    return;
  }

  gameRunning = true;

  // Create new drops every second (1000 milliseconds)
  dropMaker = setInterval(createDrop, 1000);

  // Set initial score
  setScore("0");

  // Set initial timer value
  timer.innerText = "30";


  // Add a timer function to handle countdown and game over
  if (countdownInterval) {
    clearInterval(countdownInterval);
    countdownInterval = null;
  }
  countdownInterval = setInterval(() => {
    let timeLeft = parseInt(timer.innerText);
    if (timeLeft > 0) {
      timer.innerText = timeLeft - 1;
    } else {
      if (dropMaker) {
        clearInterval(dropMaker);
        dropMaker = null;
      }
      if (countdownInterval) {
        clearInterval(countdownInterval);
        countdownInterval = null;
      }
      gameRunning = false;
      // Show winning or try again message
      const finalScore = parseInt(score.innerText);
      let message;
      if (finalScore >= 20) {
        message = winningMessages[Math.floor(Math.random() * winningMessages.length)];
        // Confetti effect for win
        if (typeof launchConfetti === 'function') launchConfetti();
      } else {
        message = losingMessages[Math.floor(Math.random() * losingMessages.length)];
      }
      alert(message + "\nYour final score is: " + finalScore);
      setScore("0");
      timer.innerText = "0";
      const drops = document.getElementsByClassName("water-drop");
      while (drops[0]) {
        drops[0].parentNode.removeChild(drops[0]);
      }
    }
  }, 1000);
}

function createDrop() {
  // Create a new div element that will be our water drop
  const drop = document.createElement("div");
  const baddrop = document.createElement("div");
  const bombdrop = document.createElement("div");
  drop.className = "water-drop";
  baddrop.className = "water-drop bad-drop";
  bombdrop.className = "water-drop bomb-drop";
  bombdrop.innerText = '💣';
  // Limit number of drops on screen
  const maxDrops = 15;
  const allDrops = document.querySelectorAll('.water-drop');
  if (allDrops.length >= maxDrops) {
    // Remove oldest drop(s) to keep performance smooth
    for (let i = 0; i < allDrops.length - maxDrops + 1; i++) {
      allDrops[i].remove();
    }
  }


  // Make drops different sizes for visual variety, but increase minimum size
  const initialSize = 60;
  const minMultiplier = 0.95; // was 0.5, now 0.95 for bigger minimum
  const maxMultiplier = 1.2; // allow slightly bigger max
  const sizeMultiplier = Math.random() * (maxMultiplier - minMultiplier) + minMultiplier;
  const size = initialSize * sizeMultiplier;
  drop.style.width = drop.style.height = `${size}px`;
  baddrop.style.width = baddrop.style.height = `${size}px`;
  bombdrop.style.width = bombdrop.style.height = `${size}px`;

  // Position the drop randomly across the game width
  // Subtract 60 pixels to keep drops fully inside the container
  const gameWidth = document.getElementById("game-container").offsetWidth;
  const xPosition = Math.random() * (gameWidth - 60);
  drop.style.left = xPosition + "px";
  baddrop.style.left = Math.random() * (gameWidth - 60) + "px";
  baddrop.style.top = "-60px";
  bombdrop.style.left = Math.random() * (gameWidth - 60) + "px";
  bombdrop.style.top = "-60px";

  // Each drop gets its own dynamic speed
  let dropDuration;
  if (window.innerWidth <= 600) {
    // Mobile: 1.5s to 3.2s
    dropDuration = (Math.random() * (3.2 - 1.5) + 1.5).toFixed(2) + "s";
  } else {
    // PC: 1s to 2s
    dropDuration = (Math.random() * (2 - 1) + 1).toFixed(2) + "s";
  }
  drop.style.animationDuration = dropDuration;
  baddrop.style.animationDuration = dropDuration;
  bombdrop.style.animationDuration = dropDuration;

  // The dropFall keyframes should be defined in your CSS file, not here.

  // Add the new drop to the game screen
  const gameContainer = document.getElementById("game-container");
  gameContainer.appendChild(drop);
  gameContainer.appendChild(baddrop);
  // 1 in 6 chance to spawn a bomb drop
  if (Math.random() < 0.17) {
    gameContainer.appendChild(bombdrop);
  }
  // Prevent default mouse events on drops
  drop.addEventListener("mousedown", function(e) { e.preventDefault(); });
  drop.addEventListener("dragstart", function(e) { e.preventDefault(); });
  baddrop.addEventListener("mousedown", function(e) { e.preventDefault(); });
  baddrop.addEventListener("dragstart", function(e) { e.preventDefault(); });
  bombdrop.addEventListener("mousedown", function(e) { e.preventDefault(); });
  bombdrop.addEventListener("dragstart", function(e) { e.preventDefault(); });

  // Remove drops that reach the bottom (weren't clicked)
  drop.addEventListener("animationend", () => {
    drop.remove(); // Clean up drops that weren't caught
    try { sounds.miss.play(); } catch {}
  });
  baddrop.addEventListener("animationend", () => {
    baddrop.remove(); // Clean up drops that weren't caught
    try { sounds.miss.play(); } catch {}
  });
  bombdrop.addEventListener("animationend", () => {
    bombdrop.remove();
  });

  baddrop.addEventListener("click", () => {
    baddrop.remove(); // Remove drop when clicked
    setScore(parseInt(score.innerText) - 1); // Decrement score, but setScore will prevent negative
    try { sounds.miss.play(); } catch {}
  });
  // When a drop is clicked, remove it and increase the score
  drop.addEventListener("click", () => {
    drop.remove(); // Remove drop when clicked
    setScore(parseInt(score.innerText) + 1); // Increment score
    try { sounds.catch.play(); } catch {}
  });
  // Bomb drop click: lose 5 points and play sound
  bombdrop.addEventListener("click", () => {
    bombdrop.remove();
    setScore(parseInt(score.innerText) - 5);
    try { sounds.bomb.play(); } catch {}
  });
}
