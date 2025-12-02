/**
 * MusicSystem.js - Dynamic Orchestral Music System
 * Procedural music using Web Audio API that changes based on game state
 */

export class MusicSystem {
    constructor(game) {
        this.game = game;
        
        // Audio context
        this.audioContext = null;
        this.masterGain = null;
        
        // Music tracks
        this.currentTrack = null;
        this.currentState = 'exploration';
        this.tracks = {};
        
        // Settings
        this.enabled = true;
        this.volume = 0.3; // 30% volume by default
        
        // Load settings from localStorage
        this.loadSettings();
        
        // Initialize audio context (will be created on first user interaction)
        this.initAudioContext();
    }
    
    loadSettings() {
        const saved = localStorage.getItem('musicSettings');
        if (saved) {
            const settings = JSON.parse(saved);
            this.enabled = settings.enabled !== false;
            this.volume = settings.volume ?? 0.3;
        }
    }
    
    saveSettings() {
        localStorage.setItem('musicSettings', JSON.stringify({
            enabled: this.enabled,
            volume: this.volume
        }));
    }
    
    initAudioContext() {
        // Audio context must be created on user interaction
        document.addEventListener('click', () => {
            if (!this.audioContext) {
                this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
                this.masterGain = this.audioContext.createGain();
                this.masterGain.connect(this.audioContext.destination);
                this.masterGain.gain.value = this.enabled ? this.volume : 0;
                
                // Start with exploration music
                this.playExplorationMusic();
            }
        }, { once: true });
    }
    
    setVolume(volume) {
        this.volume = Math.max(0, Math.min(1, volume));
        if (this.masterGain) {
            this.masterGain.gain.value = this.enabled ? this.volume : 0;
        }
        this.saveSettings();
    }
    
    setEnabled(enabled) {
        this.enabled = enabled;
        if (this.masterGain) {
            this.masterGain.gain.value = enabled ? this.volume : 0;
        }
        this.saveSettings();
    }
    
    update() {
        if (!this.enabled || !this.audioContext) return;
        
        // Determine game state and switch music accordingly
        const newState = this.determineGameState();
        
        if (newState !== this.currentState) {
            this.transitionToState(newState);
        }
    }
    
    determineGameState() {
        // Check if at a Site of Grace
        if (this.game.checkpointSystem && this.game.checkpointSystem.activeCheckpoint) {
            return 'grace';
        }
        
        // Check if fighting a boss
        for (const boss of this.game.bosses) {
            if (boss.isAlive && boss.hasAggro) {
                return 'boss';
            }
        }
        
        // Check if in combat with enemies
        for (const enemy of this.game.enemies) {
            if (enemy.isAlive && enemy.hasAggro) {
                return 'combat';
            }
        }
        
        // Default to exploration
        return 'exploration';
    }
    
    transitionToState(newState) {
        // Fade out current track
        if (this.currentTrack) {
            this.fadeOut(this.currentTrack, 2);
        }
        
        // Start new track
        this.currentState = newState;
        
        switch (newState) {
            case 'exploration':
                this.playExplorationMusic();
                break;
            case 'combat':
                this.playCombatMusic();
                break;
            case 'boss':
                this.playBossMusic();
                break;
            case 'grace':
                this.playGraceMusic();
                break;
        }
    }
    
    playExplorationMusic() {
        if (!this.audioContext) return;
        
        this.stopCurrentTrack();
        
        // Exploration music - Low string drone with atmospheric melody
        const track = {
            oscillators: [],
            gains: [],
            filters: []
        };
        
        // Drone bass (deep strings)
        const droneFreqs = [65.41, 82.41, 98]; // C2, E2, G2
        droneFreqs.forEach((freq, i) => {
            const osc = this.audioContext.createOscillator();
            const gain = this.audioContext.createGain();
            const filter = this.audioContext.createBiquadFilter();
            
            osc.type = 'sawtooth';
            osc.frequency.value = freq;
            
            filter.type = 'lowpass';
            filter.frequency.value = 400;
            
            gain.gain.value = 0;
            gain.gain.linearRampToValueAtTime(0.08 / droneFreqs.length, this.audioContext.currentTime + 3);
            
            osc.connect(filter);
            filter.connect(gain);
            gain.connect(this.masterGain);
            
            osc.start();
            
            track.oscillators.push(osc);
            track.gains.push(gain);
            track.filters.push(filter);
        });
        
        // Atmospheric melody (slow, sparse)
        this.playMelodyNotes(track, [
            { freq: 261.63, time: 0, duration: 4 },    // C4
            { freq: 329.63, time: 5, duration: 4 },    // E4
            { freq: 293.66, time: 10, duration: 4 },   // D4
            { freq: 246.94, time: 15, duration: 6 }    // B3
        ], 'sine', 0.15);
        
        this.currentTrack = track;
        this.tracks.exploration = track;
    }
    
    playCombatMusic() {
        if (!this.audioContext) return;
        
        this.stopCurrentTrack();
        
        // Combat music - Driving rhythm at 120 BPM
        const track = {
            oscillators: [],
            gains: [],
            filters: []
        };
        
        // Percussion (using filtered noise)
        const beatInterval = 60 / 120; // 120 BPM
        this.playRhythmPattern(track, beatInterval);
        
        // Intense string chords
        const chordFreqs = [
            [130.81, 164.81, 196],    // C3 E3 G3
            [146.83, 174.61, 220],    // D3 F3 A3
            [123.47, 155.56, 185]     // B2 D#3 F#3
        ];
        
        chordFreqs.forEach((chord, chordIndex) => {
            chord.forEach((freq) => {
                const osc = this.audioContext.createOscillator();
                const gain = this.audioContext.createGain();
                const filter = this.audioContext.createBiquadFilter();
                
                osc.type = 'sawtooth';
                osc.frequency.value = freq;
                
                filter.type = 'bandpass';
                filter.frequency.value = 800;
                
                // Pulsing intensity
                const pulseSpeed = 2;
                gain.gain.setValueAtTime(0, this.audioContext.currentTime);
                for (let i = 0; i < 100; i++) {
                    const time = this.audioContext.currentTime + (i * pulseSpeed);
                    gain.gain.linearRampToValueAtTime(0.12, time);
                    gain.gain.linearRampToValueAtTime(0.04, time + pulseSpeed / 2);
                }
                
                osc.connect(filter);
                filter.connect(gain);
                gain.connect(this.masterGain);
                
                osc.start();
                
                track.oscillators.push(osc);
                track.gains.push(gain);
                track.filters.push(filter);
            });
        });
        
        this.currentTrack = track;
        this.tracks.combat = track;
    }
    
    playBossMusic() {
        if (!this.audioContext) return;
        
        this.stopCurrentTrack();
        
        // Boss music - Epic drums at 90 BPM with brass fanfare
        const track = {
            oscillators: [],
            gains: [],
            filters: []
        };
        
        // Epic drums
        const beatInterval = 60 / 90; // 90 BPM
        this.playRhythmPattern(track, beatInterval, true);
        
        // Brass fanfare
        const brassFreqs = [
            [130.81, 164.81, 196, 246.94],    // C3 E3 G3 B3
            [146.83, 185, 220, 277.18]         // D3 F#3 A3 C#4
        ];
        
        brassFreqs.forEach((chord) => {
            chord.forEach((freq) => {
                const osc = this.audioContext.createOscillator();
                const gain = this.audioContext.createGain();
                
                osc.type = 'square';
                osc.frequency.value = freq;
                
                gain.gain.value = 0;
                gain.gain.linearRampToValueAtTime(0.1, this.audioContext.currentTime + 1);
                
                osc.connect(gain);
                gain.connect(this.masterGain);
                
                osc.start();
                
                track.oscillators.push(osc);
                track.gains.push(gain);
            });
        });
        
        // Choir pad (using filtered sawtooth)
        [65.41, 82.41, 98, 123.47].forEach((freq) => {
            const osc = this.audioContext.createOscillator();
            const gain = this.audioContext.createGain();
            const filter = this.audioContext.createBiquadFilter();
            
            osc.type = 'sawtooth';
            osc.frequency.value = freq;
            
            filter.type = 'lowpass';
            filter.frequency.value = 300;
            
            gain.gain.value = 0;
            gain.gain.linearRampToValueAtTime(0.06, this.audioContext.currentTime + 2);
            
            osc.connect(filter);
            filter.connect(gain);
            gain.connect(this.masterGain);
            
            osc.start();
            
            track.oscillators.push(osc);
            track.gains.push(gain);
            track.filters.push(filter);
        });
        
        this.currentTrack = track;
        this.tracks.boss = track;
    }
    
    playGraceMusic() {
        if (!this.audioContext) return;
        
        this.stopCurrentTrack();
        
        // Grace music - Gentle harp arpeggios with soft pad
        const track = {
            oscillators: [],
            gains: [],
            filters: []
        };
        
        // Harp arpeggios (using sine waves)
        const arpeggio = [261.63, 329.63, 392, 523.25]; // C4 E4 G4 C5
        this.playArpeggio(track, arpeggio, 0.6, 0.15);
        
        // Soft pad chords
        const padFreqs = [261.63, 329.63, 392]; // C4 E4 G4
        padFreqs.forEach((freq) => {
            const osc = this.audioContext.createOscillator();
            const gain = this.audioContext.createGain();
            const filter = this.audioContext.createBiquadFilter();
            
            osc.type = 'sine';
            osc.frequency.value = freq;
            
            filter.type = 'lowpass';
            filter.frequency.value = 1000;
            
            gain.gain.value = 0;
            gain.gain.linearRampToValueAtTime(0.08, this.audioContext.currentTime + 2);
            
            osc.connect(filter);
            filter.connect(gain);
            gain.connect(this.masterGain);
            
            osc.start();
            
            track.oscillators.push(osc);
            track.gains.push(gain);
            track.filters.push(filter);
        });
        
        this.currentTrack = track;
        this.tracks.grace = track;
    }
    
    playMelodyNotes(track, notes, waveType, volume) {
        if (!this.audioContext) return;
        
        notes.forEach(note => {
            const osc = this.audioContext.createOscillator();
            const gain = this.audioContext.createGain();
            
            osc.type = waveType || 'sine';
            osc.frequency.value = note.freq;
            
            const startTime = this.audioContext.currentTime + note.time;
            const endTime = startTime + note.duration;
            
            gain.gain.value = 0;
            gain.gain.linearRampToValueAtTime(volume, startTime + 0.1);
            gain.gain.linearRampToValueAtTime(0, endTime);
            
            osc.connect(gain);
            gain.connect(this.masterGain);
            
            osc.start(startTime);
            osc.stop(endTime);
            
            track.oscillators.push(osc);
            track.gains.push(gain);
        });
    }
    
    playArpeggio(track, notes, interval, volume) {
        if (!this.audioContext) return;
        
        for (let i = 0; i < 20; i++) {
            notes.forEach((freq, index) => {
                const osc = this.audioContext.createOscillator();
                const gain = this.audioContext.createGain();
                
                osc.type = 'sine';
                osc.frequency.value = freq;
                
                const startTime = this.audioContext.currentTime + (i * notes.length * interval) + (index * interval);
                const duration = interval * 0.8;
                
                gain.gain.value = 0;
                gain.gain.linearRampToValueAtTime(volume, startTime + 0.01);
                gain.gain.linearRampToValueAtTime(0, startTime + duration);
                
                osc.connect(gain);
                gain.connect(this.masterGain);
                
                osc.start(startTime);
                osc.stop(startTime + duration);
                
                track.oscillators.push(osc);
                track.gains.push(gain);
            });
        }
    }
    
    playRhythmPattern(track, beatInterval, intense = false) {
        if (!this.audioContext) return;
        
        const numBeats = 100;
        
        for (let i = 0; i < numBeats; i++) {
            const time = this.audioContext.currentTime + (i * beatInterval);
            
            // Create noise for percussion
            const noise = this.audioContext.createBufferSource();
            const buffer = this.audioContext.createBuffer(1, this.audioContext.sampleRate * 0.1, this.audioContext.sampleRate);
            const data = buffer.getChannelData(0);
            
            for (let j = 0; j < data.length; j++) {
                data[j] = Math.random() * 2 - 1;
            }
            
            noise.buffer = buffer;
            
            const filter = this.audioContext.createBiquadFilter();
            filter.type = 'lowpass';
            filter.frequency.value = intense ? 200 : 150;
            
            const gain = this.audioContext.createGain();
            gain.gain.value = intense ? 0.3 : 0.2;
            gain.gain.exponentialRampToValueAtTime(0.01, time + 0.1);
            
            noise.connect(filter);
            filter.connect(gain);
            gain.connect(this.masterGain);
            
            noise.start(time);
        }
    }
    
    stopCurrentTrack() {
        if (this.currentTrack) {
            this.currentTrack.oscillators.forEach(osc => {
                try {
                    osc.stop();
                } catch (e) {
                    // Oscillator might already be stopped
                }
            });
            
            this.currentTrack = null;
        }
    }
    
    fadeOut(track, duration) {
        if (!track || !track.gains) return;
        
        track.gains.forEach(gain => {
            gain.gain.linearRampToValueAtTime(0, this.audioContext.currentTime + duration);
        });
        
        setTimeout(() => {
            if (track.oscillators) {
                track.oscillators.forEach(osc => {
                    try {
                        osc.stop();
                    } catch (e) {
                        // Oscillator might already be stopped
                    }
                });
            }
        }, duration * 1000);
    }
}
