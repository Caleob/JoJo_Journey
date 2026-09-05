// Obstacles, Enemies, Hazards, and Collectibles for JoJo's Journey

import { sprites } from '../sprites.js';
import { sounds } from '../audio.js';

export class Bench {
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

export class Hole {
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
export class FatCat {
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

// Mangy Cat (Tuxedo) - Shifts maniacally between standing poses, rocks back & forth, and leaps in a high parabolic arc toward JoJo every 2-4 seconds
export class MangyCat {
    constructor(x, y, onBench = false, benchRef = null) {
        this.type = 'cat';
        this.breed = 'mangy';
        this.x = x;
        this.y = y; // base foot Y
        this.baseGroundY = 438;
        // Scaled up by 20% (previously 82x95 -> now 98x114)
        this.width = 98;
        this.height = 114;
        this.onBench = onBench;
        this.benchRef = benchRef;

        // Dynamics & States:
        // 'SHIFT' -> maniacally switching between standing poses 1 and 2
        // 'ROCK'  -> tense rocking back & forth in pounce-ready pose
        // 'LEAP'  -> high parabolic arc into the air toward JoJo
        // 'LAND'  -> crouching impact landing
        this.state = 'SHIFT';
        this.standPose = 1; // alternates between 1 and 2
        this.shiftTimer = 0;
        this.rockPhase = 0;
        this.landTimer = 0;
        this.facing = 'left'; // default sprite is right-facing, so facing left requires horizontal flip

        // Leap physics
        this.vx = 0;
        this.vy = 0;
        this.gravity = 0.42;

        // First jump triggered soon after spawning (40-60 ticks) so player witnesses the sequence
        this.jumpCooldown = 45 + Math.floor(Math.random() * 25);
    }

    update(scrollSpeed, playerX, playerY, particles = null) {
        // Face toward JoJo (default sprite faces right, so when JoJo is to the left, facing is 'left')
        this.facing = (playerX <= this.x + 20) ? 'left' : 'right';

        // If perched on a bench and not in the air leaping, anchor to the bench seat
        if (this.onBench && this.benchRef && this.state !== 'LEAP') {
            this.x = this.benchRef.x + (this.benchRef.width - this.width) / 2;
            this.y = this.benchRef.y + this.benchRef.seatOffset;
        } else if (this.state !== 'LEAP') {
            this.x -= scrollSpeed;
        }

        // State Machine
        if (this.state === 'SHIFT') {
            this.jumpCooldown--;

            // Maniacal shifting between stand_1 and stand_2 every 8 ticks
            this.shiftTimer++;
            if (this.shiftTimer >= 8) {
                this.shiftTimer = 0;
                this.standPose = this.standPose === 1 ? 2 : 1;
            }

            // Begin tense rocking when 35 ticks remain before launch
            if (this.jumpCooldown <= 35) {
                this.state = 'ROCK';
                this.rockPhase = 0;
            }
        } else if (this.state === 'ROCK') {
            this.jumpCooldown--;
            this.rockPhase += 0.32; // Rapid nervous rocking back and forth

            if (this.jumpCooldown <= 0) {
                this.startLeap(playerX, scrollSpeed);
            }
        } else if (this.state === 'LEAP') {
            // High arc airborne physics
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
                this.landTimer = 14;

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
            }
        } else if (this.state === 'LAND') {
            this.landTimer--;
            if (this.landTimer <= 0) {
                this.state = 'SHIFT';
                // Reset jump interval to 2-4 seconds (120-240 ticks at 60Hz)
                this.jumpCooldown = 120 + Math.floor(Math.random() * 120);
                this.standPose = 1;
                this.shiftTimer = 0;
            }
        }
    }

    startLeap(playerX, scrollSpeed) {
        this.state = 'LEAP';
        sounds.playCatSwipe();

        // Detach from bench so it lands on ground trail
        this.onBench = false;
        this.benchRef = null;

        // High parabolic arc: -12.5 reaches ~160px above ground (approx y=278 apex)
        this.vy = -12.5;

        // Calculate horizontal trajectory toward JoJo
        const distToPlayer = (playerX + 35) - (this.x + this.width / 2);
        const airTime = (Math.abs(this.vy) / this.gravity) * 2; // ~60 ticks total airtime
        const targetVx = distToPlayer / airTime;
        // Menacing forward jump velocity
        this.vx = Math.min(-1.8, Math.max(-6.5, targetVx));
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
        } else if (this.state === 'ROCK' || this.state === 'LAND') {
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
                // If on bench seat, uses crouch or alert stand
                key = this.standPose === 1 ? 'cat_mangy_crouch' : 'cat_mangy_stand_1';
            }
        } else if (this.state === 'ROCK') {
            key = 'cat_mangy_pounce_ready';
            // Menacing back and forth rocking motion
            const rockOffset = Math.sin(this.rockPhase) * 6;
            drawX += rockOffset;
        } else if (this.state === 'LEAP') {
            // Trajectory-aware leap poses
            if (this.vy < -3) {
                key = 'cat_mangy_leap_1'; // High launch
                w += 24;
            } else if (this.vy >= -3 && this.vy <= 3) {
                key = 'cat_mangy_leap_2'; // Apex spread-eagle
                w += 28;
            } else {
                key = 'cat_mangy_leap_3'; // Downward dive
                w += 24;
            }
        } else if (this.state === 'LAND') {
            key = 'cat_mangy_land';
            w += 20;
            h = this.height * 0.85;
            drawY = this.y - h;
        }

        // Default sprite faces right, so mirror horizontally when facing JoJo to the left
        const isFlipped = (this.facing === 'left');
        sprites.draw(ctx, key, drawX, drawY, w, h, isFlipped);
    }

    isOffscreen() {
        return this.x + this.width < -140;
    }
}

// GrumpyCat alias for backwards compatibility
export const GrumpyCat = FatCat;

export class Acorn {
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

export class Squirrel {
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
        this.hasSecondAcorn = Math.random() < 0.30; // 30% chance of follow-up throw after passing
        this.hasThrownSecond = false;
        this.facing = 'left'; // 'left' when JoJo is ahead, 'right' when JoJo passes
    }

    update(scrollSpeed, playerX, acornList) {
        this.x -= scrollSpeed;
        const distToPlayer = this.x - playerX;

        // Stage A: First Acorn Throw (from ahead in an arc)
        if (this.stage === 'hidden' && !this.hasThrown && distToPlayer < 540) {
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
                    // Lob acorn with an upward arc toward JoJo
                    const acornX = this.x - 10;
                    const acornY = this.y - 85;
                    const acornVx = -3.8;
                    const acornVy = -4.8;
                    acornList.push(new Acorn(acornX, acornY, acornVx, acornVy, 0.20));
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
                    // Lob follow-up acorn forward in an arc chasing JoJo
                    const acornX = this.x + this.width + 5;
                    const acornY = this.y - 85;
                    const acornVx = scrollSpeed + 5.2; // Overcome scroll speed to travel right
                    const acornVy = -4.8;
                    acornList.push(new Acorn(acornX, acornY, acornVx, acornVy, 0.20));
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

export class Bacon {
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
