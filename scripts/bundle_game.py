#!/usr/bin/env python3
"""
bundle_game.py
Bundles ES modules from src/ into game.bundle.js for local file:// and offline gameplay.
"""

import os
import re

def clean_module(code):
    lines = []
    for line in code.splitlines():
        # Strip import statements
        if re.match(r'^\s*import\s+', line):
            continue
        # Strip 'export ' keyword at start of declaration
        line = re.sub(r'^\s*export\s+(default\s+)?(class|const|let|var|function)\s+', r'\2 ', line)
        line = re.sub(r'^\s*export\s+\{[^}]*\};?', '', line)
        lines.append(line)
    return '\n'.join(lines)

def bundle():
    files = [
        'src/audio.js',
        'src/sprites.js',
        'src/entities/Obstacles.js',
        'src/entities/Player.js',
        'src/world.js',
        'src/game.js'
    ]

    parts = [
        "// JoJo's Journey Bundled Game Script (Works offline & local file://)\n"
    ]

    for fpath in files:
        with open(fpath, 'r', encoding='utf-8') as f:
            content = f.read()
        parts.append(clean_module(content))

    # Add bootstrap with singleton guard
    parts.append("""
if (typeof window !== 'undefined' && !window.jojoGame) {
    window.jojoGame = new Game();
    if (document.readyState === 'loading') {
        window.addEventListener('DOMContentLoaded', () => window.jojoGame.init());
    } else {
        window.jojoGame.init();
    }
}
""")

    bundled_js = '\n\n'.join(parts)

    with open('game.bundle.js', 'w', encoding='utf-8') as f:
        f.write(bundled_js)

    print(f"Successfully generated game.bundle.js ({len(bundled_js)} bytes, {len(bundled_js.splitlines())} lines)")

if __name__ == '__main__':
    bundle()
