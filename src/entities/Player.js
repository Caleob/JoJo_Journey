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
            const hopPeriod = 22; // ~0.36s per hop cycle
            const hopPhase = (this.joyHopTimer % hopPeriod) / hopPeriod;
            const hopIndex = Math.floor(this.joyHopTimer / hopPeriod);

            // Sine parabolic bounce
            const hopHeight = 22;
            const hopOffsetY = Math.sin(hopPhase * Math.PI) * hopHeight;
            this.y = this.groundY - hopOffsetY;

            // Small hops back and forth:
            // Hop 0: hops slightly forward, Hop 1: hops back, Hop 2: forward, Hop 3: back
            const hopDir = (hopIndex % 2 === 0) ? 1 : -1;
            const hopDistance = 12;
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
        // Flicker if invulnerable (do not flicker during victory sequences)
        if (this.state !== 'VICTORY_JOY' && this.invulnerableTimer > 0 && this.invulnerableTimer < 9000 && Math.floor(this.invulnerableTimer / 5) % 2 === 0) {
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
            const hopPeriod = 22;
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
