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

        // Difficulty configs (Equalized bacon frequency across levels, with Easy vs Difficult balancing)
        this.diffConfigs = {
            easy: { baseSpeed: 4.4, spawnMin: 140, spawnMax: 195, baconRate: 0.55, difficultBaconChance: 0.15, goalDistance: 900 },
            medium: { baseSpeed: 5.6, spawnMin: 100, spawnMax: 145, baconRate: 0.55, difficultBaconChance: 0.55, goalDistance: 1000 },
            hard: { baseSpeed: 7.2, spawnMin: 70, spawnMax: 110, baconRate: 0.55, difficultBaconChance: 0.90, goalDistance: 1200 },
            endless: { baseSpeed: 5.0, spawnMin: 90, spawnMax: 135, baconRate: 0.55, difficultBaconChance: 0.35, goalDistance: Infinity }
        };

        this.currentSpeed = 5.6;
        this.spawnTimer = 80;

        // Menu difficulty keyboard navigation ('endless' selected by default)
        this.menuDifficulties = ['easy', 'medium', 'hard', 'endless'];
        this.selectedDifficultyIndex = 3;

        // Inputs
        this.keys = {};
        this.setupInputs();

        // High scores
        this.highScore = parseInt(localStorage.getItem('jojo_highscore') || '0', 10);

        // Victory celebration elements
        this.victoryBannerX = -999;
        this.showVictoryModal = false;
        this.winPhase = null;
        this.winTimer = 0;
        this.winFadeAlpha = 0.0;
        this.winWalkStartX = null;
        this.winWalkTargetX = null;

        // Loss transition elements
        this.lossPhase = null;
        this.lossTimer = 0;
        this.lossFadeAlpha = 0.0;

        // Interactive Controls Card Cycling
        this.controlCycleTimer = null;
        this.controlCycleIndex = 0;
        this.controlCycleKeys = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'];
        this.controlKeyData = {
            'ArrowUp': { title: 'JUMP', desc: 'Leap over cats, pit holes & benches' },
            'ArrowDown': { title: 'CROUCH / CRAWL', desc: 'Belly crawl under benches & flying nuts' },
            'ArrowLeft': { title: 'MOVE LEFT', desc: 'Slight brake & ease back' },
            'ArrowRight': { title: 'MOVE RIGHT', desc: 'Surge forward along the trail' },
            'Space': { title: 'JUMP', desc: 'High leap into the air (Spacebar or Up)' }
        };

        // In-Card Enemy Cycler
        this.currentEnemyIndex = 0;
        this.enemyCatalog = [
            {
                name: 'FAT CAT (TABBY)',
                sprite: 'assets/cat/fat/cat_sit.png',
                desc: 'Lounges lazily on the trail or benches. Swipes a lightning-fast claw when JoJo gets close!',
                tip: 'Leap over him, or belly crawl beneath if perched on a bench.'
            },
            {
                name: 'MANGY CAT (TUXEDO)',
                sprite: 'assets/sprites/cat/mangy/cat_stand_1.png',
                desc: 'Twitches nervously, leaps into the trail, then bounces forward faster than scroll speed to chase JoJo down!',
                tip: 'Leap clean over him or stay ahead—he can spring forward from behind for a dangerous second chance!'
            },
            {
                name: 'BUSH BANDIT SQUIRREL',
                sprite: 'assets/sprites/squirrel/sq_throw.png',
                desc: 'Pops out of roadside brush to lob high-spinning acorns. Watch out for sneak rear throws!',
                tip: 'Belly crawl right under high nuts, or time a leap over low throws.'
            },
            {
                name: 'BENCHES & PIT HOLES',
                sprite: 'assets/sprites/items/hole.png',
                desc: 'Benches can be leaped onto or crawled under. Pit holes are bottomless traps (instant game over)!',
                tip: 'Always keep enough forward speed to jump clear across holes.'
            },
            {
                name: 'SIZZLING BACON 🥓',
                sprite: 'assets/sprites/items/bacon.png',
                desc: 'Delicious snack strips along the wilderness trail. Heals +1 Heart and awards +150 bonus score!',
                tip: 'Collect every strip to stay at full health for tough obstacles ahead.'
            }
        ];

        this.loopStarted = false;
        this.animFrameId = null;
    }

    async init() {
        await sprites.loadAll();
        this.resetGame();
        this.setupControlCycle();
        this.setupMenuDifficultyNavigation();
        this.updateDifficultyHighlight();
        this.renderCurrentEnemy();
        this.startLoop();
    }

    setupInputs() {
        window.addEventListener('keydown', (e) => {
            // Prevent scrolling on arrow keys and space
            if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) {
                e.preventDefault();
            }

            // If in cinematic win or loss sequence, user has lost control
            if (this.winPhase !== null || this.lossPhase !== null) {
                if (e.code === 'KeyM') {
                    this.toggleMute();
                }
                if (e.code === 'KeyF') {
                    this.toggleFullscreen();
                }
                if ((e.code === 'Enter' || e.code === 'NumpadEnter') && (this.state === 'STAGE_CLEAR' || this.state === 'GAME_OVER')) {
                    this.returnToMenu();
                }
                return;
            }

            this.keys[e.code] = true;
            sounds.init();

            // Menu Keyboard Navigation
            if (this.state === 'MENU') {
                if (e.code === 'ArrowLeft') {
                    this.navigateMenuDifficulty(-1);
                    return;
                }
                if (e.code === 'ArrowRight') {
                    this.navigateMenuDifficulty(1);
                    return;
                }
                if (e.code === 'Enter' || e.code === 'NumpadEnter') {
                    this.startGame(this.menuDifficulties[this.selectedDifficultyIndex]);
                    return;
                }
            }

            if (e.code === 'Space' || e.code === 'ArrowUp' || e.code === 'KeyW') {
                if (this.state === 'PLAYING') {
                    this.player.jump();
                }
            }
            if (e.code === 'Escape') {
                if (this.state === 'PLAYING' || this.state === 'PAUSED') {
                    this.togglePause();
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
            if (e.code === 'Enter' || e.code === 'NumpadEnter') {
                if (this.state === 'STAGE_CLEAR' || this.state === 'GAME_OVER') {
                    this.returnToMenu();
                }
            }
        });

        window.addEventListener('keyup', (e) => {
            if (this.winPhase !== null || this.lossPhase !== null) return;
            this.keys[e.code] = false;
        });

        window.addEventListener('blur', () => {
            this.keys = {};
        });
    }

    setupControlCycle() {
        const keys = document.querySelectorAll('.keycap-interactive');
        keys.forEach(k => {
            k.addEventListener('mouseenter', () => {
                this.pauseControlCycle();
                this.highlightControlKey(k.getAttribute('data-key'));
            });
            k.addEventListener('mouseleave', () => {
                this.startControlCycle();
            });
        });

        this.startControlCycle();
    }

    highlightControlKey(keyName) {
        document.querySelectorAll('.keycap-interactive').forEach(el => {
            if (el.getAttribute('data-key') === keyName) {
                el.classList.add('active-key');
            } else {
                el.classList.remove('active-key');
            }
        });

        const data = this.controlKeyData[keyName];
        if (data) {
            const titleEl = document.getElementById('feedbackTitle');
            const descEl = document.getElementById('feedbackDesc');
            if (titleEl) titleEl.textContent = data.title;
            if (descEl) descEl.textContent = data.desc;
        }
    }

    startControlCycle() {
        if (this.controlCycleTimer) clearInterval(this.controlCycleTimer);
        this.controlCycleTimer = setInterval(() => {
            if (this.state !== 'MENU') return;
            const keyName = this.controlCycleKeys[this.controlCycleIndex];
            this.highlightControlKey(keyName);
            this.controlCycleIndex = (this.controlCycleIndex + 1) % this.controlCycleKeys.length;
        }, 1500);
    }

    pauseControlCycle() {
        if (this.controlCycleTimer) {
            clearInterval(this.controlCycleTimer);
            this.controlCycleTimer = null;
        }
    }

    cycleEnemy(direction) {
        this.currentEnemyIndex = (this.currentEnemyIndex + direction + this.enemyCatalog.length) % this.enemyCatalog.length;
        this.renderCurrentEnemy();
    }

    renderCurrentEnemy() {
        const item = this.enemyCatalog[this.currentEnemyIndex];
        if (!item) return;

        const countEl = document.getElementById('enemyCountBadge');
        if (countEl) countEl.textContent = `${this.currentEnemyIndex + 1} / ${this.enemyCatalog.length}`;

        const nameEl = document.getElementById('enemyName');
        if (nameEl) nameEl.textContent = item.name;

        const imgEl = document.getElementById('enemySpriteImg');
        if (imgEl) {
            imgEl.src = item.sprite;
            imgEl.alt = item.name;
        }

        const descEl = document.getElementById('enemyDesc');
        if (descEl) descEl.textContent = item.desc;

        const tipEl = document.getElementById('enemyTip');
        if (tipEl) tipEl.innerHTML = `<strong>Survival Tip:</strong> ${item.tip}`;
    }

    setupMenuDifficultyNavigation() {
        const diffButtons = document.querySelectorAll('.diff-btn');
        diffButtons.forEach((btn, index) => {
            btn.addEventListener('mouseenter', () => {
                this.selectedDifficultyIndex = index;
                this.updateDifficultyHighlight();
            });
        });
    }

    navigateMenuDifficulty(direction) {
        if (this.state !== 'MENU') return;
        const len = this.menuDifficulties.length;
        this.selectedDifficultyIndex = (this.selectedDifficultyIndex + direction + len) % len;
        this.updateDifficultyHighlight();
    }

    updateDifficultyHighlight() {
        const diffButtons = document.querySelectorAll('.diff-btn');
        diffButtons.forEach((btn, index) => {
            if (index === this.selectedDifficultyIndex) {
                btn.classList.add('selected-diff');
            } else {
                btn.classList.remove('selected-diff');
            }
        });
    }

    resetGame() {
        this.distance = 0;
        this.score = 0;
        this.obstacles = [];
        this.acorns = [];
        this.items = [];
        this.particles = [];
        this.victoryBannerX = -999;
        this.showVictoryModal = false;
        this.winPhase = null;
        this.winTimer = 0;
        this.winFadeAlpha = 0.0;
        this.winWalkStartX = null;
        this.winWalkTargetX = null;
        this.lossPhase = null;
        this.lossTimer = 0;
        this.lossFadeAlpha = 0.0;
        this.keys = {}; // Clear any stuck input keys
        this.spawnTimer = 80;

        const config = this.diffConfigs[this.difficulty] || this.diffConfigs['medium'];
        this.currentSpeed = config.baseSpeed;
        this.goalDistance = config.goalDistance || 1000;

        // Fresh instances guarantee 100% clean initial state with zero stale properties
        this.player = new Player(this.canvas);
        this.world = new World(this.canvas);
        this.updateHUD();
    }

    startGame(difficulty = 'endless') {
        if (!difficulty) {
            difficulty = this.menuDifficulties[this.selectedDifficultyIndex] || 'endless';
        }
        this.difficulty = difficulty;
        const diffIdx = this.menuDifficulties.indexOf(difficulty);
        if (diffIdx !== -1) {
            this.selectedDifficultyIndex = diffIdx;
        }
        this.keys = {}; // Clear inputs
        this.resetGame();

        const config = this.diffConfigs[this.difficulty] || this.diffConfigs['medium'];
        this.currentSpeed = config.baseSpeed;
        this.goalDistance = config.goalDistance || 1000;
        this.spawnTimer = Math.floor(config.spawnMin * 0.75);

        this.resetLoopTiming();
        this.state = 'PLAYING';

        sounds.stopJingles();
        sounds.startMusic();
        this.pauseControlCycle();
        this.hideAllOverlays();
        this.updateHUD();
    }

    togglePause() {
        if (this.winPhase !== null) return;
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
            if (el) {
                el.classList.add('hidden');
                el.classList.remove('fade-in-from-black');
            }
        });
    }

    returnToMenu() {
        this.state = 'MENU';
        sounds.stopMusic();
        sounds.stopJingles();
        this.resetGame();
        this.hideAllOverlays();
        const menu = document.getElementById('menuOverlay');
        if (menu) menu.classList.remove('hidden');
        this.selectedDifficultyIndex = 3; // Reset highlight to 'endless'
        this.updateDifficultyHighlight();
        this.startControlCycle();
    }

    spawnObstaclePattern() {
        const x = this.canvas.width + 60;
        const groundY = this.player.groundY; // 438: Center of the dirt trail
        const edgeGroundY = 410;            // 410: Upper edge of the path for squirrels
        const config = this.diffConfigs[this.difficulty];

        // Determine if bacon rolls and whether it is Easy or Difficult
        let difficultChance = config.difficultBaconChance;
        if (this.difficulty === 'endless') {
            // Endless scales smoothly from 0.20 at 0m to 0.95 at 1000m+
            const progress = Math.min(1.0, this.distance / 1000);
            difficultChance = 0.20 + progress * 0.75;
        }

        const baconRate = config.baconRate || 0.55;
        const wantsBacon = Math.random() < baconRate;
        const isDifficult = wantsBacon && (Math.random() < difficultChance);

        // Random roll for obstacle type:
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
            const hasCat = Math.random() < 0.60;
            let catBreed = null;
            if (hasCat) {
                catBreed = Math.random() < 0.5 ? 'fat' : 'mangy';
                const catX = bench.x + (bench.width - 85) / 2;
                const catY = bench.y + bench.seatOffset;
                const cat = catBreed === 'mangy'
                    ? new MangyCat(catX, catY, true, bench, this.difficulty)
                    : new FatCat(catX, catY, true, bench);
                this.obstacles.push(cat);
                bench.hasCat = true;
            }

            if (wantsBacon) {
                if (hasCat) {
                    if (isDifficult) {
                        // High-skill bacon:
                        // High vaulting bacon centered directly over the cat (reachable ONLY by jumping/vaulting off the bench seat),
                        // OR deep under the bench (reachable ONLY by crawling under beneath the cat).
                        if (catBreed === 'fat' || Math.random() < 0.70) {
                            // Vaulting bacon directly over the cat at y = 125
                            this.items.push(new Bacon(x + bench.width / 2 - 19, 125));
                        } else {
                            // Clearly under the bench: hugging the ground under seat plank
                            this.items.push(new Bacon(x + bench.width * 0.45, groundY - 55));
                        }
                    } else {
                        // Easy bacon: placed comfortably on open ground before the bench
                        this.items.push(new Bacon(x - 80, groundY - 70));
                    }
                } else {
                    // Empty bench (no cat)
                    if (isDifficult) {
                        const subRoll = Math.random();
                        if (subRoll < 0.40) {
                            // Clearly under the bench: hugging ground under seat plank (missed if walking on top)
                            this.items.push(new Bacon(x + bench.width * 0.45, groundY - 55));
                        } else if (subRoll < 0.80) {
                            // Clearly on top of the bench: sitting high on seat/backrest (missed if crawling under)
                            this.items.push(new Bacon(x + bench.width * 0.45, bench.y + bench.seatOffset - 84));
                        } else {
                            // Vaulting bacon high in the air above bench (requires jump off bench)
                            this.items.push(new Bacon(x + bench.width / 2 - 19, 125));
                        }
                    } else {
                        // Easy bacon: dual-accessible at seat plank height (collected whether crawling under OR walking on top)
                        this.items.push(new Bacon(x + bench.width * 0.45, bench.y + bench.seatOffset - 25));
                    }
                }
            }
        } else if (roll < 0.50) {
            // Spawn Pit Hole
            this.obstacles.push(new Hole(x, groundY));
            if (wantsBacon) {
                if (isDifficult) {
                    // Difficult bacon: floating directly over the pit hole, requiring a timed jump across the chasm
                    this.items.push(new Bacon(x + 60, groundY - 110));
                } else {
                    // Easy bacon: safely positioned on open ground before the pit hole
                    this.items.push(new Bacon(x - 70, groundY - 70));
                }
            }
        } else if (roll < 0.78) {
            // Spawn Squirrel on the upper path edge
            this.obstacles.push(new Squirrel(x, edgeGroundY));
            if (wantsBacon) {
                if (isDifficult) {
                    // Difficult bacon: elevated in acorn trajectory, requiring jumping while dodging acorns
                    this.items.push(new Bacon(x + 100, groundY - 125));
                } else {
                    // Easy bacon: placed on ground
                    this.items.push(new Bacon(x + 120, groundY - 70));
                }
            }
        } else {
            // Ground Cat (fat or mangy) walking along the path
            const catBreed = Math.random() < 0.5 ? 'fat' : 'mangy';
            const cat = catBreed === 'mangy'
                ? new MangyCat(x, groundY, false, null, this.difficulty)
                : new FatCat(x, groundY, false, null);
            this.obstacles.push(cat);
            if (wantsBacon) {
                if (isDifficult) {
                    // Difficult bacon: directly near/above the stationary cat (swiping claw danger)
                    this.items.push(new Bacon(x + 75, groundY - 100));
                } else {
                    // Easy bacon: positioned safely ahead on open ground before the cat
                    this.items.push(new Bacon(x - 90, groundY - 70));
                }
            }
        }

        // On Hard difficulty, occasional rapid double-threat combo
        if (this.difficulty === 'hard' && Math.random() < 0.35) {
            const comboX = x + 240;
            if (roll < 0.50) {
                this.obstacles.push(new Squirrel(comboX, edgeGroundY));
            } else {
                this.obstacles.push(new Hole(comboX, groundY));
                if (Math.random() < 0.50) {
                    this.items.push(new Bacon(comboX + 60, groundY - 110));
                }
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

    startLossSequence() {
        if (this.lossPhase !== null) return;
        this.lossPhase = 'FADE_OUT';
        this.lossTimer = 0;
        this.lossFadeAlpha = 0.0;
        this.keys = {}; // Relinquish player control
        sounds.fadeOutMusic(800);
    }

    startWinSequence() {
        this.winPhase = 'WALK_OUT';
        this.winTimer = 0;
        this.winFadeAlpha = 0.0;
        this.keys = {}; // Force all control keys (arrows) to lose connection as if player removed hand from keyboard
        this.player.invulnerableTimer = 99999;
        this.winWalkStartX = null;
        this.winWalkTargetX = null;
        sounds.fadeOutMusic(1600);
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

        // Loss Transition Sequence (fade screen to black before lost dog poster)
        if (this.lossPhase === 'FADE_OUT') {
            this.lossTimer++;
            this.currentSpeed = Math.max(0, this.currentSpeed * 0.90);
            this.world.update(this.currentSpeed);

            // Allow any airborne drop to land naturally on ground
            if (!this.player.isGrounded) {
                this.player.vy += this.player.gravity;
                this.player.y += this.player.vy;
                if (this.player.y >= this.player.groundY) {
                    this.player.y = this.player.groundY;
                    this.player.vy = 0;
                    this.player.isGrounded = true;
                }
            }

            // Smoothly fade screen to black over ~45 frames (0.75s)
            this.lossFadeAlpha = Math.min(1.0, this.lossTimer / 45);

            // Once fully black, trigger Game Over modal with lost dog poster
            if (this.lossTimer >= 48 && this.lossFadeAlpha >= 1.0) {
                this.gameOver();
            }
            return;
        }

        if (this.player.isDead) {
            this.startLossSequence();
            return;
        }

        // Win Transition Sequence: Phase 1 (Walk Out) & Phase 2 (Joy Hop)
        if (this.winPhase === 'WALK_OUT') {
            this.winTimer++;

            // Gently decelerate ground scrolling so finish signpost settles on screen
            if (this.currentSpeed > 0) {
                this.currentSpeed = Math.max(0, this.currentSpeed - 0.12);
            }
            const scrollSpeed = this.currentSpeed;

            this.world.update(scrollSpeed);
            this.victoryBannerX -= scrollSpeed;
            this.distance = Math.min(this.goalDistance, this.distance + scrollSpeed * 0.04);

            // Move remaining obstacles harmlessly offscreen
            for (let i = this.obstacles.length - 1; i >= 0; i--) {
                const obs = this.obstacles[i];
                obs.update(scrollSpeed);
                if (obs.isOffscreen()) {
                    this.obstacles.splice(i, 1);
                }
            }

            // Physics with controls disconnected (empty keys: as if player removed hand from keyboard):
            // A. If crossing finish line while in the air, complete jump arc and land naturally:
            if (!this.player.isGrounded) {
                this.player.vy += this.player.gravity;
                this.player.y += this.player.vy;
                if (this.player.y >= this.player.groundY) {
                    this.player.y = this.player.groundY;
                    this.player.vy = 0;
                    this.player.isGrounded = true;
                    this.player.state = 'WALK';
                    sounds.playStep();
                } else {
                    this.player.state = 'JUMP';
                }
            } else if (this.player.state === 'CRAWL') {
                // B. If crawling, naturally rise into walk since Down Arrow is no longer pressed
                this.player.isCrawlingUnderBench = false;
                this.player.state = 'WALK';
            }

            // C. Once grounded, walk toward the edge of the screen about 2 sprite lengths
            if (this.player.isGrounded) {
                if (this.winWalkStartX === null) {
                    this.winWalkStartX = this.player.x;
                    const walkDistance = this.player.normalWidth * 2; // ~184px (2 sprite lengths)
                    this.winWalkTargetX = Math.min(this.canvas.width - this.player.normalWidth - 30, this.winWalkStartX + walkDistance);
                }

                this.player.state = 'WALK';
                this.player.x += 2.6; // Brisk forward walk toward the screen edge

                // Step walk animation frames
                this.player.animTimer += 0.065 * 4.0;
                if (this.player.animTimer >= 1.0) {
                    this.player.animTimer = 0;
                    this.player.walkFrame = (this.player.walkFrame + 1) % 8;
                }

                // When JoJo has walked the 2 sprite lengths, transition to happy bouncing dance
                if (this.player.x >= this.winWalkTargetX) {
                    this.winPhase = 'JOY_HOP';
                    this.winTimer = 0;
                    this.player.startVictoryJoy();
                    this.currentSpeed = 0;
                }
            }

            // Update HUD
            this.updateHUD();
            return;
        }

        if (this.winPhase === 'JOY_HOP') {
            this.winTimer++;
            this.currentSpeed = 0;

            // JoJo does the happy bouncing dance (higher bounce)
            this.player.update({}, [], 0);

            // Let JoJo bounce happily in full view for ~65 frames (~2.7 hops) before fading to black
            if (this.winTimer < 65) {
                this.winFadeAlpha = 0.0;
            } else {
                this.winFadeAlpha = Math.min(1.0, (this.winTimer - 65) / 45);
            }

            // Once fully black, show victory newspaper screen and play happy music
            if (this.winTimer >= 115 && this.winFadeAlpha >= 1.0) {
                this.stageClear();
            }
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
            scrollSpeed *= 1.10; // Halved forward dash boost (previously 1.20)
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
            if (this.victoryBannerX < this.player.x + 40 && this.winPhase === null) {
                this.startWinSequence();
                return;
            }
        }

        // 4. Obstacle Spawning (no benches, holes, or enemies in the last 50 meters of the course)
        const inLast50m = (this.difficulty !== 'endless' && this.distance >= this.goalDistance - 50);
        if (this.victoryBannerX === -999 && !inLast50m) {
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

                // Check collision with cat (immune during win sequence)
                if (this.winPhase === null && this.boxesOverlap(playerBox, catBox)) {
                    // Safe if cat is on bench and player is crawling underneath
                    const safeUnderBench = obs.onBench && this.player.state === 'CRAWL' && this.player.y >= this.player.groundY - 10;
                    if (!safeUnderBench) {
                        this.player.takeDamage();
                    }
                }
            } else if (obs.type === 'squirrel') {
                obs.update(scrollSpeed, this.player.x, this.acorns);
            } else if (obs.type === 'hole') {
                obs.update(scrollSpeed);
                if (this.winPhase === null && obs.checkCollision(this.player)) {
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

            if (this.winPhase === null && this.boxesOverlap(playerBox, acorn.getHitbox())) {
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
        this.winPhase = 'STAGE_CLEAR';
        this.keys = {}; // Reset all input keys

        // Upbeat victory music fades in as victory screen fades in from black
        sounds.fadeInVictory(1400);

        const vicOverlay = document.getElementById('victoryOverlay');
        if (vicOverlay) {
            vicOverlay.classList.remove('hidden');
            vicOverlay.classList.remove('fade-in-from-black');
            void vicOverlay.offsetWidth;
            vicOverlay.classList.add('fade-in-from-black');
        }

        const diffEl = document.getElementById('vic-difficulty');
        if (diffEl) diffEl.textContent = this.difficulty.toUpperCase();

        const scoreEl = document.getElementById('vic-score');
        if (scoreEl) scoreEl.textContent = this.score;

        const baconEl = document.getElementById('vic-bacon');
        if (baconEl && this.player) baconEl.textContent = this.player.baconCount;
    }

    gameOver() {
        this.state = 'GAME_OVER';
        sounds.stopMusic();
        sounds.playGameOver();
        this.keys = {}; // Reset all input keys

        const goOverlay = document.getElementById('gameoverOverlay');
        if (goOverlay) {
            goOverlay.classList.remove('hidden');
            goOverlay.classList.remove('fade-in-from-black');
            void goOverlay.offsetWidth;
            goOverlay.classList.add('fade-in-from-black');
        }
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
                distEl.textContent = `${Math.min(this.goalDistance, Math.floor(this.distance))} / ${this.goalDistance}m`;
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

        // 6. Finish Line Signpost (only if playing/cleared near 1000m)
        if (this.state !== 'MENU' && this.victoryBannerX > -500) {
            this.drawFinishGate(this.ctx, this.victoryBannerX);
        }

        // 7. Particles
        for (const p of this.particles) {
            this.ctx.fillStyle = p.color;
            this.ctx.globalAlpha = p.life / p.maxLife;
            this.ctx.fillRect(p.x, p.y, p.size, p.size);
        }
        this.ctx.globalAlpha = 1.0;

        // 8. Cinematic Screen Fade to Black (Victory & Loss)
        const blackAlpha = Math.max(this.winFadeAlpha || 0, this.lossFadeAlpha || 0);
        if (blackAlpha > 0) {
            this.ctx.fillStyle = '#000000';
            this.ctx.globalAlpha = Math.min(1.0, Math.max(0.0, blackAlpha));
            this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
            this.ctx.globalAlpha = 1.0;
        }
    }

    drawFinishGate(ctx, x) {
        const groundY = this.player.groundY;

        // Rendered rustic Dog Park Signpost PNG (standalone end-of-trail marker)
        const signW = 180;
        const signH = 185;
        const signX = x + 30;
        const signY = groundY - signH + 10;
        sprites.draw(ctx, 'signpost_dogpark', signX, signY, signW, signH);
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

    resetLoopTiming() {
        this.lastLoopTime = performance.now();
        this.loopAccumulator = 0;
    }

    startLoop() {
        if (this.loopStarted) return;
        this.loopStarted = true;

        this.lastLoopTime = performance.now();
        this.loopAccumulator = 0;
        const FIXED_STEP = 1000 / 60; // Exact 60 ticks/second (16.6667 ms)
        const MAX_FRAME_TIME = 100; // Guard against huge delta leaps when tab is backgrounded

        const loop = (currentTime) => {
            if (!this.lastLoopTime) this.lastLoopTime = currentTime;
            const frameTime = Math.min(currentTime - this.lastLoopTime, MAX_FRAME_TIME);
            this.lastLoopTime = currentTime;
            this.loopAccumulator = (this.loopAccumulator || 0) + frameTime;

            while (this.loopAccumulator >= FIXED_STEP) {
                this.update();
                this.loopAccumulator -= FIXED_STEP;
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
