// JoJo's Journey Bundled Game Script (Works offline & local file://)


// Procedural 8-Bit Web Audio Synthesizer for JoJo's Journey

class SoundManager {
    constructor() {
        this.ctx = null;
        this.muted = localStorage.getItem('jojo_muted') === 'true';
        this.musicPlaying = false;
        this.bgFadeInterval = null;
        this.victoryFadeInterval = null;

        // Music Tracks
        try {
            this.bgMusic = new Audio('assets/music/background_song.mp3');
            this.bgMusic.loop = true;
            this.bgMusic.preload = 'auto';

            this.happyMusic = new Audio('assets/music/happy_song.mp3');
            this.happyMusic.preload = 'auto';

            this.sadMusic = new Audio('assets/music/sad_song.mp3');
            this.sadMusic.preload = 'auto';
        } catch (e) {
            this.bgMusic = null;
            this.happyMusic = null;
            this.sadMusic = null;
        }
    }

    init() {
        if (!this.ctx) {
            const AudioCtx = window.AudioContext || window.webkitAudioContext;
            this.ctx = new AudioCtx();
        }
        if (this.ctx && this.ctx.state === 'suspended') {
            this.ctx.resume();
        }
    }

    clearFades() {
        if (this.bgFadeInterval) {
            clearInterval(this.bgFadeInterval);
            this.bgFadeInterval = null;
        }
        if (this.victoryFadeInterval) {
            clearInterval(this.victoryFadeInterval);
            this.victoryFadeInterval = null;
        }
    }

    stopJingles() {
        this.clearFades();
        if (this.happyMusic) {
            try {
                this.happyMusic.pause();
                this.happyMusic.currentTime = 0;
            } catch (e) {}
        }
        if (this.sadMusic) {
            try {
                this.sadMusic.pause();
                this.sadMusic.currentTime = 0;
            } catch (e) {}
        }
    }

    toggleMute() {
        this.muted = !this.muted;
        localStorage.setItem('jojo_muted', this.muted);
        if (this.muted) {
            this.clearFades();
            if (this.bgMusic) {
                try { this.bgMusic.pause(); } catch (e) {}
            }
            this.stopJingles();
        } else if (this.musicPlaying) {
            if (this.bgMusic) {
                try { this.bgMusic.play().catch(e => {}); } catch (e) {}
            }
        }
        return this.muted;
    }

    playTone(freq, type, duration, startVol = 0.2, endVol = 0, slideFreq = null) {
        if (this.muted) return;
        this.init();
        try {
            const now = this.ctx.currentTime;
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();

            osc.type = type;
            osc.frequency.setValueAtTime(freq, now);
            if (slideFreq !== null) {
                osc.frequency.exponentialRampToValueAtTime(Math.max(10, slideFreq), now + duration);
            }

            gain.gain.setValueAtTime(startVol, now);
            gain.gain.exponentialRampToValueAtTime(Math.max(0.0001, endVol), now + duration);

            osc.connect(gain);
            gain.connect(this.ctx.destination);

            osc.start(now);
            osc.stop(now + duration);
        } catch (e) {
            console.warn('Audio play error:', e);
        }
    }

    playJump() {
        if (this.muted) return;
        this.init();
        // Upward pitch bend square wave
        this.playTone(180, 'square', 0.22, 0.2, 0.001, 520);
    }

    playBark() {
        if (this.muted) return;
        this.init();
        // Cute double "woof"
        const now = this.ctx.currentTime;
        this.playTone(280, 'sawtooth', 0.12, 0.25, 0.01, 140);
        setTimeout(() => {
            this.playTone(340, 'sawtooth', 0.15, 0.3, 0.01, 160);
        }, 120);
    }

    playBacon() {
        if (this.muted) return;
        this.init();
        // Cheerful ascending arpeggio (C E G C)
        const notes = [523.25, 659.25, 783.99, 1046.50];
        notes.forEach((freq, idx) => {
            setTimeout(() => {
                this.playTone(freq, 'triangle', 0.14, 0.22, 0.001);
            }, idx * 60);
        });
    }

    playHurt() {
        if (this.muted) return;
        this.init();
        // Downward buzz thud
        this.playTone(220, 'sawtooth', 0.28, 0.35, 0.001, 55);
    }

    playCatSwipe() {
        if (this.muted) return;
        this.init();
        // Sharp white noise / scratch whoosh
        try {
            const now = this.ctx.currentTime;
            const bufferSize = this.ctx.sampleRate * 0.18;
            const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
            const data = buffer.getChannelData(0);
            for (let i = 0; i < bufferSize; i++) {
                data[i] = Math.random() * 2 - 1;
            }
            const noise = this.ctx.createBufferSource();
            noise.buffer = buffer;
            const filter = this.ctx.createBiquadFilter();
            filter.type = 'bandpass';
            filter.frequency.setValueAtTime(1600, now);
            filter.frequency.exponentialRampToValueAtTime(400, now + 0.18);

            const gain = this.ctx.createGain();
            gain.gain.setValueAtTime(0.25, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);

            noise.connect(filter);
            filter.connect(gain);
            gain.connect(this.ctx.destination);

            noise.start(now);
        } catch (e) {}
    }

    playAcornThrow() {
        if (this.muted) return;
        this.init();
        this.playTone(600, 'sine', 0.15, 0.2, 0.001, 200);
    }

    playStep() {
        if (this.muted) return;
        // Subtle soft tap
        this.playTone(120, 'triangle', 0.04, 0.05, 0.001, 80);
    }

    playVictory() {
        this.stopMusic();
        this.stopJingles();
        if (this.muted) return;
        this.init();

        // Play the victory happy song track
        if (this.happyMusic) {
            try {
                this.happyMusic.currentTime = 0;
                this.happyMusic.volume = 0.80;
                const playPromise = this.happyMusic.play();
                if (playPromise) {
                    playPromise.catch(e => console.warn('Happy song playback prevented:', e));
                }
            } catch (e) {
                console.warn(e);
            }
        }
    }

    playGameOver() {
        this.stopMusic();
        this.stopJingles();
        if (this.muted) return;
        this.init();

        // Play the melancholic sad song track
        if (this.sadMusic) {
            try {
                this.sadMusic.currentTime = 0;
                this.sadMusic.volume = 0.80;
                const playPromise = this.sadMusic.play();
                if (playPromise) {
                    playPromise.catch(e => console.warn('Sad song playback prevented:', e));
                }
            } catch (e) {
                console.warn(e);
            }
        }
    }

    startMusic() {
        this.stopJingles();
        this.musicPlaying = true;
        if (this.muted) return;
        this.init();

        // Play the standard walking music track (assets/music/background_song.mp3)
        if (this.bgMusic) {
            try {
                this.bgMusic.currentTime = 0;
                this.bgMusic.volume = 0.60;
                const playPromise = this.bgMusic.play();
                if (playPromise) {
                    playPromise.catch(e => console.warn('Background song playback prevented:', e));
                }
            } catch (e) {
                console.warn(e);
            }
        }
    }

    fadeOutMusic(durationMs = 1500) {
        if (!this.bgMusic || this.muted) {
            this.stopMusic();
            return;
        }
        if (this.bgFadeInterval) {
            clearInterval(this.bgFadeInterval);
            this.bgFadeInterval = null;
        }

        const startVol = this.bgMusic.volume;
        if (startVol <= 0) {
            this.stopMusic();
            return;
        }

        const interval = 40;
        const steps = Math.max(1, Math.floor(durationMs / interval));
        let step = 0;

        this.bgFadeInterval = setInterval(() => {
            step++;
            const progress = step / steps;
            const newVol = Math.max(0, startVol * (1 - progress));
            if (this.bgMusic) {
                this.bgMusic.volume = newVol;
            }
            if (step >= steps || newVol <= 0) {
                if (this.bgFadeInterval) {
                    clearInterval(this.bgFadeInterval);
                    this.bgFadeInterval = null;
                }
                this.stopMusic();
                if (this.bgMusic) {
                    this.bgMusic.volume = 0.60; // Reset for next game
                }
            }
        }, interval);
    }

    fadeInVictory(durationMs = 1400, targetVolume = 0.80) {
        this.clearFades();
        this.stopMusic();
        this.stopJingles();
        if (this.muted) return;
        this.init();

        if (this.happyMusic) {
            try {
                this.happyMusic.currentTime = 0;
                this.happyMusic.volume = 0;
                const playPromise = this.happyMusic.play();
                if (playPromise) {
                    playPromise.catch(e => console.warn('Happy song playback prevented:', e));
                }

                const interval = 40;
                const steps = Math.max(1, Math.floor(durationMs / interval));
                let step = 0;

                this.victoryFadeInterval = setInterval(() => {
                    step++;
                    const progress = Math.min(1.0, step / steps);
                    if (this.happyMusic && !this.muted) {
                        this.happyMusic.volume = targetVolume * progress;
                    }
                    if (step >= steps) {
                        if (this.happyMusic && !this.muted) {
                            this.happyMusic.volume = targetVolume;
                        }
                        if (this.victoryFadeInterval) {
                            clearInterval(this.victoryFadeInterval);
                            this.victoryFadeInterval = null;
                        }
                    }
                }, interval);
            } catch (e) {
                console.warn(e);
            }
        }
    }

    stopMusic() {
        this.clearFades();
        this.musicPlaying = false;
        if (this.bgMusic) {
            try {
                this.bgMusic.pause();
                this.bgMusic.currentTime = 0;
            } catch (e) {}
        }
    }
}

const sounds = new SoundManager();

// Sprite Loader and Animator for JoJo's Journey

class SpriteManager {
    constructor() {
        this.images = {};
        this.loaded = false;
        this.totalImages = 0;
        this.loadedImages = 0;
    }

    async loadAll() {
        const manifest = {
            'walk_0': 'assets/sprites/jojo_walk/walk_0.png',
            'walk_1': 'assets/sprites/jojo_walk/walk_1.png',
            'walk_2': 'assets/sprites/jojo_walk/walk_2.png',
            'walk_3': 'assets/sprites/jojo_walk/walk_3.png',
            'walk_4': 'assets/sprites/jojo_walk/walk_4.png',
            'walk_5': 'assets/sprites/jojo_walk/walk_5.png',
            'walk_6': 'assets/sprites/jojo_walk/walk_6.png',
            'walk_7': 'assets/sprites/jojo_walk/walk_7.png',

            'crawl_0': 'assets/sprites/jojo_crawl/crawl_0.png',
            'crawl_1': 'assets/sprites/jojo_crawl/crawl_1.png',
            'crawl_2': 'assets/sprites/jojo_crawl/crawl_2.png',
            'crawl_3': 'assets/sprites/jojo_crawl/crawl_3.png',
            'crawl_4': 'assets/sprites/jojo_crawl/crawl_4.png',
            'crawl_5': 'assets/sprites/jojo_crawl/crawl_5.png',
            'crawl_6': 'assets/sprites/jojo_crawl/crawl_6.png',
            'crawl_7': 'assets/sprites/jojo_crawl/crawl_7.png',

            'jump_0': 'assets/sprites/jojo_jump/jump_0.png',
            'jump_1': 'assets/sprites/jojo_jump/jump_1.png',
            'jump_2': 'assets/sprites/jojo_jump/jump_2.png',
            'jump_3': 'assets/sprites/jojo_jump/jump_3.png',
            'jump_4': 'assets/sprites/jojo_jump/jump_4.png',
            'jump_5': 'assets/sprites/jojo_jump/jump_5.png',

            'stand_0': 'assets/sprites/jojo_stand/stand_0.png',

            'bark_0': 'assets/sprites/jojo_bark/bark_0.png',
            'bark_1': 'assets/sprites/jojo_bark/bark_1.png',

            // Fat Cat (Orange Tabby) from assets/cat/fat/
            'cat_fat_sit': 'assets/cat/fat/cat_sit.png',
            'cat_fat_swipe_left': 'assets/cat/fat/cat_swipe_left.png',
            'cat_fat_swipe_right': 'assets/cat/fat/cat_swipe_right.png',

            // Default cat aliases pointing to fat cat
            'cat_sit': 'assets/cat/fat/cat_sit.png',
            'cat_swipe_left': 'assets/cat/fat/cat_swipe_left.png',
            'cat_swipe_right': 'assets/cat/fat/cat_swipe_right.png',

            // Mangy Cat (Tuxedo)
            'cat_mangy_stand_1': 'assets/sprites/cat/mangy/cat_stand_1.png',
            'cat_mangy_stand_2': 'assets/sprites/cat/mangy/cat_stand_2.png',
            'cat_mangy_crouch': 'assets/sprites/cat/mangy/cat_crouch.png',
            'cat_mangy_leap_1': 'assets/sprites/cat/mangy/cat_leap_1.png',
            'cat_mangy_leap_2': 'assets/sprites/cat/mangy/cat_leap_2.png',
            'cat_mangy_leap_3': 'assets/sprites/cat/mangy/cat_leap_3.png',
            'cat_mangy_land': 'assets/sprites/cat/mangy/cat_land.png',
            'cat_mangy_pounce_ready': 'assets/sprites/cat/mangy/cat_pounce_ready.png',

            'sq_popup': 'assets/sprites/squirrel/sq_popup.png',
            'sq_holdup': 'assets/sprites/squirrel/sq_holdup.png',
            'sq_throw': 'assets/sprites/squirrel/sq_throw.png',

            'acorn': 'assets/sprites/items/acorn.png',
            'bacon': 'assets/sprites/items/bacon.png',
            'hole': 'assets/sprites/items/hole.png',
            'bench': 'assets/sprites/items/bench.png',
            'bench_bg': 'assets/sprites/items/bench_bg.png',
            'bench_fg': 'assets/sprites/items/bench_fg.png',

            'cloud_large': 'assets/sprites/environment/cloud_large.png',
            'cloud_small_1': 'assets/sprites/environment/cloud_small_1.png',
            'cloud_small_2': 'assets/sprites/environment/cloud_small_2.png',
            'bush_blue_berries': 'assets/sprites/environment/bush_blue_berries.png',
            'bush_pink_flowers': 'assets/sprites/environment/bush_pink_flowers.png',
            'bush_red_berries': 'assets/sprites/environment/bush_red_berries.png',
            'tree_pine': 'assets/sprites/environment/tree_pine.png',
            'tree_birch': 'assets/sprites/environment/tree_birch.png',
            'tree_oak': 'assets/sprites/environment/tree_oak.png',
            'tree_pine_birch_pair': 'assets/sprites/environment/tree_pine_birch_pair.png',
            'fence_wood': 'assets/sprites/environment/fence_wood.png',
            'grass_fringe': 'assets/sprites/environment/grass_fringe.png',
            'dirt_trail': 'assets/sprites/environment/dirt_trail.png',
            'soil_cutaway': 'assets/sprites/environment/soil_cutaway.png',
            'signpost_dogpark': 'assets/sprites/environment/signpost_dogpark.png',
        };

        const keys = Object.keys(manifest);
        this.totalImages = keys.length;

        const promises = keys.map(key => {
            return new Promise((resolve, reject) => {
                const img = new Image();
                img.onload = () => {
                    this.images[key] = img;
                    this.loadedImages++;
                    resolve();
                };
                img.onerror = () => {
                    // Try alternate path (assets/cat/ <-> assets/sprites/cat/) if applicable
                    const originalSrc = manifest[key];
                    let altSrc = null;
                    if (originalSrc.includes('assets/cat/')) {
                        altSrc = originalSrc.replace('assets/cat/', 'assets/sprites/cat/');
                    } else if (originalSrc.includes('assets/sprites/cat/')) {
                        altSrc = originalSrc.replace('assets/sprites/cat/', 'assets/cat/');
                    }

                    if (altSrc && img.src !== altSrc) {
                        img.onerror = () => {
                            console.error(`Failed to load sprite: ${originalSrc} (and alt: ${altSrc})`);
                            resolve();
                        };
                        img.src = altSrc;
                        return;
                    }

                    console.error(`Failed to load sprite: ${originalSrc}`);
                    resolve();
                };
                img.src = manifest[key];
            });
        });

        await Promise.all(promises);
        this.loaded = true;
        return this;
    }

    get(key) {
        return this.images[key] || null;
    }

    draw(ctx, key, x, y, width, height, flipX = false, alpha = 1.0) {
        const img = this.images[key];
        if (!img) return;

        ctx.save();
        ctx.globalAlpha = alpha;
        if (flipX) {
            ctx.translate(x + width, y);
            ctx.scale(-1, 1);
            ctx.drawImage(img, 0, 0, width, height);
        } else {
            ctx.drawImage(img, x, y, width, height);
        }
        ctx.restore();
    }
}

const sprites = new SpriteManager();

// Obstacles, Enemies, Hazards, and Collectibles for JoJo's Journey


class Bench {
    constructor(x, groundY) {
        this.type = 'bench';
        this.x = x;
        this.width = 390;   // Generous park bench width
        this.height = 142;  // Height from ground to top of backrest slats
        this.groundY = groundY; // 438
        this.y = groundY - this.height; // 296
        // In the tightly cropped 2246x805 master sprite:
        // Seat plank top is at 44.35% from top of bench
        // 142 * 0.4435 = 63px. Seat top is at 296 + 63 = 359
        // Clearance under seat plank to ground: 438 - 371 = 67px (ample space for 62px crawl)
        this.seatOffset = 63;
        this.hasCat = false;
    }

    update(scrollSpeed) {
        this.x -= scrollSpeed;
    }

    draw(ctx) {
        // Draw backrest slats, rear legs, and wooden seat plank (background layer)
        const bgImg = sprites.get('bench_bg');
        if (bgImg) {
            sprites.draw(ctx, 'bench_bg', this.x, this.y, this.width, this.height);
        } else {
            sprites.draw(ctx, 'bench', this.x, this.y, this.width, this.height);
        }
    }

    drawForeground(ctx) {
        // Draw front legs and hanging ivy in front of crawling player / cats
        const fgImg = sprites.get('bench_fg');
        if (fgImg) {
            sprites.draw(ctx, 'bench_fg', this.x, this.y, this.width, this.height);
        }
    }

    isOffscreen() {
        return this.x + this.width < -120;
    }
}

class Hole {
    constructor(x, groundY) {
        this.type = 'hole';
        this.x = x;
        this.width = 160;
        this.height = 65;
        this.groundY = groundY;
        this.y = groundY - 30; // embedded in ground
    }

    update(scrollSpeed) {
        this.x -= scrollSpeed;
    }

    draw(ctx) {
        sprites.draw(ctx, 'hole', this.x, this.y, this.width, this.height);
    }

    drawForeground(ctx) {
        // Front rim of the hole provides natural occlusion over objects inside the hole
        const img = sprites.get('hole');
        if (!img) return;
        const halfH = img.height / 2;
        ctx.drawImage(
            img,
            0, halfH, img.width, halfH,
            this.x, this.y + this.height / 2, this.width, this.height / 2
        );
    }

    isOffscreen() {
        return this.x + this.width < -100;
    }

    checkCollision(player) {
        // Only triggers if player is on ground level (not jumping or not on a bench)
        if (player.y >= player.groundY - 5 && !player.currentPlatform) {
            const playerFeetX = player.x + player.normalWidth * 0.45;
            const holeStart = this.x + 30;
            const holeEnd = this.x + this.width - 30;
            if (playerFeetX >= holeStart && playerFeetX <= holeEnd) {
                return true;
            }
        }
        return false;
    }
}

// Fat Cat (Orange Tabby) - Lounges lazily and swipes claw when JoJo gets near
class FatCat {
    constructor(x, y, onBench = false, benchRef = null) {
        this.type = 'cat';
        this.breed = 'fat';
        this.x = x;
        this.y = y; // base foot Y (on ground or on bench seat plank)
        this.width = 85;
        this.height = 95;
        this.onBench = onBench;
        this.benchRef = benchRef;

        this.state = 'sit'; // 'sit', 'swipe'
        this.swipeTimer = 0;
        this.hasSwiped = false;
    }

    update(scrollSpeed, playerX, playerY) {
        this.x -= scrollSpeed;
        if (this.onBench && this.benchRef) {
            this.x = this.benchRef.x + (this.benchRef.width - this.width) / 2;
        }

        // Check distance to player for triggering claw swipe
        const dist = (this.x) - (playerX + 50);
        if (dist > 0 && dist < 140 && !this.hasSwiped) {
            this.state = 'swipe';
            this.swipeTimer = 35;
            this.hasSwiped = true;
            sounds.playCatSwipe();
        }

        if (this.swipeTimer > 0) {
            this.swipeTimer--;
            if (this.swipeTimer <= 0) {
                this.state = 'sit';
            }
        }
    }

    getHitbox() {
        const w = this.state === 'swipe' ? this.width + 15 : this.width * 0.8;
        const h = this.height * 0.8;
        const x = this.state === 'swipe' ? this.x - 20 : this.x + 5;
        const y = this.y - h;
        return { x, y, width: w, height: h, onBench: this.onBench };
    }

    draw(ctx) {
        let key = 'cat_fat_sit';
        let w = this.width;
        let h = this.height;
        let drawX = this.x;

        if (this.state === 'swipe') {
            key = 'cat_fat_swipe_left';
            w = this.width + 25;
            drawX = this.x - 25;
        }

        sprites.draw(ctx, key, drawX, this.y - h, w, h);
    }

    isOffscreen() {
        return this.x + this.width < -120;
    }
}

// Mangy Cat (Tuxedo) - Appears and immediately jumps forward, wiggles, makes a calculated pounce toward JoJo, and (if time and luck allow) jumps backward a 3rd time with very little rest
class MangyCat {
    constructor(x, y, onBench = false, benchRef = null, difficulty = 'medium') {
        this.type = 'cat';
        this.breed = 'mangy';
        this.x = x;
        this.y = y; // base foot Y
        this.baseGroundY = 438;
        this.difficulty = difficulty;
        this.width = 98;
        this.height = 114;
        this.onBench = onBench;
        this.benchRef = benchRef;

        // Choreography & States:
        // 'SPAWN_PREP' -> immediately appears and prepares to jump forward (6-10 ticks)
        // 'LEAP'       -> airborne in high arc
        // 'LAND'       -> landing impact recovery (with dust puff)
        // 'WIGGLE'     -> tense nervous rocking/wiggling before calculated pounce
        // 'SHIFT'      -> idle stance
        this.state = onBench ? 'SHIFT' : 'SPAWN_PREP';
        this.standPose = 1;
        this.shiftTimer = 0;
        this.landTimer = 0;
        this.spawnPrepTimer = 6 + Math.floor(Math.random() * 5); // Immediate jump forward!
        this.wiggleTimer = 0;
        this.wigglePhase = 0;
        this.jumpStep = 0; // 1: jump forward, 2: calculated pounce, 3: jump backward
        this.facing = 'left';

        // Leap physics
        this.vx = 0;
        this.vy = 0;
        this.gravity = 0.42;

        this.jumpCooldown = onBench ? 45 : 10;
    }

    update(scrollSpeed, playerX, playerY, particles = null) {
        if (this.state !== 'LEAP') {
            this.facing = (playerX <= this.x + 20) ? 'left' : 'right';
        }

        // If perched on a bench and not leaping, anchor to the bench seat
        if (this.onBench && this.benchRef && this.state !== 'LEAP') {
            this.x = this.benchRef.x + (this.benchRef.width - this.width) / 2;
            this.y = this.benchRef.y + this.benchRef.seatOffset;
            this.jumpCooldown--;
            if (this.jumpCooldown <= 0) {
                this.startFirstJump(scrollSpeed, playerX);
            }
        } else if (this.state !== 'LEAP') {
            this.x -= scrollSpeed;
        }

        // State Machine
        if (this.state === 'SPAWN_PREP') {
            this.spawnPrepTimer--;
            this.facing = (playerX <= this.x + 20) ? 'left' : 'right';
            if (this.spawnPrepTimer <= 0) {
                this.startFirstJump(scrollSpeed, playerX);
            }
        } else if (this.state === 'LEAP') {
            this.x += this.vx - scrollSpeed;
            this.vy += this.gravity;
            this.y += this.vy;

            // Landing check on dirt trail
            if (this.y >= this.baseGroundY && this.vy >= 0) {
                this.y = this.baseGroundY;
                this.vy = 0;
                this.vx = 0;
                this.onBench = false;
                this.benchRef = null;
                this.state = 'LAND';

                // Dust particle impact on landing
                if (particles) {
                    for (let p = 0; p < 6; p++) {
                        particles.push({
                            x: this.x + 20 + Math.random() * 50,
                            y: this.y - 4,
                            vx: (Math.random() - 0.5) * 5,
                            vy: -Math.random() * 3 - 1,
                            color: '#8a6845',
                            life: 20,
                            maxLife: 20,
                            size: 3 + Math.random() * 3
                        });
                    }
                }

                // Landing recovery time: very little rest after Jump 2!
                if (this.jumpStep === 1) {
                    this.landTimer = 10;
                } else if (this.jumpStep === 2) {
                    this.landTimer = 8; // Very little rest time!
                } else {
                    this.landTimer = 14;
                }
            }
        } else if (this.state === 'LAND') {
            this.landTimer--;
            if (this.landTimer <= 0) {
                if (this.jumpStep === 1) {
                    // Jump 1 complete: enter wiggle before calculated pounce
                    this.state = 'WIGGLE';
                    this.wiggleTimer = 26 + Math.floor(Math.random() * 8); // Tense wiggle
                    this.wigglePhase = 0;
                } else if (this.jumpStep === 2) {
                    // Jump 2 complete: jump backward a third time if time and luck allow
                    let luckChance = 0.35;
                    if (this.difficulty === 'medium') luckChance = 0.65;
                    else if (this.difficulty === 'hard' || this.difficulty === 'endless') luckChance = 0.85;

                    const timeAllows = (this.x > -60 && this.x < 960);
                    const luckAllows = (Math.random() < luckChance);

                    if (timeAllows && luckAllows) {
                        this.startBackwardJump(scrollSpeed, playerX);
                    } else {
                        this.state = 'SHIFT';
                        this.jumpCooldown = 180;
                    }
                } else {
                    this.state = 'SHIFT';
                    this.jumpCooldown = 180;
                }
            }
        } else if (this.state === 'WIGGLE') {
            this.wiggleTimer--;
            this.wigglePhase += 0.45; // Rapid nervous wiggle
            this.facing = (playerX <= this.x + 20) ? 'left' : 'right';

            if (this.wiggleTimer <= 0) {
                this.startCalculatedPounce(scrollSpeed, playerX);
            }
        } else if (this.state === 'SHIFT') {
            this.shiftTimer++;
            if (this.shiftTimer >= 10) {
                this.shiftTimer = 0;
                this.standPose = this.standPose === 1 ? 2 : 1;
            }
        }
    }

    startFirstJump(scrollSpeed = 5.0, playerX = null) {
        this.jumpStep = 1;
        this.state = 'LEAP';
        sounds.playCatSwipe();
        this.onBench = false;
        this.benchRef = null;

        this.vy = -11.5;
        if (playerX !== null && playerX > this.x + 20) {
            // JoJo is already ahead: bounce forward faster than scroll speed
            this.vx = scrollSpeed + 4.0;
            this.facing = 'right';
        } else {
            // Immediately jump forward into the screen toward JoJo
            this.vx = -4.5;
            this.facing = 'left';
        }
    }

    startCalculatedPounce(scrollSpeed, playerX) {
        this.jumpStep = 2;
        this.state = 'LEAP';
        sounds.playCatSwipe();
        this.onBench = false;
        this.benchRef = null;

        // High calculated pounce arc
        this.vy = -12.5;
        const airTime = (Math.abs(this.vy) / this.gravity) * 2; // ~60 ticks

        // Pounce directly at JoJo's position
        const targetX = playerX + 25;
        const dx = targetX - this.x;

        if (dx > 0) {
            // JoJo is ahead of the cat (cat was passed or landed behind JoJo).
            // Bounce forward at faster than scroll speed to get a second chance at hitting JoJo!
            const forwardSpeedNeeded = dx / airTime;
            const extraForward = Math.max(3.8, Math.min(7.2, forwardSpeedNeeded + 1.5));
            this.vx = scrollSpeed + extraForward;
            this.facing = 'right';
        } else {
            // JoJo is in front of the cat (to the left)
            const requiredVx = scrollSpeed + dx / airTime;
            this.vx = Math.max(-8.5, Math.min(-2.5, requiredVx));
            this.facing = 'left';
        }
    }

    startThirdJump(scrollSpeed, playerX) {
        this.jumpStep = 3;
        this.state = 'LEAP';
        sounds.playCatSwipe();
        this.onBench = false;
        this.benchRef = null;

        this.vy = -11.5;
        if (playerX > this.x + 20) {
            // Vaults forward to the right faster than scroll speed
            this.vx = scrollSpeed + 4.8;
            this.facing = 'right';
        } else {
            this.vx = -4.5;
            this.facing = 'left';
        }
    }

    startBackwardJump(scrollSpeed, playerX) {
        this.startThirdJump(scrollSpeed, playerX);
    }

    getHitbox() {
        let w = this.width * 0.75;
        let h = this.height * 0.75;
        let x = this.x + 12;
        let y = this.y - h;

        if (this.state === 'LEAP') {
            w = this.width * 0.85;
            h = this.height * 0.8;
            y = this.y - h;
        } else if (this.state === 'WIGGLE' || this.state === 'LAND' || this.state === 'SPAWN_PREP') {
            h = this.height * 0.65;
            y = this.y - h;
        }

        return { x, y, width: w, height: h, onBench: this.onBench };
    }

    draw(ctx) {
        let key = 'cat_mangy_stand_1';
        let w = this.width;
        let h = this.height;
        let drawX = this.x;
        let drawY = this.y - h;

        if (this.state === 'SHIFT') {
            key = this.standPose === 1 ? 'cat_mangy_stand_1' : 'cat_mangy_stand_2';
            if (this.onBench) {
                key = this.standPose === 1 ? 'cat_mangy_crouch' : 'cat_mangy_stand_1';
            }
        } else if (this.state === 'SPAWN_PREP') {
            key = 'cat_mangy_stand_2';
        } else if (this.state === 'WIGGLE') {
            key = 'cat_mangy_pounce_ready';
            // Menacing rapid nervous wiggle
            const wiggleOffset = Math.sin(this.wigglePhase) * 7;
            drawX += wiggleOffset;
        } else if (this.state === 'LEAP') {
            if (this.vy < -3) {
                key = 'cat_mangy_leap_1';
                w += 24;
            } else if (this.vy >= -3 && this.vy <= 3) {
                key = 'cat_mangy_leap_2';
                w += 28;
            } else {
                key = 'cat_mangy_leap_3';
                w += 24;
            }
        } else if (this.state === 'LAND') {
            key = 'cat_mangy_land';
            w += 20;
            h = this.height * 0.85;
            drawY = this.y - h;
        }

        const isFlipped = (this.facing === 'left');
        sprites.draw(ctx, key, drawX, drawY, w, h, isFlipped);
    }

    isOffscreen() {
        return this.x + this.width < -140;
    }
}

// GrumpyCat alias for backwards compatibility
const GrumpyCat = FatCat;

class Acorn {
    constructor(x, y, vx, vy, gravity = 0.20) {
        this.type = 'acorn';
        this.x = x;
        this.y = y;
        this.vx = vx;
        this.vy = vy;
        this.gravity = gravity;
        this.width = 32;
        this.height = 38;
        this.rotation = 0;
    }

    update(scrollSpeed) {
        this.x += this.vx - scrollSpeed;
        this.vy += this.gravity;
        this.y += this.vy;
        this.rotation += (this.vx < 0 ? -0.15 : 0.15);
    }

    getHitbox() {
        return {
            x: this.x + 4,
            y: this.y + 4,
            width: this.width - 8,
            height: this.height - 8
        };
    }

    draw(ctx) {
        ctx.save();
        ctx.translate(this.x + this.width / 2, this.y + this.height / 2);
        ctx.rotate(this.rotation);
        sprites.draw(ctx, 'acorn', -this.width / 2, -this.height / 2, this.width, this.height);
        ctx.restore();
    }

    isOffscreen() {
        return this.x < -100 || this.x > 1100 || this.y > 600;
    }
}

class Squirrel {
    constructor(x, groundY) {
        this.type = 'squirrel';
        this.x = x;
        this.groundY = groundY;
        this.y = groundY;
        this.width = 82;
        this.height = 92;

        this.stage = 'hidden';
        this.timer = 0;
        this.hasThrown = false;
        // Squirrels appear even earlier with randomized popup distance (720 - 920px)
        this.triggerDist = 720 + Math.floor(Math.random() * 200);
        this.hasSecondAcorn = Math.random() < 0.30; // 30% chance of follow-up throw after passing
        this.hasThrownSecond = false;
        this.facing = 'left'; // 'left' when JoJo is ahead, 'right' when JoJo passes
    }

    update(scrollSpeed, playerX, acornList) {
        this.x -= scrollSpeed;
        const distToPlayer = this.x - playerX;

        // Stage A: First Acorn Throw (appears even earlier, dramatic high vertical arc)
        if (this.stage === 'hidden' && !this.hasThrown && distToPlayer < this.triggerDist) {
            this.stage = 'popup';
            this.timer = 18;
            this.facing = 'left';
        } else if (this.stage === 'popup') {
            this.timer--;
            if (this.timer <= 0) {
                this.stage = 'holdup';
                this.timer = 20;
            }
        } else if (this.stage === 'holdup') {
            this.timer--;
            if (this.timer <= 0) {
                this.stage = 'throw';
                this.timer = 20;
                if (!this.hasThrown) {
                    this.hasThrown = true;
                    sounds.playAcornThrow();
                    // Lob acorn with high vertical arc directly into JoJo's path
                    const acornX = this.x - 10;
                    const acornY = this.y - 85;
                    const acornVy = -7.8; // High dramatic vertical arc
                    const acornGravity = 0.22;

                    // Calculate flight airtime to reach player ground level
                    const targetGroundY = 438;
                    const riseTime = Math.abs(acornVy) / acornGravity; // ~35.5 ticks
                    const apexY = acornY - (acornVy * acornVy) / (2 * acornGravity);
                    const fallDistance = targetGroundY - apexY;
                    const fallTime = Math.sqrt((2 * fallDistance) / acornGravity); // ~47 ticks
                    const totalAirTime = riseTime + fallTime; // ~82.5 ticks

                    // Aim trajectory lands directly in JoJo's path
                    const targetX = playerX + 15 + Math.random() * 25;
                    const netSpeed = (targetX - acornX) / totalAirTime;
                    const clampedNetSpeed = Math.min(-1.5, Math.max(-8.0, netSpeed));
                    const acornVx = scrollSpeed + clampedNetSpeed;

                    acornList.push(new Acorn(acornX, acornY, acornVx, acornVy, acornGravity));
                }
            }
        } else if (this.stage === 'throw') {
            this.timer--;
            if (this.timer <= 0) {
                this.stage = 'retreat_hold';
                this.timer = 16;
            }
        } else if (this.stage === 'retreat_hold') {
            this.timer--;
            if (this.timer <= 0) {
                this.stage = 'retreat_pop';
                this.timer = 14;
            }
        } else if (this.stage === 'retreat_pop') {
            this.timer--;
            if (this.timer <= 0) {
                this.stage = 'hidden';
            }
        }

        // Stage B: Follow-up Second Acorn (30% chance after JoJo passes the squirrel)
        if (this.hasSecondAcorn && this.hasThrown && !this.hasThrownSecond) {
            // Trigger as soon as JoJo has passed the squirrel
            if (distToPlayer < -20 && this.x > -60) {
                if (this.stage === 'hidden') {
                    this.stage = 'popup_second';
                    this.timer = 12;
                    this.facing = 'right'; // Face right toward JoJo from behind
                }
            }
        }

        if (this.stage === 'popup_second') {
            this.timer--;
            if (this.timer <= 0) {
                this.stage = 'holdup_second';
                this.timer = 12;
            }
        } else if (this.stage === 'holdup_second') {
            this.timer--;
            if (this.timer <= 0) {
                this.stage = 'throw_second';
                this.timer = 18;
                if (!this.hasThrownSecond) {
                    this.hasThrownSecond = true;
                    sounds.playAcornThrow();
                    // Lob follow-up acorn with high arc chasing JoJo
                    const acornX = this.x + this.width + 5;
                    const acornY = this.y - 85;
                    const acornVx = scrollSpeed + 5.2; // Overcome scroll speed to travel right
                    const acornVy = -7.0; // High arc
                    acornList.push(new Acorn(acornX, acornY, acornVx, acornVy, 0.22));
                }
            }
        } else if (this.stage === 'throw_second') {
            this.timer--;
            if (this.timer <= 0) {
                this.stage = 'retreat_second';
                this.timer = 12;
            }
        } else if (this.stage === 'retreat_second') {
            this.timer--;
            if (this.timer <= 0) {
                this.stage = 'hidden';
            }
        }
    }

    draw(ctx) {
        if (this.stage === 'hidden') return;

        let key = 'sq_popup';
        let h = this.height * 0.7;
        let w = this.width * 0.9;

        if (this.stage === 'holdup' || this.stage === 'retreat_hold' || this.stage === 'holdup_second') {
            key = 'sq_holdup';
            h = this.height * 1.1;
            w = this.width;
        } else if (this.stage === 'throw' || this.stage === 'throw_second') {
            key = 'sq_throw';
            h = this.height;
            w = this.width;
        } else if (this.stage === 'popup' || this.stage === 'retreat_pop' || this.stage === 'popup_second' || this.stage === 'retreat_second') {
            key = 'sq_popup';
            h = this.height * 0.7;
            w = this.width * 0.9;
        }

        const flipX = this.facing === 'right';
        sprites.draw(ctx, key, this.x, this.y - h, w, h, flipX);
    }

    isOffscreen() {
        return this.x + this.width < -100;
    }
}

class Bacon {
    constructor(x, y) {
        this.type = 'bacon';
        this.x = x;
        this.baseY = y;
        this.y = y;
        this.width = 38;
        this.height = 70;
        this.bobOffset = Math.random() * Math.PI * 2;
        this.collected = false;
    }

    update(scrollSpeed) {
        this.x -= scrollSpeed;
        this.bobOffset += 0.08;
        this.y = this.baseY + Math.sin(this.bobOffset) * 6;
    }

    getHitbox() {
        return {
            x: this.x,
            y: this.y,
            width: this.width,
            height: this.height
        };
    }

    draw(ctx) {
        if (this.collected) return;

        // Sparkle / glow pulse
        ctx.save();
        ctx.shadowColor = '#ffd700';
        ctx.shadowBlur = 10;
        sprites.draw(ctx, 'bacon', this.x, this.y, this.width, this.height);
        ctx.restore();
    }

    isOffscreen() {
        return this.x + this.width < -100;
    }
}

// JoJo Player Entity


class Player {
    constructor(canvas) {
        this.canvas = canvas;
        this.groundY = 438; // Baseline foot y centered on dirt trail

        // Baseline screen position
        this.baseXRatio = 0.20;
        this.x = this.canvas.width * this.baseXRatio;
        this.targetX = this.x;
        this.y = this.groundY;
        this.vy = 0;
        this.gravity = 0.53;
        this.jumpForce = -15.0;

        // Size metrics for drawing & hitbox
        this.normalWidth = 92;
        this.normalHeight = 118;
        this.crawlWidth = 100;
        this.crawlHeight = 62;

        this.currentPlatform = null;

        // State: 'WALK', 'CRAWL', 'JUMP', 'HURT', 'FALL'
        this.state = 'WALK';
        this.isGrounded = true;

        // Animations
        this.animTimer = 0;
        this.walkFrame = 0;
        this.crawlFrame = 0;

        // Health & Damage
        this.maxHearts = 3;
        this.hearts = 3;
        this.invulnerableTimer = 0;
        this.isDead = false;
        this.isFallingInHole = false;
        this.holeFallTimer = 0;
        this.totalHoleFallDuration = 0;
        this.fallingHole = null;
        this.fallStartY = this.groundY;

        // Stats
        this.baconCount = 0;
        this.settleDelayTimer = 0;
        this.isCrawlingUnderBench = false;
        this.joyHopTimer = 0;
        this.joyBaseX = this.x;
    }

    reset() {
        this.hearts = 3;
        this.isDead = false;
        this.isFallingInHole = false;
        this.holeFallTimer = 0;
        this.totalHoleFallDuration = 0;
        this.fallingHole = null;
        this.fallStartY = this.groundY;
        this.invulnerableTimer = 0;
        this.vy = 0;
        this.y = this.groundY;
        this.currentPlatform = null;
        this.isGrounded = true;
        this.state = 'WALK';
        this.targetX = this.canvas.width * this.baseXRatio;
        this.x = this.targetX;
        this.baconCount = 0;
        this.settleDelayTimer = 0;
        this.isCrawlingUnderBench = false;
        this.animTimer = 0;
        this.walkFrame = 0;
        this.crawlFrame = 0;
        this.joyHopTimer = 0;
        this.joyBaseX = this.targetX;
    }

    jump() {
        if (this.isDead || this.isFallingInHole) return;
        if (this.isGrounded || this.currentPlatform) {
            this.vy = this.jumpForce;
            this.isGrounded = false;
            this.currentPlatform = null;
            this.state = 'JUMP';
            sounds.playJump();
        }
    }

    takeDamage() {
        if (this.invulnerableTimer > 0 || this.isDead || this.isFallingInHole) return;
        this.hearts--;
        this.invulnerableTimer = 90; // ~1.5s at 60fps
        sounds.playHurt();
        if (this.hearts <= 0) {
            this.hearts = 0;
            this.isDead = true;
        }
    }

    fallIntoHole(hole = null) {
        if (this.isFallingInHole || this.isDead) return;
        this.isFallingInHole = true;
        this.totalHoleFallDuration = 48; // ~0.8s smooth sinking animation
        this.holeFallTimer = this.totalHoleFallDuration;
        this.hearts = 0;
        this.isDead = true;
        this.fallingHole = hole;
        this.fallStartY = this.y;
        this.state = 'FALL_HOLE';

        // Center JoJo horizontally over the hole
        const standW = 76;
        if (hole) {
            this.x = hole.x + (hole.width - standW) / 2;
        }

        sounds.playHurt();
    }

    collectBacon() {
        this.baconCount++;
        if (this.hearts < this.maxHearts) {
            this.hearts++;
        }
        sounds.playBacon();
    }

    startVictoryJoy() {
        this.state = 'VICTORY_JOY';
        this.isGrounded = true;
        this.currentPlatform = null;
        this.vy = 0;
        this.y = this.groundY;
        this.joyHopTimer = 0;
        this.joyBaseX = this.x;
        this.isCrawlingUnderBench = false;
    }

    update(keys, obstacles, gameSpeed) {
        if (this.isFallingInHole) {
            this.holeFallTimer--;
            return;
        }

        if (this.state === 'VICTORY_JOY') {
            this.joyHopTimer++;
            const hopPeriod = 24; // ~0.4s per hop cycle
            const hopPhase = (this.joyHopTimer % hopPeriod) / hopPeriod;
            const hopIndex = Math.floor(this.joyHopTimer / hopPeriod);

            // Sine parabolic bounce - higher bounce per user request
            const hopHeight = 36; // Raised from 22 to 36 (a little higher than current)
            const hopOffsetY = Math.sin(hopPhase * Math.PI) * hopHeight;
            this.y = this.groundY - hopOffsetY;

            // Small hops back and forth:
            // Hop 0: hops slightly forward, Hop 1: hops back, Hop 2: forward, Hop 3: back
            const hopDir = (hopIndex % 2 === 0) ? 1 : -1;
            const hopDistance = 14;
            const hopOffsetX = Math.sin(hopPhase * Math.PI) * hopDistance * hopDir;
            this.x = this.joyBaseX + hopOffsetX;

            // Soft landing sound when touching down
            if (this.joyHopTimer > 0 && this.joyHopTimer % hopPeriod === 0) {
                sounds.playStep();
            }
            return;
        }

        if (this.invulnerableTimer > 0) {
            this.invulnerableTimer--;
        }

        // Horizontal target calculation (expanded maneuverability with slow equilibrium drift)
        const minX = this.canvas.width * 0.08;   // ~80px: hang back near left screen
        const normalX = this.canvas.width * this.baseXRatio; // ~200px: resting position
        const maxX = this.canvas.width * 0.58;     // ~580px: surge forward past mid-screen

        let lerpFactor = 0.006; // Very slow, gentle drift toward baseline when idle

        if (keys['ArrowRight']) {
            this.targetX = maxX;
            lerpFactor = 0.045; // Halved forward dash speed (previously 0.09)
            this.settleDelayTimer = 45; // Delay settling after releasing
        } else if (keys['ArrowLeft']) {
            this.targetX = minX;
            lerpFactor = 0.08; // Responsive brake / retreat
            this.settleDelayTimer = 45;
        } else {
            // Player hangs out in place for a while before very slowly settling back
            if (this.settleDelayTimer > 0) {
                this.settleDelayTimer--;
                this.targetX = this.x;
                lerpFactor = 0;
            } else {
                this.targetX = normalX;
                lerpFactor = 0.006; // Much slower settling toward baseline
            }
        }

        // Belly crawl reduces forward movement speed slightly
        if (keys['ArrowDown'] && this.isGrounded) {
            this.targetX = Math.min(this.targetX, normalX * 0.9);
        }

        const prevX = this.x;

        // Smooth horizontal lerp
        if (lerpFactor > 0) {
            this.x += (this.targetX - this.x) * lerpFactor;
        }

        // Handle Crawl & Bench collision
        // Requirement: Down Arrow is needed to begin going under the bench, but no need to hold it.
        // JoJo stays crouched until coming out the other side. Only failing to crouch when beginning matters.
        const wantCrawl = !!keys['ArrowDown'];

        let onBenchThisFrame = false;
        let isUnderAnyBench = false;
        const footY = this.y;

        for (const obs of obstacles) {
            if (obs.type === 'bench') {
                const benchLeft = obs.x;
                const benchRight = obs.x + obs.width;
                const benchTopY = obs.y + obs.seatOffset;

                // Player footprint
                const playerLeft = this.x + 15;
                const playerRight = this.x + this.normalWidth - 15;

                // Landing on bench seat from above
                if (playerRight >= benchLeft + 15 && playerLeft <= benchRight - 15) {
                    if (this.vy >= 0 && Math.abs(footY - benchTopY) < 22) {
                        this.y = benchTopY;
                        this.vy = 0;
                        this.isGrounded = true;
                        this.currentPlatform = obs;
                        onBenchThisFrame = true;
                        this.isCrawlingUnderBench = false;
                    }
                }

                // If on bench but walked past its left or right edges
                if (this.currentPlatform === obs && (playerLeft > benchRight || playerRight < benchLeft)) {
                    this.currentPlatform = null;
                    this.isGrounded = false;
                }

                // Ground interaction with bench
                if (!this.currentPlatform && this.isGrounded) {
                    // Check if player footprint overlaps horizontally with bench
                    if (playerRight >= benchLeft && playerLeft <= benchRight) {
                        // If player is already crawling or taps Down Arrow to duck under
                        if (wantCrawl || this.isCrawlingUnderBench) {
                            this.isCrawlingUnderBench = true;
                            isUnderAnyBench = true;
                        } else {
                            // Failed to crouch while trying to go under the bench:
                            // Resolve collision based on which side JoJo is on or approached from:
                            const prevLeft = prevX + 15;
                            const prevRight = prevX + this.normalWidth - 15;
                            const playerMidX = (playerLeft + playerRight) / 2;
                            const benchMidX = (benchLeft + benchRight) / 2;

                            // If JoJo approached from the right (moving backwards) OR is on the right half of the bench:
                            if (prevLeft >= benchRight - 20 || playerMidX > benchMidX) {
                                // Blocked at the bench's right edge so JoJo doesn't walk backwards through it
                                this.x = benchRight - 15;
                            } else {
                                // Moving forward into bench from the left (or caught at front):
                                // Blocked and pushed back by the solid front frame of the bench
                                this.x = benchLeft - this.normalWidth + 15;
                            }
                        }
                    }
                }
            }
        }

        // If no longer under any bench, release the under-bench crouch lock
        if (!isUnderAnyBench && this.isCrawlingUnderBench) {
            this.isCrawlingUnderBench = false;
        }

        // Fail condition: JoJo pushed off the screen to the far left
        if (this.x + this.normalWidth < 0 || this.x < -30) {
            this.hearts = 0;
            this.isDead = true;
            sounds.playHurt();
        }

        if (!onBenchThisFrame && this.currentPlatform) {
            // Check if platform is still under player
            const p = this.currentPlatform;
            const playerLeft = this.x + 15;
            const playerRight = this.x + this.normalWidth - 15;
            if (playerLeft > p.x + p.width || playerRight < p.x) {
                this.currentPlatform = null;
                this.isGrounded = false;
            }
        }

        // Vertical physics (gravity and ground)
        if (!this.currentPlatform) {
            this.vy += this.gravity;
            this.y += this.vy;

            if (this.y >= this.groundY) {
                this.y = this.groundY;
                this.vy = 0;
                this.isGrounded = true;
            } else {
                this.isGrounded = false;
            }
        }

        // Determine current state:
        // JoJo stays crouched if player holds Down Arrow OR if currently passing under a bench
        const shouldCrawl = (wantCrawl || this.isCrawlingUnderBench);

        if (!this.isGrounded) {
            this.state = 'JUMP';
        } else if (shouldCrawl) {
            this.state = 'CRAWL';
        } else {
            this.state = 'WALK';
        }

        // Update animation frames (faster walk animation: ~0.065 to match steps to scroll speed)
        const cycleRate = (this.state === 'WALK' ? 0.065 : 0.040);
        this.animTimer += cycleRate * gameSpeed;
        if (this.animTimer >= 1.0) {
            this.animTimer = 0;
            this.walkFrame = (this.walkFrame + 1) % 8;
            this.crawlFrame = (this.crawlFrame + 1) % 8;
            if (this.state === 'WALK' && (this.walkFrame === 0 || this.walkFrame === 4)) {
                sounds.playStep();
            }
        }
    }

    getHitbox() {
        let w = this.normalWidth * 0.75;
        let h = this.normalHeight * 0.75;
        let x = this.x + 12;
        let y = this.y - h;

        if (this.state === 'CRAWL') {
            h = this.crawlHeight * 0.75;
            w = this.crawlWidth * 0.8;
            y = this.y - h;
        } else if (this.state === 'JUMP') {
            h = this.normalHeight * 0.65;
            y = this.y - h - 10;
        }

        return { x, y, width: w, height: h };
    }

    draw(ctx) {
        // Flicker if invulnerable (do not flicker during victory sequences or when dead)
        if (this.state !== 'VICTORY_JOY' && !this.isDead && this.invulnerableTimer > 0 && this.invulnerableTimer < 9000 && Math.floor(this.invulnerableTimer / 5) % 2 === 0) {
            return;
        }

        ctx.save();

        if (this.isFallingInHole) {
            const h = this.normalHeight;
            const w = 76; // Preserves stand_0 (183x306) proportion
            const duration = this.totalHoleFallDuration || 48;
            const progress = Math.min(1.0, Math.max(0.0, 1 - (this.holeFallTimer / duration)));

            // Sinks smoothly downward into the pit
            const fallDistance = progress * (h + 15);
            const currentFeetY = this.fallStartY + fallDistance;
            const currentHeadY = currentFeetY - h;

            // Occlude at the hole opening: erase the sprite from the bottom up as it sinks
            const occludeY = this.fallingHole ? (this.fallingHole.y + 34) : this.fallStartY;

            ctx.save();
            ctx.beginPath();
            ctx.rect(0, 0, this.canvas.width, occludeY);
            ctx.clip();

            sprites.draw(ctx, 'stand_0', this.x, currentHeadY, w, h);

            ctx.restore();
            ctx.restore();
            return;
        }

        if (this.state === 'VICTORY_JOY') {
            const h = this.normalHeight;
            const w = 76; // Preserves stand_0 proportion
            const hopPeriod = 24;
            const hopIndex = Math.floor(this.joyHopTimer / hopPeriod);
            const hopPhase = (this.joyHopTimer % hopPeriod) / hopPeriod;

            // Turn JoJo: faces right on even hops, flips left on odd hops
            const faceRight = (hopIndex % 2 === 0);

            // Squash & stretch: cushion upon landing, slight stretch in air
            let scaleX = 1.0;
            let scaleY = 1.0;
            if (hopPhase < 0.12 || hopPhase > 0.88) {
                scaleX = 1.08;
                scaleY = 0.92;
            } else if (hopPhase > 0.35 && hopPhase < 0.65) {
                scaleX = 0.94;
                scaleY = 1.06;
            }

            const drawW = w * scaleX;
            const drawH = h * scaleY;
            const drawX = this.x - (drawW - w) / 2;
            const drawY = this.y - drawH;

            ctx.save();
            if (!faceRight) {
                const centerX = drawX + drawW / 2;
                ctx.translate(centerX, 0);
                ctx.scale(-1, 1);
                ctx.translate(-centerX, 0);
            }

            sprites.draw(ctx, 'stand_0', drawX, drawY, drawW, drawH);
            ctx.restore();
            ctx.restore();
            return;
        }

        if (this.state === 'WALK') {
            const key = `walk_${this.walkFrame}`;
            const w = this.normalWidth;
            const h = this.normalHeight;
            sprites.draw(ctx, key, this.x, this.y - h, w, h);
        } else if (this.state === 'CRAWL') {
            const key = `crawl_${this.crawlFrame}`;
            const w = this.crawlWidth;
            const h = this.crawlHeight;
            sprites.draw(ctx, key, this.x, this.y - h, w, h);
        } else if (this.state === 'JUMP') {
            let jumpIdx = 2;
            if (this.vy < -7) jumpIdx = 1;
            else if (this.vy < -2) jumpIdx = 2;
            else if (this.vy < 3) jumpIdx = 3;
            else if (this.vy < 8) jumpIdx = 4;
            else jumpIdx = 5;

            const key = `jump_${jumpIdx}`;
            const w = this.normalWidth + 10;
            const h = this.normalHeight;
            sprites.draw(ctx, key, this.x, this.y - h, w, h);
        }

        ctx.restore();
    }
}

// Parallax Background and Environment Renderer for JoJo\'s Journey (Rustic Trail Theme)


class World {
    constructor(canvas) {
        this.canvas = canvas;
        this.width = canvas.width;
        this.height = canvas.height;
        this.groundY = 410;

        this.cloudOffset = 0;
        this.farMountainOffset = 0;
        this.midBgOffset = 0;
        this.foreOffset = 0;

        // Rendered cloud sprites with distinct heights, drift speeds, and scales
        this.clouds = [
            { sprite: 'cloud_large', x: 40, y: 32, w: 220, h: 88, speed: 0.12, alpha: 0.92 },
            { sprite: 'cloud_small_1', x: 320, y: 68, w: 170, h: 72, speed: 0.18, alpha: 0.86 },
            { sprite: 'cloud_small_2', x: 560, y: 22, w: 155, h: 70, speed: 0.14, alpha: 0.88 },
            { sprite: 'cloud_large', x: 780, y: 58, w: 200, h: 80, speed: 0.10, alpha: 0.90 },
            { sprite: 'cloud_small_1', x: 1040, y: 38, w: 165, h: 70, speed: 0.16, alpha: 0.84 },
        ];

        // Midground trees: only complete, uncut tree pairs and oaks, with organic variety and flip variations
        const treeTemplates = [
            { sprite: 'tree_pine_birch_pair', w: 205, h: 220, flip: false, groundOffset: 5 },
            { sprite: 'tree_oak', w: 230, h: 195, flip: false, groundOffset: 8 },
            { sprite: 'tree_pine_birch_pair', w: 195, h: 215, flip: true, groundOffset: 5 },
            { sprite: 'tree_oak', w: 225, h: 190, flip: true, groundOffset: 6 },
            { sprite: 'tree_pine_birch_pair', w: 210, h: 225, flip: false, groundOffset: 5 },
            { sprite: 'tree_oak', w: 230, h: 195, flip: false, groundOffset: 8 },
        ];
        this.midTrees = [];
        for (let i = 0; i < 18; i++) {
            const tmpl = treeTemplates[i % treeTemplates.length];
            this.midTrees.push({
                x: i * 220 + ((i * 41) % 65),
                sprite: tmpl.sprite,
                w: tmpl.w,
                h: tmpl.h,
                flip: tmpl.flip,
                groundOffset: tmpl.groundOffset
            });
        }

        // Midground Bushes (natural green blueberry and redberry bushes, very rare pink flower accent)
        const bushSprites = [
            'bush_blue_berries',
            'bush_red_berries',
            'bush_blue_berries',
            'bush_red_berries',
            'bush_blue_berries',
            'bush_pink_flowers', // 1 in 8 rare subtle accent
            'bush_blue_berries',
            'bush_red_berries'
        ];
        this.midBushes = [];
        for (let i = 0; i < 12; i++) {
            this.midBushes.push({
                x: i * 260 + ((i * 53) % 90),
                sprite: bushSprites[i % bushSprites.length],
                w: 82 + (i % 3) * 6,
                h: 68 + (i % 3) * 6,
                yOffset: 24 + (i % 3) * 4
            });
        }
    }

    update(scrollSpeed) {
        this.cloudOffset += scrollSpeed * 0.12;
        this.farMountainOffset += scrollSpeed * 0.22;
        this.midBgOffset += scrollSpeed * 0.52;
        this.foreOffset += scrollSpeed;

        // Wrap offsets cleanly
        if (this.cloudOffset > 3000) this.cloudOffset %= 3000;
        if (this.farMountainOffset > 4000) this.farMountainOffset %= 4000;
        if (this.midBgOffset > 5000) this.midBgOffset %= 5000;
        if (this.foreOffset > 10000) this.foreOffset %= 10000;
    }

    reset() {
        this.cloudOffset = 0;
        this.farMountainOffset = 0;
        this.midBgOffset = 0;
        this.foreOffset = 0;
    }

    draw(ctx) {
        // ==========================================
        // 1. SKY & SUN (Alpine Wilderness Morning)
        // ==========================================
        const skyGrad = ctx.createLinearGradient(0, 0, 0, this.groundY - 80);
        skyGrad.addColorStop(0, '#5390bd');    // Deep alpine morning blue
        skyGrad.addColorStop(0.45, '#85b9da'); // Crisp mountain atmosphere
        skyGrad.addColorStop(0.85, '#cae4d8'); // Soft sunlit forest haze
        skyGrad.addColorStop(1, '#dfede3');    // Golden horizon mist
        ctx.fillStyle = skyGrad;
        ctx.fillRect(0, 0, this.width, this.height);

        // Warm morning sun over the wilderness
        ctx.save();
        const sunX = this.width - 130;
        const sunY = 72;
        const sunGlow = ctx.createRadialGradient(sunX, sunY, 15, sunX, sunY, 75);
        sunGlow.addColorStop(0, 'rgba(255, 250, 205, 0.95)');
        sunGlow.addColorStop(0.4, 'rgba(255, 238, 160, 0.55)');
        sunGlow.addColorStop(1, 'rgba(255, 235, 150, 0)');
        ctx.fillStyle = sunGlow;
        ctx.beginPath();
        ctx.arc(sunX, sunY, 75, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#fffdf0';
        ctx.beginPath();
        ctx.arc(sunX, sunY, 34, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        // ==========================================
        // 2. RENDERED DRIFTING CLOUDS
        // ==========================================
        const totalCloudSpan = 1300;
        for (const c of this.clouds) {
            let cx = (c.x - this.cloudOffset * (c.speed / 0.12)) % totalCloudSpan;
            if (cx < -260) cx += totalCloudSpan;
            sprites.draw(ctx, c.sprite, cx, c.y, c.w, c.h, false, c.alpha);
        }

        // ==========================================
        // 3. DISTANT MOUNTAIN & FOREST RIDGES
        // ==========================================
        // Layer A: Far misty mountains (soft slate pine)
        ctx.fillStyle = '#789ba3';
        ctx.beginPath();
        ctx.moveTo(0, this.groundY - 140);
        for (let x = 0; x <= this.width + 40; x += 30) {
            const worldX = x + this.farMountainOffset * 0.4;
            const y = this.groundY - 170
                + Math.sin(worldX * 0.004) * 45
                + Math.cos(worldX * 0.009) * 20;
            ctx.lineTo(x, y);
        }
        ctx.lineTo(this.width, this.groundY);
        ctx.lineTo(0, this.groundY);
        ctx.fill();

        // Layer B: Mid-distance forested ridge with solid evergreen tree peak contours
        ctx.fillStyle = '#4f736a';
        ctx.beginPath();
        ctx.moveTo(0, this.groundY - 90);
        for (let x = 0; x <= this.width + 30; x += 20) {
            const worldX = x + this.farMountainOffset * 0.75;
            const ridgeBase = this.groundY - 125 + Math.sin(worldX * 0.006) * 22;
            const treeJitter = ((worldX % 28) < 14) ? -10 : 0;
            ctx.lineTo(x, ridgeBase + treeJitter);
        }
        ctx.lineTo(this.width, this.groundY);
        ctx.lineTo(0, this.groundY);
        ctx.fill();

        // Soft atmospheric distance fog wash over far ridges
        const fogGrad = ctx.createLinearGradient(0, this.groundY - 140, 0, this.groundY - 30);
        fogGrad.addColorStop(0, 'rgba(215, 235, 222, 0)');
        fogGrad.addColorStop(0.7, 'rgba(215, 235, 222, 0.35)');
        fogGrad.addColorStop(1, 'rgba(180, 215, 190, 0.55)');
        ctx.fillStyle = fogGrad;
        ctx.fillRect(0, this.groundY - 140, this.width, 110);

        // ==========================================
        // 4. MIDGROUND: RUSTIC SPLIT-RAIL FENCE & UNCUT TREES
        // ==========================================
        // Midground rendered forest trees (100% solid, uncut, organic silhouettes)
        const midTreeSpan = this.midTrees.length * 220;
        for (const mt of this.midTrees) {
            let mx = (mt.x - this.midBgOffset) % midTreeSpan;
            if (mx < -260) mx += midTreeSpan;
            if (mx > this.width + 100) continue;

            const my = this.groundY - mt.h - mt.groundOffset;
            sprites.draw(ctx, mt.sprite, mx, my, mt.w, mt.h, mt.flip, 1.0);
        }

        // Continuous rustic split-rail wooden fence (cleaned rows 0-4)
        const fenceTileW = 440;
        const fenceH = 162;
        const fenceY = this.groundY - fenceH + 28;
        const fenceStart = -(this.midBgOffset % fenceTileW);
        for (let fx = fenceStart - fenceTileW; fx < this.width + fenceTileW; fx += fenceTileW) {
            sprites.draw(ctx, 'fence_wood', fx, fenceY, fenceTileW, fenceH);
        }

        // Midground natural wild bushes tucked along fence posts (subtle, non-overpowering)
        const bushSpan = this.midBushes.length * 260;
        for (const mb of this.midBushes) {
            let bx = (mb.x - this.midBgOffset * 1.05) % bushSpan;
            if (bx < -120) bx += bushSpan;
            if (bx > this.width + 80) continue;

            const by = this.groundY - mb.h + 8 - mb.yOffset * 0.3;
            sprites.draw(ctx, mb.sprite, bx, by, mb.w, mb.h, false, 0.95);
        }

        // ==========================================
        // 5. FOREGROUND: SOLID TRAIL BED, DIRT TRAIL & SOIL CUTAWAY
        // ==========================================
        // Foundation Underlayer A: Solid warm brown trail bed (ELIMINATES ALL PATH GAPS)
        ctx.fillStyle = '#6b4724';
        ctx.fillRect(0, this.groundY - 35, this.width, this.height - (this.groundY - 35));

        // Foundation Underlayer B: Deep subterranean earth underlayer
        ctx.fillStyle = '#352010';
        ctx.fillRect(0, this.groundY + 38, this.width, this.height - (this.groundY + 38));

        // Layer A: Wild grass fringe along upper trail border
        const grassTileW = 750;
        const grassH = 88;
        const grassY = this.groundY - 58;
        const grassStart = -(this.foreOffset % grassTileW);
        for (let gx = grassStart - grassTileW; gx < this.width + grassTileW; gx += grassTileW) {
            sprites.draw(ctx, 'grass_fringe', gx, grassY, grassTileW + 20, grassH);
        }

        // Layer B: Rough dirt trail surface (seamless overlap, perfectly contiguous)
        const dirtTileW = 735;
        const dirtH = 105;
        const dirtY = this.groundY - 26;
        const dirtStart = -(this.foreOffset % dirtTileW);
        for (let dx = dirtStart - dirtTileW; dx < this.width + dirtTileW; dx += dirtTileW) {
            sprites.draw(ctx, 'dirt_trail', dx, dirtY, dirtTileW + 25, dirtH);
        }

        // Layer C: Deep subterranean soil and roots cutaway below the path
        const soilTileW = 750;
        const soilH = 80;
        const soilY = this.groundY + 42;
        const soilStart = -(this.foreOffset % soilTileW);
        for (let sx = soilStart - soilTileW; sx < this.width + soilTileW; sx += soilTileW) {
            sprites.draw(ctx, 'soil_cutaway', sx, soilY, soilTileW + 20, soilH);
        }

        // Bottom border seal
        ctx.fillStyle = '#2c1e13';
        ctx.fillRect(0, this.height - 8, this.width, 8);
    }
}

// Core Game Controller for JoJo's Journey


class Game {
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


if (typeof window !== 'undefined' && !window.jojoGame) {
    window.jojoGame = new Game();
    if (document.readyState === 'loading') {
        window.addEventListener('DOMContentLoaded', () => window.jojoGame.init());
    } else {
        window.jojoGame.init();
    }
}
