// Simple confetti effect using canvas
function launchConfetti() {
  let canvas = document.getElementById('confetti-canvas');
  if (!canvas) {
    canvas = document.createElement('canvas');
    canvas.id = 'confetti-canvas';
    canvas.style.position = 'fixed';
    canvas.style.top = '0';
    canvas.style.left = '0';
    canvas.style.width = '100vw';
    canvas.style.height = '100vh';
    canvas.style.pointerEvents = 'none';
    canvas.style.zIndex = '9999';
    document.body.appendChild(canvas);
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  }
  const ctx = canvas.getContext('2d');
  const confettiColors = ['#FFC907', '#2E9DF7', '#FFD84A', '#8BD1CB', '#fff'];
  const confettiPieces = [];
  for (let i = 0; i < 80; i++) {
    confettiPieces.push({
      x: Math.random() * canvas.width,
      y: Math.random() * -canvas.height,
      r: Math.random() * 8 + 4,
      d: Math.random() * 2 + 1,
      color: confettiColors[Math.floor(Math.random() * confettiColors.length)],
      tilt: Math.random() * 10 - 5
    });
  }
  let frame = 0;
  const maxFrames = 600; // ~10 seconds at 60fps
  let confettiActive = true;
  function removeConfetti() {
    confettiActive = false;
    if (canvas) canvas.remove();
  }
  // Remove confetti when Start or Reset is pressed
  document.getElementById('start-btn')?.addEventListener('click', removeConfetti);
  document.getElementById('reset-btn')?.addEventListener('click', removeConfetti);
  function drawConfetti() {
    if (!confettiActive) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    confettiPieces.forEach(p => {
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, 2 * Math.PI);
      ctx.fillStyle = p.color;
      ctx.fill();
      p.y += p.d + Math.sin(frame / 10 + p.tilt) * 2;
      p.x += Math.sin(frame / 10 + p.tilt) * 2;
      if (p.y > canvas.height) p.y = Math.random() * -20;
      if (p.x > canvas.width) p.x = Math.random() * canvas.width;
    });
    frame++;
    if (frame < maxFrames) {
      requestAnimationFrame(drawConfetti);
    } else {
      removeConfetti();
    }
  }
  drawConfetti();
}
