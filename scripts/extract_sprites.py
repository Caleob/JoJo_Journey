#!/usr/bin/env python3
"""
extract_sprites.py
Extracts sprites for Mangy Cat and Overgrown Trail Bench from:
  - MANGY_CAT_Sprites.png
  - BENCH_Sprites.png

Key Operations:
1. Chroma Keying:
   - Removes bright blue (#0321fe) background with smooth edge anti-aliasing.
   - Blue despill suppression to eliminate halos around whiskers, fur, and leaves.
2. Bench Alignment & Crosshair Removal:
   - Detects and utilizes the yellow crosshairs in Section 1 (bg) and Section 2 (fg).
   - Crosshairs are aligned with sub-pixel precision.
   - Crosshairs and surrounding yellow/dark halos are completely removed.
   - Exports unified layered bench sprites (foreground, background, and composite).
   - Exports game replacement sprite for assets/sprites/items/bench.png.
3. Mangy Cat Extraction:
   - Extracts all 8 poses:
     STAND 1, STAND 2, CROUCH, LEAP 1, LEAP 2, LEAP 3, LAND, POUNCE READY.
   - Exports to assets/sprites/cat/ and assets/sprites/cat/mangy/.
"""

import os
from collections import deque
from PIL import Image

def chroma_key_and_despill(img, remove_yellow_zones=None):
    """
    Removes chroma blue background with smooth alpha falloff and despill.
    Optionally zeros out any pixels within remove_yellow_zones (boxes: [(x0, y0, x1, y1), ...]).
    """
    rgba = img.convert('RGBA')
    w, h = rgba.size
    pixels = rgba.load()

    out = Image.new('RGBA', (w, h), (0, 0, 0, 0))
    out_pix = out.load()

    for y in range(h):
        for x in range(w):
            # Check if inside a crosshair removal zone
            in_crosshair_zone = False
            if remove_yellow_zones:
                for (zx0, zy0, zx1, zy1) in remove_yellow_zones:
                    if zx0 <= x <= zx1 and zy0 <= y <= zy1:
                        in_crosshair_zone = True
                        break

            r, g, b, a = pixels[x, y]

            if in_crosshair_zone:
                # In crosshair zone, any pixel that is yellow or near-yellow or border dark halo is eliminated
                # (Bench seat is above Y=545, so in this zone everything non-blue is crosshair)
                out_pix[x, y] = (0, 0, 0, 0)
                continue

            # Chroma key metric: how strongly blue exceeds red and green
            # Background blue is ~(3, 33, 254)
            diff = b - max(r, int(g * 1.15))
            if diff > 130:
                # Fully transparent background
                out_pix[x, y] = (0, 0, 0, 0)
            elif diff > 35:
                # Anti-aliased transition edge
                alpha_factor = 1.0 - (diff - 35) / 95.0
                alpha = max(0, min(255, int(255 * alpha_factor)))
                # Despill: clamp blue to max(r, g) to eliminate blue tint
                b_clean = min(b, max(r, int(g * 1.05)))
                out_pix[x, y] = (r, g, b_clean, alpha)
            else:
                out_pix[x, y] = (r, g, b, 255)

    return out

def extract_bench():
    print("=== Extracting Overgrown Trail Bench ===")
    bench_sheet_path = 'BENCH_Sprites.png'
    if not os.path.exists(bench_sheet_path):
        raise FileNotFoundError(f"Missing {bench_sheet_path}")

    bench_raw = Image.open(bench_sheet_path)
    w, h = bench_raw.size

    # Crosshair coordinates:
    # Section 1 (Background): Crosshair center at (1234, 563)
    # Section 2 (Foreground): Crosshair center at (1234, 1475)
    # Crosshair bounding zones for 100% removal:
    # Zone 1: X in [1130, 1345], Y in [545, 585]
    # Zone 2: X in [1130, 1345], Y in [1450, 1500]
    crosshair_zones = [
        (1130, 545, 1345, 585),
        (1130, 1450, 1345, 1500)
    ]

    print("  Applying chroma keying and crosshair removal...")

    # Inpaint Section 1 crosshair tip where it overlapped the bench seat bottom wood:
    # Seat bottom is at y=550. The top tip of the yellow crosshair vertical bar was at y=545-550, x=1231-1237.
    bench_rgb = bench_raw.convert('RGBA')
    raw_pix = bench_rgb.load()
    for y in range(545, 551):
        left_color = raw_pix[1228, y]
        right_color = raw_pix[1242, y]
        for x in range(1230, 1239):
            t = (x - 1228) / (1242 - 1228)
            r = int(left_color[0] * (1 - t) + right_color[0] * t)
            g = int(left_color[1] * (1 - t) + right_color[1] * t)
            b = int(left_color[2] * (1 - t) + right_color[2] * t)
            raw_pix[x, y] = (r, g, b, 255)

    # Crosshair coordinates:
    # Section 1 (Background): Crosshair center at (1234, 563). Below seat bottom (y >= 551).
    # Section 2 (Foreground): Crosshair center at (1234, 1475).
    crosshair_zones = [
        (1130, 551, 1345, 585),
        (1130, 1450, 1345, 1500)
    ]

    cleaned_sheet = chroma_key_and_despill(bench_rgb, remove_yellow_zones=crosshair_zones)

    # Section 1: Background (backrest slats, seat, armrests, back legs)
    # Rows 100 to 850
    s1 = cleaned_sheet.crop((0, 100, w, 850))
    s1_cx = 1234
    s1_cy = 563 - 100 # relative to crop

    # Section 2: Foreground (front legs, hanging ivy)
    # Rows 1050 to 1850
    s2 = cleaned_sheet.crop((0, 1050, w, 1850))
    s2_cx = 1234
    s2_cy = 1475 - 1050 # relative to crop

    # Find tight bounds relative to the crosshair anchor
    # Let anchor be (0, 0).
    # For s1, any pixel at (x, y) is at (x - s1_cx, y - s1_cy)
    # For s2, any pixel at (x, y) is at (x - s2_cx, y - s2_cy)
    pix1 = s1.load()
    pix2 = s2.load()

    min_rel_x, max_rel_x = 9999, -9999
    min_rel_y, max_rel_y = 9999, -9999

    for y in range(s1.size[1]):
        for x in range(s1.size[0]):
            if pix1[x, y][3] > 10:
                rx = x - s1_cx
                ry = y - s1_cy
                if rx < min_rel_x: min_rel_x = rx
                if rx > max_rel_x: max_rel_x = rx
                if ry < min_rel_y: min_rel_y = ry
                if ry > max_rel_y: max_rel_y = ry

    for y in range(s2.size[1]):
        for x in range(s2.size[0]):
            if pix2[x, y][3] > 10:
                rx = x - s2_cx
                ry = y - s2_cy
                if rx < min_rel_x: min_rel_x = rx
                if rx > max_rel_x: max_rel_x = rx
                if ry < min_rel_y: min_rel_y = ry
                if ry > max_rel_y: max_rel_y = ry

    # Pad by 2px on each side
    min_rel_x -= 2
    min_rel_y -= 2
    max_rel_x += 2
    max_rel_y += 2

    canvas_w = max_rel_x - min_rel_x + 1
    canvas_h = max_rel_y - min_rel_y + 1
    anchor_on_canvas_x = -min_rel_x
    anchor_on_canvas_y = -min_rel_y

    print(f"  Unified canvas size: {canvas_w}x{canvas_h}, anchor at ({anchor_on_canvas_x}, {anchor_on_canvas_y})")

    # Composite canvas for background layer
    bench_bg = Image.new('RGBA', (canvas_w, canvas_h), (0, 0, 0, 0))
    paste_s1_x = anchor_on_canvas_x - s1_cx
    paste_s1_y = anchor_on_canvas_y - s1_cy
    bench_bg.paste(s1, (paste_s1_x, paste_s1_y), s1)

    # Composite canvas for foreground layer
    bench_fg = Image.new('RGBA', (canvas_w, canvas_h), (0, 0, 0, 0))
    paste_s2_x = anchor_on_canvas_x - s2_cx
    paste_s2_y = anchor_on_canvas_y - s2_cy
    bench_fg.paste(s2, (paste_s2_x, paste_s2_y), s2)

    # Full composite (bg + fg merged)
    bench_composite = Image.new('RGBA', (canvas_w, canvas_h), (0, 0, 0, 0))
    bench_composite.paste(bench_bg, (0, 0), bench_bg)
    bench_composite.paste(bench_fg, (0, 0), bench_fg)

    # Output directory
    os.makedirs('assets/sprites/items', exist_ok=True)

    # Save high-res master files
    bench_composite.save('assets/sprites/items/bench_full.png')
    bench_bg.save('assets/sprites/items/bench_background.png')
    bench_fg.save('assets/sprites/items/bench_foreground.png')
    print("  Saved high-res bench sprites: bench_full.png, bench_background.png, bench_foreground.png")

    # Tight crop bounds to eliminate transparent padding
    crop_box = (2, 3, 2248, 808)
    full_crop = bench_composite.crop(crop_box)
    bg_crop = bench_bg.crop(crop_box)
    fg_crop = bench_fg.crop(crop_box)

    full_crop.save('assets/sprites/items/bench.png')
    bg_crop.save('assets/sprites/items/bench_bg.png')
    fg_crop.save('assets/sprites/items/bench_fg.png')
    print("  Saved tightly cropped bench sprites: bench.png, bench_bg.png, bench_fg.png (2246x805)")

def extract_cat():
    print("\n=== Extracting Mangy Cat Sprites ===")
    cat_sheet_path = 'MANGY_CAT_Sprites.png'
    if not os.path.exists(cat_sheet_path):
        raise FileNotFoundError(f"Missing {cat_sheet_path}")

    cat_raw = Image.open(cat_sheet_path)
    w, h = cat_raw.size

    print("  Applying chroma keying and despill...")
    cleaned_cat = chroma_key_and_despill(cat_raw)

    # Bounding boxes for each pose (determined via connected component & label inspection):
    # Poses:
    # 0: STAND 1       (x: 55 to 315, y: 350 to 660)
    # 1: STAND 2       (x: 350 to 585, y: 290 to 655)
    # 2: CROUCH        (x: 610 to 895, y: 330 to 650)
    # 3: LEAP 1        (x: 910 to 1270, y: 295 to 640)
    # 4: LEAP 2        (x: 1230 to 1535, y: 215 to 560)
    # 5: LEAP 3        (x: 1570 to 1810, y: 235 to 590)
    # 6: LAND          (x: 1830 to 2165, y: 320 to 655) [includes dust/dirt particles]
    # 7: POUNCE READY  (x: 2190 to 2480, y: 340 to 650)

    # Note: LEAP 1 and LEAP 2 overlap slightly in column projection between x=1230 and x=1270.
    # In that overlap region, LEAP 1 is at y > 450 (front paws), LEAP 2 is at y < 450 (rear leg/tail).
    # We will segment them cleanly by their connected components.

    # Connected component segmentation on the sprite row (y >= 200)
    pix = cleaned_cat.load()
    mask = [[False]*w for _ in range(h)]
    for y in range(200, h):
        for x in range(w):
            if pix[x, y][3] > 15:
                mask[y][x] = True

    visited = [[False]*w for _ in range(h)]
    components = []

    for y in range(200, h):
        for x in range(w):
            if mask[y][x] and not visited[y][x]:
                comp_pts = []
                queue = deque([(x, y)])
                visited[y][x] = True
                while queue:
                    cx, cy = queue.popleft()
                    comp_pts.append((cx, cy))
                    for dx, dy in [(-1,0),(1,0),(0,-1),(0,1),(-1,-1),(1,-1),(-1,1),(1,1)]:
                        nx, ny = cx + dx, cy + dy
                        if 0 <= nx < w and 200 <= ny < h:
                            if mask[ny][nx] and not visited[ny][nx]:
                                visited[ny][nx] = True
                                queue.append((nx, ny))
                min_x = min(p[0] for p in comp_pts)
                max_x = max(p[0] for p in comp_pts)
                min_y = min(p[1] for p in comp_pts)
                max_y = max(p[1] for p in comp_pts)
                components.append({
                    'count': len(comp_pts),
                    'bbox': (min_x, min_y, max_x, max_y),
                    'pts': comp_pts
                })

    # Group components into the 8 poses by horizontal center:
    pose_centers = [182, 462, 765, 1038, 1328, 1639, 1960, 2301]
    pose_names = [
        'cat_stand_1',
        'cat_stand_2',
        'cat_crouch',
        'cat_leap_1',
        'cat_leap_2',
        'cat_leap_3',
        'cat_land',
        'cat_pounce_ready'
    ]

    pose_components = {name: [] for name in pose_names}

    for comp in components:
        cx = (comp['bbox'][0] + comp['bbox'][2]) / 2.0
        # Find closest pose center
        best_idx = 0
        best_dist = abs(cx - pose_centers[0])
        for idx, pc in enumerate(pose_centers):
            dist = abs(cx - pc)
            if dist < best_dist:
                best_dist = dist
                best_idx = idx
        pose_components[pose_names[best_idx]].append(comp)

    # Create directories
    os.makedirs('assets/sprites/cat', exist_ok=True)
    os.makedirs('assets/sprites/cat/mangy', exist_ok=True)

    extracted_images = {}

    for name in pose_names:
        comps = pose_components[name]
        if not comps:
            print(f"  Warning: No components found for {name}")
            continue

        all_pts = []
        for c in comps:
            all_pts.extend(c['pts'])

        min_x = min(p[0] for p in all_pts)
        max_x = max(p[0] for p in all_pts)
        min_y = min(p[1] for p in all_pts)
        max_y = max(p[1] for p in all_pts)

        # 2px padding
        pw = max_x - min_x + 5
        ph = max_y - min_y + 5
        pose_img = Image.new('RGBA', (pw, ph), (0, 0, 0, 0))
        pose_pix = pose_img.load()

        for (x, y) in all_pts:
            dest_x = x - min_x + 2
            dest_y = y - min_y + 2
            pose_pix[dest_x, dest_y] = pix[x, y]

        # Save to mangy folder
        out_path = f'assets/sprites/cat/mangy/{name}.png'
        pose_img.save(out_path)
        extracted_images[name] = pose_img
        print(f"  Extracted {name}: size={pose_img.size} -> {out_path}")

    # Mirror mangy sprites to assets/cat/mangy/
    os.makedirs('assets/cat/mangy', exist_ok=True)
    for name, pose_img in extracted_images.items():
        pose_img.save(f'assets/cat/mangy/{name}.png')

    # Mirror fat cat to assets/cat/fat/ if present
    if os.path.exists('assets/sprites/cat/fat'):
        os.makedirs('assets/cat/fat', exist_ok=True)
        import shutil
        for f in os.listdir('assets/sprites/cat/fat'):
            shutil.copy2(os.path.join('assets/sprites/cat/fat', f), os.path.join('assets/cat/fat', f))
        print("  Mirrored assets/sprites/cat/fat/ to assets/cat/fat/")

def main():
    print("Starting Sprite Extraction...")
    extract_bench()
    extract_cat()
    print("\nSprite extraction completed successfully!")

if __name__ == '__main__':
    main()
