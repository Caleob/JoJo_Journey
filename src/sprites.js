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

export const sprites = new SpriteManager();
