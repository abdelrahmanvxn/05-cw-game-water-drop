// Variables to control game state
let gameRunning = false; // Keeps track of whether game is active or not

let dropMaker; // Will store our timer that creates drops regularly
let countdownInterval; // Track countdown interval globally
// Difficulty settings will be populated from the selector
const difficultySelect = document.getElementById('difficulty');
// Default difficulty config
const DIFFICULTY_CONFIG = {
  easy: {
    time: 45,
    winScore: 15,
    dropInterval: 800,
    maxDrops: 12,
    bombChance: 0.08,
    sizeMultRange: [0.95, 1.08],
    speedRangeMobile: [1.8, 3.6],
    speedRangeDesktop: [1.2, 2.2]
  },
  normal: {
    time: 30,
    winScore: 25,
    dropInterval: 600,
    maxDrops: 15,
    bombChance: 0.17,
    sizeMultRange: [0.95, 1.2],
    speedRangeMobile: [1.5, 3.2],
    speedRangeDesktop: [1.0, 2.0]
  },
  hard: {
    time: 20,
    winScore: 35,
    dropInterval: 420,
    maxDrops: 20,
    bombChance: 0.26,
    sizeMultRange: [0.9, 1.18],
    speedRangeMobile: [1.2, 3.8],
    speedRangeDesktop: [0.8, 1.8]
  }
};

function getDifficulty() {
  const val = (difficultySelect && difficultySelect.value) ? difficultySelect.value : 'normal';
  return DIFFICULTY_CONFIG[val] || DIFFICULTY_CONFIG['normal'];
}

// Update the goal label in the UI to reflect current difficulty
const goalValueEl = document.getElementById('goal-value');
function updateGoalLabel() {
  const diff = getDifficulty();
  if (goalValueEl) {
    goalValueEl.innerText = `Reach ${diff.winScore} points`;
  }
}

// Listen for difficulty changes and update goal label live
if (difficultySelect) {
  difficultySelect.addEventListener('change', () => {
    updateGoalLabel();
    // If timer is not running, also update the timer display to reflect new difficulty
    if (!gameRunning && timer) {
      timer.innerText = String(getDifficulty().time);
    }
  });
}

// Initialize label on load
updateGoalLabel();

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

// Milestones: array of {score, msg}. Add or modify messages here.
let MILESTONE_DEFS = [
  { score: 5, msg: 'Nice start!' },
  { score: 10, msg: 'Halfway there!' },
  { score: 20, msg: 'Great run!' }
];
let shownMilestones = new Set();

function showMilestone(message) {
  try {
    const el = document.createElement('div');
    el.className = 'milestone-msg';
    el.innerText = message;
    // position inside game-wrapper so it stays visible
    const wrapper = document.querySelector('.game-wrapper') || document.body;
    wrapper.appendChild(el);
    // auto-hide after 2.5s
    setTimeout(() => {
      el.classList.add('hide');
      setTimeout(() => el.remove(), 400);
    }, 2500);
  } catch (e) {
    console.warn('Milestone display failed', e);
  }
}

function checkMilestones(currentScore) {
  // Recompute dynamic milestones if needed (for example based on winScore)
  const winScore = getDifficulty().winScore;
  // Ensure a 'halfway' milestone if not already present
  const halfway = Math.ceil(winScore / 2);
  const defs = MILESTONE_DEFS.slice();
  if (!defs.some(d => d.score === halfway)) {
    defs.push({ score: halfway, msg: 'Halfway there!' });
  }
  // Sort by score ascending
  defs.sort((a, b) => a.score - b.score);
  for (const d of defs) {
    if (currentScore >= d.score && !shownMilestones.has(d.score)) {
      shownMilestones.add(d.score);
      showMilestone(d.msg);
    }
  }
}

const sounds = {
  blue: null,
  red: null,
  bomb: null
};

// Compute a robust base for sound files. Use document.baseURI when available so
// assets resolve correctly whether the site is served from a repo subpath
// (GitHub Pages project site) or the site root.
const SOUND_BASE = (function() {
  try {
    return document.baseURI || window.location.href;
  } catch (e) {
    return window.location.href;
  }
})();

function soundPath(relPath) {
  try {
    return new URL(relPath, SOUND_BASE).toString();
  } catch (e) {
    // Fallback: return the relative path as-is
    return relPath;
  }
}

try {
  sounds.blue = new Audio(soundPath('sound/blue_drop.mp3'));
  sounds.red = new Audio(soundPath('sound/red_drop.mp3'));
  sounds.bomb = new Audio(soundPath('sound/bomb_explosion.mp3'));
  // set default volumes
  sounds.blue.volume = 0.9;
  sounds.red.volume = 0.9;
  sounds.bomb.volume = 0.9;
} catch (e) {
  console.warn('Audio preload failed', e);
}

// Quick check: verify one of the audio files is reachable; if not, log guidance for GitHub Pages
fetch(soundPath('sound/blue_drop.mp3'), { method: 'HEAD' }).then(resp => {
  if (!resp.ok) {
    console.warn('Audio file ' + soundPath('sound/blue_drop.mp3') + ' not found (status ' + resp.status + '). If you host on GitHub Pages under a repo path, ensure the sound files are deployed to the same relative path as the HTML, or update the paths in script.js to include the repo base path.');
  }
}).catch(() => {
  // ignore fetch errors
});

function playSound(name) {
  try {
    // Respect mute setting
    const isMuted = window.localStorage && window.localStorage.getItem('cw_muted') === '1';
    if (isMuted) return;
    const s = sounds[name];
    if (s) {
      // clone node to allow overlapping sounds
      const node = s.cloneNode(true);
      node.play().catch(() => {});
    }
  } catch (e) {
    // ignore audio play errors
  }
}

// Mute button wiring
const muteBtn = document.getElementById('mute-btn');
function updateMuteUI() {
  const muted = window.localStorage && window.localStorage.getItem('cw_muted') === '1';
  if (muteBtn) {
    muteBtn.setAttribute('aria-pressed', muted ? 'true' : 'false');
    muteBtn.querySelector('.mute-icon').innerText = muted ? '🔇' : '🔊';
  }
}
if (muteBtn) {
  // initialize
  if (!window.localStorage.getItem('cw_muted')) window.localStorage.setItem('cw_muted', '0');
  updateMuteUI();
  muteBtn.addEventListener('click', () => {
    const muted = window.localStorage.getItem('cw_muted') === '1';
    window.localStorage.setItem('cw_muted', muted ? '0' : '1');
    updateMuteUI();
  });
}
// Update score bar when score changes
function updateScoreBar() {
  const scoreValue = parseInt(score.innerText);
  // Winning score is now 25
  const maxScore = 25;
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
  // Check and show milestones
  if (gameRunning) checkMilestones(safeVal);
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
let gameContainer = document.getElementById("game-container");
const IS_MOBILE = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || window.innerWidth <= 600;
// Use difficulty settings to set timer and other globals
const diff = getDifficulty();
const DROP_INTERVAL = IS_MOBILE ? diff.dropInterval : diff.dropInterval;
const MAX_BALLS = IS_MOBILE ? Math.max(7, diff.maxDrops) : diff.maxDrops;
const DROP_MIN_MULT = diff.sizeMultRange[0];
const DROP_MAX_MULT = diff.sizeMultRange[1];
const DROP_SPEED_MIN = IS_MOBILE ? diff.speedRangeMobile[0] : diff.speedRangeDesktop[0];
const DROP_SPEED_MAX = IS_MOBILE ? diff.speedRangeMobile[1] : diff.speedRangeDesktop[1];
const BOMB_CHANCE = diff.bombChance;
const BAD_DROP_CLASS = "bad-drop";
const WATER_DROP_CLASS = "water-drop";
const BOMB_DROP_CLASS = "bomb-drop";
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
  // Set timer according to difficulty
  timer.innerText = String(getDifficulty().time);
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

  // Create new drops according to difficulty interval
  if (dropMaker) { clearInterval(dropMaker); dropMaker = null; }
  const diff = getDifficulty();
  dropMaker = setInterval(createDrop, diff.dropInterval);

  // Set initial score
  setScore("0");

  // Set initial timer value
  timer.innerText = String(getDifficulty().time);


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
      const winScore = getDifficulty().winScore;
      if (finalScore >= winScore) {
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
  // Limit number of drops on screen
  const allDrops = document.querySelectorAll('.water-drop');
  if (typeof MAX_BALLS !== 'undefined' && allDrops.length >= MAX_BALLS) {
    // Remove oldest drop(s) to keep performance smooth
    for (let i = 0; i < allDrops.length - MAX_BALLS + 1; i++) {
      allDrops[i].remove();
    }
  }

  // Make drops different sizes for visual variety using difficulty multipliers
  const initialSize = 60;
  const minMultiplier = (typeof DROP_MIN_MULT !== 'undefined') ? DROP_MIN_MULT : 0.95;
  const maxMultiplier = (typeof DROP_MAX_MULT !== 'undefined') ? DROP_MAX_MULT : 1.2;
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

  // Each drop gets its own dynamic speed based on difficulty ranges
  const speedMin = (typeof DROP_SPEED_MIN !== 'undefined') ? DROP_SPEED_MIN : (window.innerWidth <= 600 ? 1.5 : 1.0);
  const speedMax = (typeof DROP_SPEED_MAX !== 'undefined') ? DROP_SPEED_MAX : (window.innerWidth <= 600 ? 3.2 : 2.0);
  const dropDuration = (Math.random() * (speedMax - speedMin) + speedMin).toFixed(2) + "s";
  drop.style.animationDuration = dropDuration;
  baddrop.style.animationDuration = dropDuration;
  bombdrop.style.animationDuration = dropDuration;

  // The dropFall keyframes should be defined in your CSS file, not here.

  // Add the new drop to the game screen
  const gameContainer = document.getElementById("game-container");
  gameContainer.appendChild(drop);
  gameContainer.appendChild(baddrop);
  // Spawn bomb drop according to difficulty bomb chance
  const bombChanceLocal = (typeof BOMB_CHANCE !== 'undefined') ? BOMB_CHANCE : 0.17;
  if (Math.random() < bombChanceLocal) {
    gameContainer.appendChild(bombdrop);
  }
  // Prevent default mouse events on drops
  // Use pointer events so touch works reliably. Prevent drag default.
  ['pointerdown','mousedown'].forEach(evt => {
    drop.addEventListener(evt, function(e) { e.preventDefault(); });
    baddrop.addEventListener(evt, function(e) { e.preventDefault(); });
    bombdrop.addEventListener(evt, function(e) { e.preventDefault(); });
  });
  ['dragstart'].forEach(evt => {
    drop.addEventListener(evt, function(e) { e.preventDefault(); });
    baddrop.addEventListener(evt, function(e) { e.preventDefault(); });
    bombdrop.addEventListener(evt, function(e) { e.preventDefault(); });
  });

  // Remove drops that reach the bottom (weren't clicked)
  drop.addEventListener("animationend", () => {
    drop.remove(); // Clean up drops that weren't caught
  });
  baddrop.addEventListener("animationend", () => {
    if (!baddrop.dataset.collected) baddrop.remove(); // Clean up drops that weren't caught
  });
  bombdrop.addEventListener("animationend", () => {
    if (!bombdrop.dataset.collected) bombdrop.remove();
  });

  // Use pointerdown for immediate response on touch and mouse.
  const showFloating = (x, y, text, color) => {
    const el = document.createElement('div');
    el.className = 'floating-score up';
    el.style.left = x + 'px';
    el.style.top = y + 'px';
    el.style.color = color || '#0a0';
    el.innerText = text;
    document.getElementById('game-container').appendChild(el);
    setTimeout(() => el.remove(), 800);
  };

  baddrop.addEventListener('pointerdown', (ev) => {
    // prevent double handling
    if (baddrop.dataset.collected) return;
    baddrop.dataset.collected = '1';
  // play collect animation
    baddrop.classList.add('collected');
  // play red (bad) sound
  playSound('red');
    const rect = baddrop.getBoundingClientRect();
    showFloating(rect.left + rect.width/2, rect.top, '-1', '#d33');
    setTimeout(() => baddrop.remove(), 260);
    setScore(parseInt(score.innerText) - 1);
  });

  // When a drop is clicked, remove it and increase the score
  drop.addEventListener('pointerdown', (ev) => {
    if (drop.dataset.collected) return;
    drop.dataset.collected = '1';
  drop.classList.add('collected');
  // play blue (good) sound
  playSound('blue');
    const rect = drop.getBoundingClientRect();
    showFloating(rect.left + rect.width/2, rect.top, '+1', '#0a8');
    setTimeout(() => drop.remove(), 260);
    setScore(parseInt(score.innerText) + 1);
  });
  // Bomb drop click: game over screen
  bombdrop.addEventListener('pointerdown', () => {
    if (bombdrop.dataset.collected) return;
    bombdrop.dataset.collected = '1';
  // play bomb sound and explosion animation
  playSound('bomb');
    bombdrop.classList.add('exploded');
    // small visual pop
    setTimeout(() => {
      // proceed with game over
      if (dropMaker) {
        clearInterval(dropMaker);
        dropMaker = null;
      }
      if (countdownInterval) {
        clearInterval(countdownInterval);
        countdownInterval = null;
      }
      gameRunning = false;
      // Remove all drops
      const drops = document.getElementsByClassName("water-drop");
      while (drops[0]) drops[0].parentNode.removeChild(drops[0]);
      // Show game over screen
      setTimeout(() => {
        alert("💣 Game Over! You clicked a bomb!\nFinal score: " + score.innerText);
        setScore("0");
        timer.innerText = "0";
      }, 80);
    }, 320);
  });
}