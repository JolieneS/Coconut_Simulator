/* ═══════════════════════════════════════════
   game.js  –  COCO Screen Manager + 360 Renderer
═══════════════════════════════════════════ */

/* ── SCREEN STATE ──────────────────────── */
let currentScreen = 'intro';

function showScreen(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById(id).classList.add('active');
  currentScreen = id;
}

function goBack(to) {
  showScreen(to);
}

/* ── INTRO → MENU (auto after 3 s) ─────── */
window.addEventListener('DOMContentLoaded', () => {
  // Show intro, then after 3s fade it and go to menu + play beach audio
  setTimeout(() => {
    const intro = document.getElementById('intro');
    intro.style.transition = 'opacity 1s ease';
    intro.style.opacity = '0';
    setTimeout(() => {
      showScreen('menu');
      initAudio();           // beach sound starts here (intro only trigger)
      // Stop beach sound once we leave intro
      stopBeachAudio();      // fade it out after arrival at menu
    }, 1000);
  }, 3000);
});

/* ── NAVIGATION ─────────────────────────── */
function startPlay() {
  showScreen('game');
  startGame();
}

function showSettings() {
  showScreen('settings');
}

function startArcade() {
  showScreen('game');
  startGame();
}

function startRealistic() {
  showScreen('realistic-screen');
  playBustedSound();   // prank audio from audio.js
}

function quitToIntro() {
  showScreen('intro');
  const intro = document.getElementById('intro');
  intro.style.opacity = '1';
  setTimeout(() => {
    intro.style.transition = 'opacity 1s ease';
    intro.style.opacity = '0';
    setTimeout(() => showScreen('menu'), 1000);
  }, 3000);
}

/* ═══════════════════════════════════════════
   360 BEACH RENDERER
═══════════════════════════════════════════ */
const canvas       = document.getElementById('game-canvas');
const ctx          = canvas.getContext('2d');
const compassNeedle = document.getElementById('compass-needle');
const tiltFillEl   = document.getElementById('tilt-fill');

let angleH  = 0;
let tilt    = 0;
let dragging = false;
let lastX   = 0, lastY = 0;
let animId  = null;

function startGame() {
  if (animId) cancelAnimationFrame(animId);
  angleH = 0; tilt = 0;
  resizeCanvas();
  gameLoop();
}

function resizeCanvas() {
  canvas.width  = window.innerWidth;
  canvas.height = window.innerHeight;
}
window.addEventListener('resize', () => {
  if (currentScreen === 'game') resizeCanvas();
});

/* drag controls */
const gameDiv = document.getElementById('game');
gameDiv.addEventListener('mousedown',  e => { dragging=true; lastX=e.clientX; lastY=e.clientY; });
gameDiv.addEventListener('touchstart', e => { dragging=true; lastX=e.touches[0].clientX; lastY=e.touches[0].clientY; }, {passive:true});
window.addEventListener('mousemove',  e => {
  if (!dragging) return;
  angleH += (e.clientX - lastX) * 0.005;
  tilt = Math.max(-1, Math.min(1, tilt - (e.clientY - lastY) * 0.004));
  lastX = e.clientX; lastY = e.clientY;
});
window.addEventListener('touchmove',  e => {
  if (!dragging) return;
  angleH += (e.touches[0].clientX - lastX) * 0.005;
  tilt = Math.max(-1, Math.min(1, tilt - (e.touches[0].clientY - lastY) * 0.004));
  lastX = e.touches[0].clientX; lastY = e.touches[0].clientY;
}, {passive:true});
window.addEventListener('mouseup',  () => dragging = false);
window.addEventListener('touchend', () => dragging = false);

function lerp(a, b, t) { return a + (b - a) * t; }

/* ── MAIN LOOP ─────────────────────────── */
function gameLoop() {
  if (currentScreen !== 'game') { animId = requestAnimationFrame(gameLoop); return; }

  const W = canvas.width, H = canvas.height;
  ctx.clearRect(0, 0, W, H);

  const off = angleH / (Math.PI * 2);
  const tiltShift = tilt * H * 0.35;

  const skyH       = drawSky(W, H, off, tiltShift);
  const oceanBottom = drawOcean(W, H, off, skyH);
  drawSand(W, H, off, oceanBottom);

  // background palms (parallax)
  [
    {bx:0.05,s:0.55},{bx:0.22,s:0.50},{bx:0.45,s:0.60},
    {bx:0.63,s:0.52},{bx:0.78,s:0.58},{bx:0.92,s:0.48}
  ].forEach(t => {
    const tx = ((t.bx*W*2.5 - off*W*0.6) % (W*2.5) + W*2.5) % (W*2.5) - W*0.3;
    if (tx > -100 && tx < W+100) drawPalm(tx, oceanBottom+(H-oceanBottom)*0.03, t.s, off);
  });

  drawCoconut(W*0.5, oceanBottom + (H-oceanBottom)*0.25);

  drawPalm(W*0.15, H*0.82, 0.90, off);
  drawPalm(W*0.82, H*0.80, 0.85, off);

  if (tilt > 0.5) {
    const a = Math.min(1,(tilt-0.5)*2);
    ctx.fillStyle = `rgba(200,160,60,${a*0.5})`;
    ctx.fillRect(0, H*0.75, W, H*0.25);
  }

  // vignette
  const vig = ctx.createRadialGradient(W/2,H/2,W*0.3,W/2,H/2,W*0.75);
  vig.addColorStop(0,'rgba(0,0,0,0)');
  vig.addColorStop(1,'rgba(0,0,0,0.35)');
  ctx.fillStyle = vig; ctx.fillRect(0,0,W,H);

  const deg = (angleH*180/Math.PI+360)%360;
  compassNeedle.setAttribute('transform',`rotate(${-deg},24,24)`);
  tiltFillEl.style.height = (((tilt+1)/2)*100)+'%';

  animId = requestAnimationFrame(gameLoop);
}

/* ── DRAW HELPERS ──────────────────────── */
function drawSky(W, H, off, tiltShift) {
  const sunA    = (off*0.5*360+200)%360;
  const sunset  = sunA>260 && sunA<340;
  const skyH    = H*(0.55+tilt*0.4);

  const gSky = ctx.createLinearGradient(0,0,0,skyH);
  gSky.addColorStop(0,   sunset?'#1a0a2e':'#0a4fa0');
  gSky.addColorStop(0.6, sunset?'#c84b11':'#1a9ee0');
  gSky.addColorStop(1,   sunset?'#f4a045':'#87ceeb');
  ctx.fillStyle=gSky; ctx.fillRect(0,0,W,skyH);

  // sun
  const sunX = ((sunA/360*W*3 - off*W*0.5)%(W*3)+W*3)%(W*3)-W;
  const sunY = skyH*0.22 + tiltShift*-0.2;
  if (sunX>-80&&sunX<W+80&&sunY>0&&sunY<skyH) {
    const sg=ctx.createRadialGradient(sunX,sunY,0,sunX,sunY,55);
    sg.addColorStop(0,   sunset?'rgba(255,220,50,1)':'rgba(255,255,200,1)');
    sg.addColorStop(0.4, sunset?'rgba(255,120,20,0.8)':'rgba(255,240,80,0.7)');
    sg.addColorStop(1,'rgba(0,0,0,0)');
    ctx.fillStyle=sg; ctx.beginPath(); ctx.arc(sunX,sunY,55,0,Math.PI*2); ctx.fill();
  }

  // stars when tilted up
  if (tilt < -0.3) {
    const sa = Math.min(1,(-tilt-0.3)*3);
    ctx.fillStyle=`rgba(255,255,255,${sa*0.8})`;
    [[50,30],[150,60],[300,20],[420,80],[520,40],[200,100],[380,50],[100,90],[600,70],[480,25]].forEach(([sx,sy])=>{
      ctx.beginPath(); ctx.arc(sx, sy-tiltShift*0.3, 1.5,0,Math.PI*2); ctx.fill();
    });
  }

  // clouds
  ctx.fillStyle = sunset?'rgba(255,180,100,0.5)':'rgba(255,255,255,0.75)';
  [{bx:0.05,y:0.12,w:120,h:30},{bx:0.22,y:0.08,w:90,h:25},
   {bx:0.45,y:0.15,w:140,h:35},{bx:0.65,y:0.09,w:100,h:28},{bx:0.82,y:0.13,w:110,h:32}
  ].forEach(c=>{
    const cx=((c.bx*W*3-off*W*0.8)%(W*3)+W*3)%(W*3)-W*0.2;
    const cy=skyH*c.y+tiltShift*0.1;
    if (cy>0&&cy<skyH) {
      ctx.beginPath();
      ctx.ellipse(cx,cy,c.w*0.5,c.h*0.5,0,0,Math.PI*2);
      ctx.ellipse(cx-c.w*0.25,cy+c.h*0.1,c.w*0.35,c.h*0.4,0,0,Math.PI*2);
      ctx.ellipse(cx+c.w*0.25,cy+c.h*0.1,c.w*0.38,c.h*0.38,0,0,Math.PI*2);
      ctx.fill();
    }
  });

  return skyH;
}

function drawOcean(W, H, off, skyH) {
  const oceanH = H*0.2;
  const gO = ctx.createLinearGradient(0,skyH,0,skyH+oceanH);
  gO.addColorStop(0,'#0e7fc0'); gO.addColorStop(0.5,'#0a5e90'); gO.addColorStop(1,'#083a60');
  ctx.fillStyle=gO; ctx.fillRect(0,skyH,W,oceanH);

  ctx.strokeStyle='rgba(255,255,255,0.3)'; ctx.lineWidth=1.5;
  for (let i=0;i<5;i++){
    const wy=skyH+oceanH*(0.1+i*0.18);
    const wOff=(off*40*W+i*80)%(W*2);
    ctx.beginPath();
    for (let x=-20;x<W+20;x+=4) {
      const wvy=wy+Math.sin((x+wOff-W)*0.04+i)*3;
      x===-20?ctx.moveTo(x,wvy):ctx.lineTo(x,wvy);
    }
    ctx.stroke();
  }
  ctx.fillStyle='rgba(255,255,255,0.1)'; ctx.fillRect(0,skyH,W,3);
  return skyH+oceanH;
}

function drawSand(W, H, off, oceanBottom) {
  const gS = ctx.createLinearGradient(0,oceanBottom,0,H);
  gS.addColorStop(0,'#d4a84b'); gS.addColorStop(0.4,'#e8c46a'); gS.addColorStop(1,'#c8943a');
  ctx.fillStyle=gS;
  ctx.beginPath();
  ctx.moveTo(0,oceanBottom);
  ctx.bezierCurveTo(W*0.25,oceanBottom-10,W*0.75,oceanBottom+10,W,oceanBottom);
  ctx.lineTo(W,H); ctx.lineTo(0,H); ctx.closePath(); ctx.fill();

  ctx.strokeStyle='rgba(180,130,30,0.3)'; ctx.lineWidth=1;
  for (let i=0;i<8;i++){
    const ry=oceanBottom+(H-oceanBottom)*(0.15+i*0.1);
    const rOff=(off*15*W+i*60)%(W*2);
    ctx.beginPath();
    for (let x=0;x<W;x+=5){
      const wy=ry+Math.sin((x+rOff)*0.07)*2;
      x===0?ctx.moveTo(x,wy):ctx.lineTo(x,wy);
    }
    ctx.stroke();
  }
}

function drawPalm(x, baseY, scale, off) {
  const lean = Math.sin(off*0.3+x*0.01)*0.15;
  ctx.save(); ctx.translate(x,baseY);
  const tH=130*scale, tW=14*scale;

  ctx.fillStyle='#7a5c2a';
  ctx.beginPath();
  ctx.moveTo(-tW*0.5,0);
  ctx.quadraticCurveTo(-tW*0.5+tH*lean*0.5,-tH*0.5,-tW*0.3+tH*lean,-tH);
  ctx.lineTo(tW*0.3+tH*lean,-tH);
  ctx.quadraticCurveTo(tW*0.5+tH*lean*0.5,-tH*0.5,tW*0.5,0);
  ctx.closePath(); ctx.fill();

  ctx.strokeStyle='#5a3f18'; ctx.lineWidth=1;
  for (let i=1;i<8;i++){
    const ty=-tH*(i/8), tx=tH*lean*(i/8);
    ctx.beginPath(); ctx.moveTo(-tW*0.5+tx,ty); ctx.lineTo(tW*0.5+tx,ty); ctx.stroke();
  }

  const topX=tH*lean, topY=-tH;
  const sway=Math.sin(Date.now()*0.001+x)*0.04;

  [{a:-0.3,l:85*scale},{a:0.5,l:95*scale},{a:1.1,l:75*scale},{a:1.9,l:80*scale},
   {a:2.6,l:70*scale},{a:-0.9,l:88*scale},{a:-1.5,l:72*scale},{a:3.2,l:65*scale}
  ].forEach(f=>{
    const a=f.a+sway, fx=topX+Math.cos(a)*f.l, fy=topY+Math.sin(a)*f.l+f.l*0.3;
    ctx.strokeStyle='#3a6b1a'; ctx.lineWidth=2.5*scale;
    ctx.beginPath(); ctx.moveTo(topX,topY); ctx.quadraticCurveTo(topX+(fx-topX)*0.5,topY+(fy-topY)*0.3,fx,fy); ctx.stroke();
    for(let j=2;j<10;j++){
      const t=j/10, mx=lerp(topX,fx,t), my=lerp(topY,fy,t)-(1-t)*t*4*f.l*0.3;
      const la=a+Math.PI*0.5, ll=(12+(1-t)*8)*scale;
      ctx.strokeStyle=t<0.5?'#2d7a1a':'#3a8b25'; ctx.lineWidth=1.5*scale;
      ctx.beginPath(); ctx.moveTo(mx,my); ctx.lineTo(mx+Math.cos(la)*ll,my+Math.sin(la)*ll); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(mx,my); ctx.lineTo(mx-Math.cos(la)*ll,my-Math.sin(la)*ll); ctx.stroke();
    }
  });
  ctx.restore();
}

function drawCoconut(cx, cy) {
  ctx.fillStyle='rgba(100,70,10,0.3)';
  ctx.beginPath(); ctx.ellipse(cx+8,cy+18,28,10,0.2,0,Math.PI*2); ctx.fill();

  const cg=ctx.createRadialGradient(cx-10,cy-10,5,cx,cy,32);
  cg.addColorStop(0,'#8B6914'); cg.addColorStop(0.5,'#5C3D0A'); cg.addColorStop(1,'#3a2408');
  ctx.fillStyle=cg; ctx.beginPath(); ctx.arc(cx,cy,30,0,Math.PI*2); ctx.fill();

  ctx.strokeStyle='rgba(60,30,5,0.5)'; ctx.lineWidth=1;
  for(let i=0;i<12;i++){
    const a=(i/12)*Math.PI*2;
    ctx.beginPath(); ctx.moveTo(cx+Math.cos(a)*5,cy+Math.sin(a)*5);
    ctx.lineTo(cx+Math.cos(a)*28,cy+Math.sin(a)*28); ctx.stroke();
  }
  ctx.fillStyle='#1a0a00';
  [{dx:-6,dy:-4},{dx:5,dy:-6},{dx:0,dy:6}].forEach(e=>{
    ctx.beginPath(); ctx.ellipse(cx+e.dx,cy+e.dy,4,3.5,0,0,Math.PI*2); ctx.fill();
  });
  ctx.fillStyle='rgba(255,200,100,0.15)';
  ctx.beginPath(); ctx.ellipse(cx-10,cy-10,12,8,-0.5,0,Math.PI*2); ctx.fill();
}