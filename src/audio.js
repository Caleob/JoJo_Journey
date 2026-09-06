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

export const sounds = new SoundManager();
