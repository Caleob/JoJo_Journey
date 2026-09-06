// Parallax Background and Environment Renderer for JoJo\'s Journey (Rustic Trail Theme)

import { sprites } from './sprites.js';

export class World {
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
