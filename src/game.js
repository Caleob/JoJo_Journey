// Core Game Controller for JoJo's Journey

import { sprites } from './sprites.js';
import { sounds } from './audio.js';
import { Player } from './entities/Player.js';
import { Bench, Hole, GrumpyCat, FatCat, MangyCat, Squirrel, Acorn, Bacon } from './entities/Obstacles.js';
import { World } from './world.js';

export class Game {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');

        // Internal virtual resolution
        this.canvas.width = 1000;
        this.canvas.height = 520;

        this.world = new World(this.canvas);
        this.player = new Player(this.canvas);

        this.obstacles = [];
        this.acorns = [];
        this.items = [];
        this.particles = [];

        // Game state: 'MENU', 'PLAYING', 'PAUSED', 'STAGE_CLEAR', 'GAME_OVER'
        this.state = 'MENU';
        this.difficulty = 'medium'; // 'easy', 'medium', 'hard', 'endless'
        this.goalDistance = 1000; // in meters
        this.distance = 0; // meters traveled
        this.score = 0;

        // Difficulty configs (Faster speeds & more enemies across all levels)
        this.diffConfigs = {
            easy: { baseSpeed: 4.4, spawnMin: 140, spawnMax: 195, baconRate: 0.30 },
            medium: { baseSpeed: 5.6, spawnMin: 100, spawnMax: 145, baconRate: 0.22 },
            hard: { baseSpeed: 7.2, spawnMin: 70, spawnMax: 110, baconRate: 0.15 },
            endless: { baseSpeed: 5.0, spawnMin: 90, spawnMax: 135, baconRate: 0.20 }
        };

        this.currentSpeed = 5.6;
        this.spawnTimer = 80;

        // Inputs
        this.keys = {};
        this.setupInputs();

        // High scores
        this.highScore = parseInt(localStorage.getItem('jojo_highscore') || '0', 10);

        // Victory celebration elements
        this.victoryBannerX = -999;
        this.showVictoryModal = false;

        this.loopStarted = false;
        this.animFrameId = null;
    }

    async init() {
        await sprites.loadAll();
        this.updateHUD();
        this.startLoop();
    }

    setupInputs() {
        window.addEventListener('keydown', (e) => {
            // Prevent scrolling on arrow keys and space
            if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) {
                e.preventDefault();
            }

            this.keys[e.code] = true;
            sounds.init();

            if (e.code === 'Space') {
                if (this.state === 'PLAYING') {
                    this.player.jump();
                }
            }
            if (e.code === 'KeyP') {
                this.togglePause();
            }
            if (e.code === 'KeyM') {
                this.toggleMute();
            }
            if (e.code === 'KeyF') {
                this.toggleFullscreen();
            }
        });

        window.addEventListener('keyup', (e) => {
            this.keys[e.code] = false;
        });
    }

    startGame(difficulty = 'medium') {
        this.difficulty = difficulty;
        this.distance = 0;
        this.score = 0;
        this.obstacles = [];
        this.acorns = [];
        this.items = [];
        this.particles = [];
        this.victoryBannerX = -999;
        this.showVictoryModal = false;

        const config = this.diffConfigs[this.difficulty];
        this.currentSpeed = config.baseSpeed;
        this.spawnTimer = Math.floor(config.spawnMin * 0.75);

        this.player.reset();
        this.state = 'PLAYING';

        sounds.stopJingles();
        sounds.startMusic();
        this.hideAllOverlays();
        this.updateHUD();
    }

    togglePause() {
        if (this.state === 'PLAYING') {
            this.state = 'PAUSED';
            if (sounds.bgMusic) {
                try { sounds.bgMusic.pause(); } catch (e) {}
            }
            document.getElementById('pauseOverlay').classList.remove('hidden');
        } else if (this.state === 'PAUSED') {
            this.state = 'PLAYING';
            if (!sounds.muted && sounds.bgMusic) {
                try { sounds.bgMusic.play().catch(e => {}); } catch (e) {}
            }
            document.getElementById('pauseOverlay').classList.add('hidden');
        }
    }

    toggleMute() {
        const isMuted = sounds.toggleMute();
        const muteBtn = document.getElementById('btn-mute');
        if (muteBtn) {
            muteBtn.textContent = isMuted ? '🔇' : '🔊';
        }
    }

    hideAllOverlays() {
        ['menuOverlay', 'pauseOverlay', 'victoryOverlay', 'gameoverOverlay'].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.classList.add('hidden');
        });
    }

    returnToMenu() {
        this.state = 'MENU';
        sounds.stopMusic();
        sounds.stopJingles();
        this.hideAllOverlays();
        const menu = document.getElementById('menuOverlay');
        if (menu) menu.classList.remove('hidden');
    }

    spawnObstaclePattern() {
        const x = this.canvas.width + 60;
        const groundY = this.player.groundY; // 438: Center of the dirt trail
        const edgeGroundY = 410;            // 410: Upper edge of the path for squirrels
        const config = this.diffConfigs[this.difficulty];

        // Random roll for obstacle type (Dense, action-packed enemy frequency):
        // 0: Bench (frequently with Cat or Bacon)
        // 1: Hole (with floating bacon incentive)
        // 2: Squirrel on path edge (arced acorns, 30% follow-up throw from behind)
        // 3: Ground Cat (in path center)
        const roll = Math.random();

        if (roll < 0.26) {
            // Spawn Bench
            const bench = new Bench(x, groundY);
            this.obstacles.push(bench);

            // 60% chance of a cat (fat or mangy) sitting squarely on the bench seat plank!
            if (Math.random() < 0.60) {
                const catBreed = Math.random() < 0.5 ? 'fat' : 'mangy';
                const catX = bench.x + (bench.width - 85) / 2;
                const catY = bench.y + bench.seatOffset;
                const cat = catBreed === 'mangy'
                    ? new MangyCat(catX, catY, true, bench)
                    : new FatCat(catX, catY, true, bench);
                this.obstacles.push(cat);
                bench.hasCat = true;
            } else {
                // Bacon on bench seat
                this.items.push(new Bacon(x + bench.width / 2, bench.y + bench.seatOffset - 25));
            }
        } else if (roll < 0.50) {
            // Spawn Pit Hole
            this.obstacles.push(new Hole(x, groundY));
            // 50% chance of bacon floating over hole to reward skilled jump
            if (Math.random() < 0.50) {
                this.items.push(new Bacon(x + 60, groundY - 110));
            }
        } else if (roll < 0.78) {
            // Spawn Squirrel on the upper path edge
            this.obstacles.push(new Squirrel(x, edgeGroundY));
            if (Math.random() < 0.30) {
                this.items.push(new Bacon(x + 120, groundY - 70));
            }
        } else {
            // Ground Cat (fat or mangy) walking along the path
            const catBreed = Math.random() < 0.5 ? 'fat' : 'mangy';
            const cat = catBreed === 'mangy'
                ? new MangyCat(x, groundY, false, null)
                : new FatCat(x, groundY, false, null);
            this.obstacles.push(cat);
            if (Math.random() < 0.35) {
                this.items.push(new Bacon(x + 80, groundY - 100));
            }
        }

        // On Hard difficulty, occasional rapid double-threat combo
        if (this.difficulty === 'hard' && Math.random() < 0.35) {
            const comboX = x + 240;
            if (roll < 0.50) {
                this.obstacles.push(new Squirrel(comboX, edgeGroundY));
            } else {
                this.obstacles.push(new Hole(comboX, groundY));
            }
        }

        // Set next spawn interval with difficulty variance
        const minTime = config.spawnMin;
        const maxTime = config.spawnMax;
        this.spawnTimer = Math.floor(minTime + Math.random() * (maxTime - minTime));
    }

    addParticle(x, y, color = '#ffeb3b') {
        for (let i = 0; i < 7; i++) {
            this.particles.push({
                x, y,
                vx: (Math.random() - 0.5) * 6,
                vy: (Math.random() - 1.2) * 5,
                color,
                life: 30,
                maxLife: 30,
                size: 3 + Math.random() * 4
            });
        }
    }

    update() {
        if (this.state !== 'PLAYING') return;

        // When JoJo is falling in a hole, halt side scrolling completely
        if (this.player.isFallingInHole) {
            this.currentSpeed = 0;
            this.player.update(this.keys, this.obstacles, 0);
            if (this.player.holeFallTimer <= 0) {
                this.gameOver();
            }
            return;
        }

        if (this.player.isDead) {
            this.gameOver();
            return;
        }

        const config = this.diffConfigs[this.difficulty];
        let scrollSpeed = config.baseSpeed;

        // Progressive speed in endless mode
        if (this.difficulty === 'endless') {
            scrollSpeed += Math.floor(this.distance / 200) * 0.4;
        }

        // Dynamic speed adjustment based on JoJo's surge / brake (expanded maneuverability)
        if (this.keys['ArrowRight']) {
            scrollSpeed *= 1.20; // Agile speed surge
        } else if (this.keys['ArrowLeft']) {
            scrollSpeed *= 0.82; // Controlled brake / hang back
        }

        // Down arrow belly crawl is slightly slower
        if (this.keys['ArrowDown'] && this.player.isGrounded) {
            scrollSpeed *= 0.88;
        }

        this.currentSpeed = scrollSpeed;

        // 1. Update World parallax
        this.world.update(scrollSpeed);

        // 2. Update Player
        this.player.update(this.keys, this.obstacles, scrollSpeed);

        // 3. Update Distance & Score
        this.distance += scrollSpeed * 0.04;
        this.score += Math.round(scrollSpeed * 0.2);

        // Check 1000m Victory condition (if not endless)
        if (this.difficulty !== 'endless' && this.distance >= this.goalDistance) {
            if (this.victoryBannerX === -999) {
                this.victoryBannerX = this.canvas.width + 100;
            }
            this.victoryBannerX -= scrollSpeed;
            if (this.victoryBannerX < this.player.x + 40) {
                this.stageClear();
                return;
            }
        }

        // 4. Obstacle Spawning
        if (this.victoryBannerX === -999) {
            this.spawnTimer--;
            if (this.spawnTimer <= 0) {
                this.spawnObstaclePattern();
            }
        }

        // 5. Update Obstacles & check collisions
        const playerBox = this.player.getHitbox();

        for (let i = this.obstacles.length - 1; i >= 0; i--) {
            const obs = this.obstacles[i];

            if (obs.type === 'cat') {
                obs.update(scrollSpeed, this.player.x, this.player.y, this.particles);
                const catBox = obs.getHitbox();

                // Check collision with cat
                if (this.boxesOverlap(playerBox, catBox)) {
                    // Safe if cat is on bench and player is crawling underneath
                    const safeUnderBench = obs.onBench && this.player.state === 'CRAWL' && this.player.y >= this.player.groundY - 10;
                    if (!safeUnderBench) {
                        this.player.takeDamage();
                        this.addParticle(this.player.x + 40, this.player.y - 40, '#ff4d4d');
                    }
                }
            } else if (obs.type === 'squirrel') {
                obs.update(scrollSpeed, this.player.x, this.acorns);
            } else if (obs.type === 'hole') {
                obs.update(scrollSpeed);
                if (obs.checkCollision(this.player)) {
                    this.currentSpeed = 0;
                    this.player.fallIntoHole(obs);
                    this.addParticle(this.player.x + 40, this.player.groundY, '#5c4838');
                }
            } else {
                obs.update(scrollSpeed);
            }

            if (obs.isOffscreen()) {
                this.obstacles.splice(i, 1);
            }
        }

        // 6. Update Flying Acorns
        for (let i = this.acorns.length - 1; i >= 0; i--) {
            const acorn = this.acorns[i];
            acorn.update(scrollSpeed);

            if (this.boxesOverlap(playerBox, acorn.getHitbox())) {
                this.player.takeDamage();
                this.addParticle(acorn.x, acorn.y, '#b87431');
                this.acorns.splice(i, 1);
                continue;
            }

            if (acorn.isOffscreen()) {
                this.acorns.splice(i, 1);
            }
        }

        // 7. Update Bacon items
        for (let i = this.items.length - 1; i >= 0; i--) {
            const bacon = this.items[i];
            bacon.update(scrollSpeed);

            if (!bacon.collected && this.boxesOverlap(playerBox, bacon.getHitbox())) {
                bacon.collected = true;
                this.player.collectBacon();
                this.score += 150;
                this.addParticle(bacon.x + 15, bacon.y + 20, '#ff6b81');
                this.items.splice(i, 1);
                continue;
            }

            if (bacon.isOffscreen()) {
                this.items.splice(i, 1);
            }
        }

        // 8. Update Particles
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];
            p.x += p.vx;
            p.y += p.vy;
            p.life--;
            if (p.life <= 0) {
                this.particles.splice(i, 1);
            }
        }

        // High score update
        if (this.score > this.highScore) {
            this.highScore = this.score;
            localStorage.setItem('jojo_highscore', this.highScore.toString());
        }

        this.updateHUD();
    }

    boxesOverlap(a, b) {
        return (
            a.x < b.x + b.width &&
            a.x + a.width > b.x &&
            a.y < b.y + b.height &&
            a.y + a.height > b.y
        );
    }

    stageClear() {
        this.state = 'STAGE_CLEAR';
        sounds.stopMusic();
        sounds.playVictory();

        document.getElementById('victoryOverlay').classList.remove('hidden');
        document.getElementById('vic-difficulty').textContent = this.difficulty.toUpperCase();
        document.getElementById('vic-score').textContent = this.score;
        document.getElementById('vic-bacon').textContent = this.player.baconCount;
    }

    gameOver() {
        this.state = 'GAME_OVER';
        sounds.stopMusic();
        sounds.playGameOver();

        document.getElementById('gameoverOverlay').classList.remove('hidden');
    }

    updateHUD() {
        // Hearts
        const heartsContainer = document.getElementById('hud-hearts');
        if (heartsContainer) {
            let heartsHtml = '';
            for (let i = 0; i < this.player.maxHearts; i++) {
                heartsHtml += i < this.player.hearts ? '❤️ ' : '🖤 ';
            }
            heartsContainer.textContent = heartsHtml.trim();
        }

        // Distance & Progress Bar
        const distEl = document.getElementById('hud-distance');
        if (distEl) {
            if (this.difficulty === 'endless') {
                distEl.textContent = `${Math.floor(this.distance)}m`;
            } else {
                distEl.textContent = `${Math.min(1000, Math.floor(this.distance))} / 1000m`;
            }
        }

        const progressBar = document.getElementById('hud-progress-fill');
        if (progressBar) {
            const pct = this.difficulty === 'endless'
                ? (this.distance % 500) / 500 * 100
                : Math.min(100, (this.distance / this.goalDistance) * 100);
            progressBar.style.width = `${pct}%`;
        }

        // Score & Bacon
        const scoreEl = document.getElementById('hud-score');
        if (scoreEl) scoreEl.textContent = this.score;

        const baconEl = document.getElementById('hud-bacon');
        if (baconEl) baconEl.textContent = this.player.baconCount;

        const highEl = document.getElementById('hud-highscore');
        if (highEl) highEl.textContent = this.highScore;
    }

    draw() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        // 1. World background
        this.world.draw(this.ctx);

        // 2. Obstacles (Benches, Holes, Cats, Squirrels)
        for (const obs of this.obstacles) {
            obs.draw(this.ctx);
        }

        // 3. Bacon items
        for (const item of this.items) {
            item.draw(this.ctx);
        }

        // 4. Flying Acorns
        for (const acorn of this.acorns) {
            acorn.draw(this.ctx);
        }

        // 5. Player (JoJo)
        this.player.draw(this.ctx);

        // 5b. Foreground layers for obstacles (e.g. Bench front legs & ivy in front of crawling JoJo)
        for (const obs of this.obstacles) {
            if (obs.drawForeground) {
                obs.drawForeground(this.ctx);
            }
        }

        // 6. Finish Line Banner (if near 1000m)
        if (this.victoryBannerX > -500) {
            this.drawFinishGate(this.ctx, this.victoryBannerX);
        }

        // 7. Particles
        for (const p of this.particles) {
            this.ctx.fillStyle = p.color;
            this.ctx.globalAlpha = p.life / p.maxLife;
            this.ctx.fillRect(p.x, p.y, p.size, p.size);
        }
        this.ctx.globalAlpha = 1.0;
    }

    drawFinishGate(ctx, x) {
        const groundY = this.player.groundY;

        // Rendered rustic Dog Park Signpost
        const signW = 180;
        const signH = 185;
        const signX = x + 80;
        const signY = groundY - signH + 10;
        sprites.draw(ctx, 'signpost_dogpark', signX, signY, signW, signH);

        // Rustic Trailhead Arch with wooden timber posts
        const archLeftX = x - 40;
        const archRightX = x + 270;
        const archH = 230;
        const archY = groundY - archH;

        // Timber posts (rustic bark & woodgrain)
        ctx.fillStyle = '#4a2f13';
        ctx.fillRect(archLeftX, archY, 22, archH);
        ctx.fillRect(archRightX, archY, 22, archH);

        // Timber grain highlights
        ctx.fillStyle = '#7a5126';
        ctx.fillRect(archLeftX + 3, archY, 6, archH);
        ctx.fillRect(archRightX + 3, archY, 6, archH);

        // Top rustic wooden crossbeam
        const beamX = archLeftX - 15;
        const beamW = archRightX - archLeftX + 52;
        ctx.fillStyle = '#5c3a19';
        ctx.fillRect(beamX, archY + 10, beamW, 44);
        ctx.fillStyle = '#3a230d';
        ctx.fillRect(beamX, archY + 54, beamW, 4);
        ctx.strokeStyle = '#2d1a08';
        ctx.lineWidth = 3;
        ctx.strokeRect(beamX, archY + 10, beamW, 44);

        // Trailhead lettering
        ctx.fillStyle = '#fef08a';
        ctx.font = 'bold 14px "Press Start 2P", monospace';
        ctx.textAlign = 'center';
        ctx.fillText('DOG PARK TRAILHEAD', beamX + beamW / 2, archY + 38);

        // Festooned trail pennants hanging under crossbeam
        const flagColors = ['#f43f5e', '#38bdf8', '#fbbf24', '#34d399', '#f43f5e', '#a855f7'];
        const flagCount = 8;
        const flagStep = (beamW - 20) / flagCount;
        for (let f = 0; f < flagCount; f++) {
            const fx = beamX + 10 + f * flagStep;
            const fy = archY + 56;
            ctx.fillStyle = flagColors[f % flagColors.length];
            ctx.beginPath();
            ctx.moveTo(fx, fy);
            ctx.lineTo(fx + flagStep * 0.8, fy);
            ctx.lineTo(fx + flagStep * 0.4, fy + 16);
            ctx.closePath();
            ctx.fill();
        }
    }

    toggleFullscreen() {
        const wrapper = document.querySelector('.game-wrapper') || this.canvas;
        if (!document.fullscreenElement) {
            if (wrapper.requestFullscreen) {
                wrapper.requestFullscreen().catch(err => console.log('Fullscreen error:', err));
            } else if (wrapper.webkitRequestFullscreen) {
                wrapper.webkitRequestFullscreen();
            }
        } else {
            if (document.exitFullscreen) {
                document.exitFullscreen();
            }
        }
    }

    startLoop() {
        if (this.loopStarted) return;
        this.loopStarted = true;

        let lastTime = performance.now();
        let accumulator = 0;
        const FIXED_STEP = 1000 / 60; // Exact 60 ticks/second (16.6667 ms)
        const MAX_FRAME_TIME = 100; // Guard against huge delta leaps when tab is backgrounded

        const loop = (currentTime) => {
            const frameTime = Math.min(currentTime - lastTime, MAX_FRAME_TIME);
            lastTime = currentTime;
            accumulator += frameTime;

            while (accumulator >= FIXED_STEP) {
                this.update();
                accumulator -= FIXED_STEP;
            }

            this.draw();
            this.animFrameId = requestAnimationFrame(loop);
        };

        this.animFrameId = requestAnimationFrame(loop);
    }
}

// Instantiate and expose globally with singleton protection
if (typeof window !== 'undefined' && !window.jojoGame) {
    window.jojoGame = new Game();
    if (document.readyState === 'loading') {
        window.addEventListener('DOMContentLoaded', () => window.jojoGame.init());
    } else {
        window.jojoGame.init();
    }
}
