const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const scoreElement = document.getElementById('score');
const menu = document.getElementById('menu');
const deathScreen = document.getElementById('deathScreen');
const startBtn = document.getElementById('startBtn');
const retryBtn = document.getElementById('retryBtn');
const arrows = document.getElementById('arrows');
const nameInput = document.getElementById('nameInput');
const nameError = document.getElementById('nameError');
const boardScreen = document.getElementById('boardScreen');
const boardList = document.getElementById('boardList');
const finalScore = document.getElementById('finalScore');
const coinsEarned = document.getElementById('coinsEarned');
const saveStatus = document.getElementById('saveStatus');
const skinsScreen = document.getElementById('skinsScreen');
const skinList = document.getElementById('skinList');
const coinCounters = document.querySelectorAll('#coinCount, #coinCountSkins');

const SUPABASE_URL = 'https://inkszzynnrbbfbeemxbn.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imlua3N6enlubnJiYmZiZWVteGJuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODk5NzgzMTUsImV4cCI6MjEwNTU1NDMxNX0.LLWI_sVF7MdxwZrHYju1hFwWy6tepsjL_LEq05_hZqY';
const API_HEADERS = { apikey: SUPABASE_KEY, 'Content-Type': 'application/json' };
const API_START = SUPABASE_URL + '/functions/v1/start-game';
const API_SUBMIT = SUPABASE_URL + '/functions/v1/submit-score';
let gameToken = null;

let playerName = '';
try { playerName = localStorage.getItem('playerName') || ''; } catch {}
nameInput.value = playerName;

const SKINS = [
    { id: 'base', name: 'Stibem', file: 'Skins/Stibem.PNG', rarity: 'comun', price: 0 },
    { id: 'lowres', name: 'Stibem Lowres', file: 'Skins/Stibem_lowres.PNG', rarity: 'poco', price: 200 },
    { id: 'calvo', name: 'Stibem Calvo', file: 'Skins/Stibem_calvo.PNG', rarity: 'raro', price: 500 },
    { id: 'dormido', name: 'Stibem Dormido', file: 'Skins/Stibem_dormido.PNG', rarity: 'epico', price: 1200 },
    { id: 'jabonoso', name: 'Stibem Jabonoso', file: 'Skins/Stibem_jabonoso.PNG', rarity: 'legendario', price: 2500 },
    { id: 'bandolero', name: 'Stibem Bandolero', file: 'Skins/Stibem_bandolero.PNG', rarity: 'mitico', price: 5000 }
];
const RARITY_NAMES = { comun: 'Común', poco: 'Poco común', raro: 'Raro', epico: 'Épico', legendario: 'Legendario', mitico: 'Mítico' };

const store = {
    get(key, fallback) { try { const v = localStorage.getItem(key); return v === null ? fallback : JSON.parse(v); } catch { return fallback; } },
    set(key, value) { try { localStorage.setItem(key, JSON.stringify(value)); } catch {} }
};

let coins = store.get('coins', 0);
let unlockedSkins = store.get('unlockedSkins', ['base']);
let currentSkin = SKINS.find(s => s.id === store.get('skin', 'base') && unlockedSkins.includes(s.id)) || SKINS[0];

function updateCoins() { coinCounters.forEach(el => { el.textContent = coins; }); }
updateCoins();

const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || ('ontouchstart' in window);
const gridSize = isMobile ? 50 : 60;
canvas.width = isMobile ? 600 : 1500;
canvas.height = isMobile ? 600 : 1200;
const tileCountX = canvas.width / gridSize;
const tileCountY = canvas.height / gridSize;
const tickRate = isMobile ? 160 : 100;

let score = 0;
let dx = 0;
let dy = 0;
let dirQueue = [];
let gameStarted = false;

const startX = Math.floor(tileCountX / 2);
const startY = Math.floor(tileCountY / 2);
let snake = [{ x: startX, y: startY }];
let prevSnake = [{ x: startX, y: startY }];
let food = { x: 15, y: 15 };

const headImg = new Image(); headImg.src = currentSkin.file;
const foodImg = new Image(); foodImg.src = 'Comidita/Pollito lico.PNG';
const bgImg = new Image(); bgImg.src = 'Fondos/KFC.jpg';

const soundEat = new Audio('Sonidos/Stibem come.m4a'); soundEat.volume = 1.0;
const soundDie = new Audio('Sonidos/Stibem muere.m4a'); soundDie.volume = 1.0;
const soundQue = new Audio('Sonidos/Stibem que que.m4a'); soundQue.volume = 1.0;
const soundMas = new Audio('Sonidos/Mas pollita stibem.m4a'); soundMas.volume = 1.0;

// Stibem's voice lines never overlap: a new one waits for the current one to finish.
const soundQueue = [];
let currentSound = null;
[soundEat, soundDie, soundQue, soundMas].forEach(a => a.addEventListener('ended', playNextSound));

function playNextSound() {
    currentSound = soundQueue.shift() || null;
    if (!currentSound) return;
    currentSound.currentTime = 0;
    currentSound.play().catch(playNextSound);
}

function playSound(sound) {
    if (currentSound) {
        if (soundQueue.length < 2) soundQueue.push(sound);
        return;
    }
    soundQueue.push(sound);
    playNextSound();
}

function stopSounds() {
    soundQueue.length = 0;
    if (currentSound) { currentSound.pause(); currentSound = null; }
}

const bgMusic = new Audio('Canciones/Niggersong.mp4');
bgMusic.loop = true;
bgMusic.volume = isMobile ? 0.05 : 0.2;

const musicBtn = document.getElementById('musicBtn');
let musicOn = store.get('music', true);
function updateMusic() {
    bgMusic.muted = !musicOn;
    musicBtn.textContent = musicOn ? '🔊' : '🔇';
    musicBtn.classList.toggle('off', !musicOn);
}
updateMusic();
musicBtn.addEventListener('click', () => {
    musicOn = !musicOn;
    store.set('music', musicOn);
    updateMusic();
    musicBtn.blur();
});

let lastQueTime = 0;
let lastTickTime = 0;

function resetGame() {
    startSession();
    score = 0; dx = 0; dy = 0; dirQueue = [];
    snake = [{ x: startX, y: startY }];
    prevSnake = [{ x: startX, y: startY }];
    scoreElement.textContent = 'Pollas comidas: 0';
    createFood();
}

function startAutoMovement() {
    setTimeout(() => {
        if (dx === 0 && dy === 0 && gameStarted) {
            const dirs = [{x:0,y:-1},{x:0,y:1},{x:-1,y:0},{x:1,y:0}];
            const d = dirs[Math.floor(Math.random() * dirs.length)];
            dx = d.x; dy = d.y;
        }
    }, 1000);
}

function startGame() {
    gameStarted = true;
    lastQueTime = Date.now();
    bgMusic.play().catch(() => {});
    startAutoMovement();
    lastTickTime = performance.now();
    gameLoop();
    if (isMobile) arrows.style.display = 'grid';
}

function showOnly(screen) {
    [menu, boardScreen, deathScreen, skinsScreen].forEach(s => { s.style.display = s === screen ? 'flex' : 'none'; });
}

function renderSkins() {
    skinList.replaceChildren();
    SKINS.forEach(skin => {
        const owned = unlockedSkins.includes(skin.id);
        const card = document.createElement('button');
        card.className = 'skin ' + skin.rarity;
        if (skin === currentSkin) card.classList.add('active');
        if (!owned && coins < skin.price) card.classList.add('locked');

        const img = document.createElement('img');
        img.src = skin.file;
        img.alt = skin.name;
        const name = document.createElement('b');
        name.textContent = skin.name;
        const rarity = document.createElement('span');
        rarity.className = 'rarity';
        rarity.textContent = RARITY_NAMES[skin.rarity];
        const state = document.createElement('span');
        state.className = 'state';
        state.textContent = skin === currentSkin ? 'En uso' : owned ? 'Usar' : skin.price + ' pollitas';
        card.append(img, name, rarity, state);

        card.addEventListener('click', () => {
            if (!owned) {
                if (coins < skin.price) return;
                coins -= skin.price;
                unlockedSkins.push(skin.id);
                store.set('coins', coins);
                store.set('unlockedSkins', unlockedSkins);
                updateCoins();
            }
            currentSkin = skin;
            store.set('skin', skin.id);
            headImg.src = skin.file;
            renderSkins();
        });
        skinList.append(card);
    });
}

startBtn.addEventListener('click', () => {
    const name = nameInput.value.trim();
    if (!name) { nameError.textContent = 'Escribe tu nombre para jugar'; return; }
    nameError.textContent = '';
    playerName = name;
    try { localStorage.setItem('playerName', name); } catch {}
    showOnly(null);
    resetGame();
    startGame();
});
retryBtn.addEventListener('click', () => { showOnly(null); resetGame(); startGame(); });
document.getElementById('boardBtn').addEventListener('click', () => { showOnly(boardScreen); loadBoard(); });
document.getElementById('skinsBtn').addEventListener('click', () => { showOnly(skinsScreen); renderSkins(); });
document.querySelectorAll('.backBtn').forEach(b => b.addEventListener('click', () => showOnly(menu)));

async function startSession() {
    try {
        const r = await fetch(API_START, { method: 'POST', headers: API_HEADERS });
        const data = await r.json();
        gameToken = data.token;
    } catch {
        gameToken = null;
    }
}

async function saveScore() {
    if (!SUPABASE_KEY) { saveStatus.textContent = ''; return; }
    if (!gameToken) { saveStatus.textContent = 'No se pudo guardar el puntaje'; return; }
    saveStatus.textContent = 'Guardando puntaje...';
    try {
        const r = await fetch(API_SUBMIT, { method: 'POST', headers: API_HEADERS, body: JSON.stringify({ token: gameToken, name: playerName, score }) });
        const data = await r.json();
        saveStatus.textContent = (r.ok && !data.error) ? 'Puntaje guardado' : 'No se pudo guardar el puntaje';
    } catch {
        saveStatus.textContent = 'Sin conexión, no se guardó el puntaje';
    }
}

async function loadBoard() {
    boardList.replaceChildren();
    const msg = text => { const li = document.createElement('li'); li.textContent = text; li.className = 'muted'; boardList.append(li); };
    if (!SUPABASE_KEY) return msg('El leaderboard aún no está configurado');
    msg('Cargando...');
    try {
        const r = await fetch(SUPABASE_URL + '/rest/v1/scores?select=name,score&order=score.desc&limit=200', { headers: API_HEADERS });
        const rows = await r.json();
        boardList.replaceChildren();
        const seen = new Set();
        // ponytail: best-per-name dedupe on the client over the top 200 rows; move to a SQL view if the table gets big
        const best = rows.filter(row => !seen.has(row.name) && seen.add(row.name)).slice(0, 10);
        if (!best.length) return msg('Nadie ha jugado todavía');
        best.forEach(row => {
            const li = document.createElement('li');
            li.textContent = `${row.name} — ${row.score}`;
            if (row.name === playerName) li.className = 'me';
            boardList.append(li);
        });
    } catch {
        boardList.replaceChildren();
        msg('No se pudo cargar, revisa tu conexión');
    }
}

function gameLoop() {
    if (!gameStarted) return;
    if (didGameEnd()) {
        bgMusic.pause();
        stopSounds();
        playSound(soundDie);
        gameStarted = false;
        if (isMobile) arrows.style.display = 'none';
        coins += score;
        store.set('coins', coins);
        updateCoins();
        finalScore.textContent = `${playerName}, comiste ${score} pollitas`;
        coinsEarned.textContent = `Guardaste ${score} pollitas · Tienes ${coins}`;
        showOnly(deathScreen);
        saveScore();
        return;
    }
    if (Date.now() - lastQueTime >= 60000) {
        lastQueTime = Date.now();
        playSound(soundQue);
    }
    advanceSnake();
    setTimeout(gameLoop, tickRate);
}

function renderLoop(now) {
    if (gameStarted) {
        const elapsed = now - lastTickTime;
        const t = Math.min(elapsed / tickRate, 1);
        clearCanvas();
        drawFood();
        drawSnake(t);
    }
    requestAnimationFrame(renderLoop);
}

function clearCanvas() {
    if (bgImg.complete) {
        ctx.drawImage(bgImg, 0, 0, canvas.width, canvas.height);
    } else {
        ctx.fillStyle = '#222';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
    ctx.fillStyle = 'rgba(0,0,0,0.4)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = 'rgba(0,0,0,0.4)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (let x = 0; x <= canvas.width; x += gridSize) {
        ctx.moveTo(x, 0); ctx.lineTo(x, canvas.height);
    }
    for (let y = 0; y <= canvas.height; y += gridSize) {
        ctx.moveTo(0, y); ctx.lineTo(canvas.width, y);
    }
    ctx.stroke();
}

function drawSnake(t) {
    const s = snake.map((part, i) => {
        const prev = prevSnake[i] || part;
        return { x: prev.x + (part.x - prev.x) * t, y: prev.y + (part.y - prev.y) * t };
    });
    if (s.length > 1) {
        ctx.strokeStyle = '#4B2500';
        ctx.lineWidth = gridSize;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.beginPath();
        ctx.moveTo(s[0].x * gridSize + gridSize/2, s[0].y * gridSize + gridSize/2);
        for (let i = 1; i < s.length; i++) ctx.lineTo(s[i].x * gridSize + gridSize/2, s[i].y * gridSize + gridSize/2);
        ctx.stroke();
    }
    ctx.drawImage(headImg, s[0].x * gridSize, s[0].y * gridSize, gridSize, gridSize);
}

function advanceSnake() {
    if (dirQueue.length) { const d = dirQueue.shift(); dx = d.x; dy = d.y; }
    if (dx === 0 && dy === 0) return;
    prevSnake = JSON.parse(JSON.stringify(snake));
    lastTickTime = performance.now();
    const head = { x: snake[0].x + dx, y: snake[0].y + dy };
    snake.unshift(head);
    if (snake[0].x === food.x && snake[0].y === food.y) {
        score += 1;
        scoreElement.textContent = 'Pollas comidas: ' + score;
        createFood();
        playSound(score % 10 === 0 ? soundMas : soundEat);
    } else {
        snake.pop();
    }
}

function didGameEnd() {
    if (dx === 0 && dy === 0) return false;
    if (snake[0].x < 0 || snake[0].x > tileCountX - 1 || snake[0].y < 0 || snake[0].y > tileCountY - 1) return true;
    for (let i = 4; i < snake.length; i++) {
        if (snake[i].x === snake[0].x && snake[i].y === snake[0].y) return true;
    }
    return false;
}

function createFood() {
    food = { x: Math.floor(Math.random() * tileCountX), y: Math.floor(Math.random() * tileCountY) };
    snake.forEach(p => { if (p.x === food.x && p.y === food.y) createFood(); });
}

function drawFood() { ctx.drawImage(foodImg, food.x * gridSize, food.y * gridSize, gridSize, gridSize); }

// Direction changes are queued and applied one per tick, so fast inputs can't reverse onto the body.
function setDir(x, y) {
    const last = dirQueue.length ? dirQueue[dirQueue.length - 1] : { x: dx, y: dy };
    if ((last.x === x && last.y === y) || (last.x === -x && last.y === -y)) return;
    if (dirQueue.length < 2) dirQueue.push({ x, y });
}

window.addEventListener('keydown', e => {
    const key = e.key.toLowerCase();
    if (key === 'w' || e.key === 'ArrowUp') setDir(0, -1);
    if (key === 'a' || e.key === 'ArrowLeft') setDir(-1, 0);
    if (key === 's' || e.key === 'ArrowDown') setDir(0, 1);
    if (key === 'd' || e.key === 'ArrowRight') setDir(1, 0);
});

if (isMobile) {
    arrows.querySelectorAll('button').forEach(b => {
        const [x, y] = b.dataset.dir.split(',').map(Number);
        b.addEventListener('touchstart', e => { e.preventDefault(); setDir(x, y); }, { passive: false });
    });
}

createFood();
requestAnimationFrame(renderLoop);

if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./sw.js').catch(() => {});
}
