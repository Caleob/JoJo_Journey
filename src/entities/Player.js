// JoJo Player Entity

import { sprites } from '../sprites.js';
import { sounds } from '../audio.js';

export class Player {
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

    update(keys, obstacles, gameSpeed) {
        if (this.isFallingInHole) {
            this.holeFallTimer--;
            return;
        }

        if (this.invulnerableTimer > 0) {
            this.invulnerableTimer--;
        }

        // Horizontal target calculation (expanded maneuverability for tactics & strategy)
        const minX = this.canvas.width * 0.08;   // ~80px: hang back near left screen
        const normalX = this.canvas.width * this.baseXRatio; // ~200px: resting position
        const maxX = this.canvas.width * 0.58;     // ~580px: surge forward past mid-screen

        let lerpFactor = 0.035; // Gentle return to baseline when idle

        if (keys['ArrowRight']) {
            this.targetX = maxX;
            lerpFactor = 0.09; // Snappy forward surge
        } else if (keys['ArrowLeft']) {
            this.targetX = minX;
            lerpFactor = 0.09; // Snappy brake / retreat
        } else {
            this.targetX = normalX;
        }

        // Belly crawl reduces forward movement speed slightly
        if (keys['ArrowDown'] && this.isGrounded) {
            this.targetX = Math.min(this.targetX, normalX * 0.9);
        }

        // Smooth horizontal lerp
        this.x += (this.targetX - this.x) * lerpFactor;

        // Handle Crawl & Bench collision
        const wantCrawl = !!keys['ArrowDown'];

        let onBenchThisFrame = false;
        let underBench = false;
        const footY = this.y;

        for (const obs of obstacles) {
            if (obs.type === 'bench') {
                const benchLeft = obs.x;
                const benchRight = obs.x + obs.width;
                const benchTopY = obs.y + obs.seatOffset;

                // Player footprint
                const playerLeft = this.x + 15;
                const playerRight = this.x + this.normalWidth - 15;

                // Check if JoJo is currently underneath the bench clearance
                if (playerRight >= benchLeft + 10 && playerLeft <= benchRight - 10 && footY >= this.groundY - 10 && !this.currentPlatform) {
                    underBench = true;
                }

                // Landing on bench seat from above
                if (playerRight >= benchLeft + 15 && playerLeft <= benchRight - 15) {
                    if (this.vy >= 0 && Math.abs(footY - benchTopY) < 22) {
                        this.y = benchTopY;
                        this.vy = 0;
                        this.isGrounded = true;
                        this.currentPlatform = obs;
                        onBenchThisFrame = true;
                    }
                }

                // If on bench but walked past its left or right edges
                if (this.currentPlatform === obs && (playerLeft > benchRight || playerRight < benchLeft)) {
                    this.currentPlatform = null;
                    this.isGrounded = false;
                }

                // Bumping into bench front while walking normally (not crawling under, not on top)
                if (!this.currentPlatform && !wantCrawl && !underBench && this.isGrounded) {
                    if (playerRight >= benchLeft && playerLeft < benchLeft + 25 && footY > benchTopY + 15) {
                        // Prevent walking forward through solid bench frame
                        this.x = benchLeft - this.normalWidth + 15;
                    }
                }
            }
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

        // Determine current state (forced crawl if under bench)
        if (!this.isGrounded) {
            this.state = 'JUMP';
        } else if (wantCrawl || underBench) {
            this.state = 'CRAWL';
        } else {
            this.state = 'WALK';
        }

        // Update animation frames (smooth ~10-12 fps cycle tuned for 8-frame loop)
        this.animTimer += 0.035 * gameSpeed;
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
        // Flicker if invulnerable
        if (this.invulnerableTimer > 0 && Math.floor(this.invulnerableTimer / 5) % 2 === 0) {
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
