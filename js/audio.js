// Audio functionality
let audioContext;
let alarmSounds = {};

function initAudioContext() {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    audioContext = new AudioContext();
    
    // Initialize different alarm sounds
    initializeAlarmSounds();
}

function initializeAlarmSounds() {
    // Create different alarm sounds
    alarmSounds = {
        beep: createBeepSound,
        digital: createDigitalSound,
        chime: createChimeSound,
        bell: createBellSound
    };
}

// Beep sound (original alarm sound)
function createBeepSound() {
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.type = 'square';
    oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
    gainNode.gain.setValueAtTime(0.5, audioContext.currentTime);
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    return {
        oscillator,
        gainNode,
        interval: null,
        start() {
            oscillator.start();
            // Create a beeping effect
            this.beep();
        },
        stop() {
            if (this.interval) {
                clearInterval(this.interval);
            }
            try {
                oscillator.stop();
            } catch (e) {
                console.log('Oscillator already stopped');
            }
        },
        beep() {
            let beepCount = 0;
            this.interval = setInterval(() => {
                if (beepCount % 2 === 0) {
                    gainNode.gain.setValueAtTime(0.5, audioContext.currentTime);
                } else {
                    gainNode.gain.setValueAtTime(0, audioContext.currentTime);
                }
                beepCount++;
            }, 300);
        }
    };
}

// Digital alarm sound
function createDigitalSound() {
    const oscillator1 = audioContext.createOscillator();
    const oscillator2 = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator1.type = 'sine';
    oscillator2.type = 'triangle';
    oscillator1.frequency.setValueAtTime(1200, audioContext.currentTime);
    oscillator2.frequency.setValueAtTime(900, audioContext.currentTime);
    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
    
    oscillator1.connect(gainNode);
    oscillator2.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    return {
        oscillator1,
        oscillator2,
        gainNode,
        interval: null,
        start() {
            oscillator1.start();
            oscillator2.start();
            this.pattern();
        },
        stop() {
            if (this.interval) {
                clearInterval(this.interval);
            }
            try {
                oscillator1.stop();
                oscillator2.stop();
            } catch (e) {
                console.log('Oscillators already stopped');
            }
        },
        pattern() {
            let step = 0;
            const pattern = [1200, 900, 1200, 900, 0, 0];
            this.interval = setInterval(() => {
                const freq = pattern[step % pattern.length];
                if (freq === 0) {
                    gainNode.gain.setValueAtTime(0, audioContext.currentTime);
                } else {
                    oscillator1.frequency.setValueAtTime(freq, audioContext.currentTime);
                    oscillator2.frequency.setValueAtTime(freq * 0.75, audioContext.currentTime);
                    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
                }
                step++;
            }, 200);
        }
    };
}

// Chime sound
function createChimeSound() {
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(440, audioContext.currentTime);
    gainNode.gain.setValueAtTime(0, audioContext.currentTime);
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    return {
        oscillator,
        gainNode,
        interval: null,
        start() {
            oscillator.start();
            this.chime();
        },
        stop() {
            if (this.interval) {
                clearInterval(this.interval);
            }
            try {
                oscillator.stop();
            } catch (e) {
                console.log('Oscillator already stopped');
            }
        },
        chime() {
            let note = 0;
            const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
            this.interval = setInterval(() => {
                if (note < notes.length) {
                    oscillator.frequency.setValueAtTime(notes[note], audioContext.currentTime);
                    gainNode.gain.setValueAtTime(0.4, audioContext.currentTime);
                    gainNode.gain.setTargetAtTime(0, audioContext.currentTime + 0.2, 0.2);
                    note++;
                } else {
                    note = 0; // Reset for next chime sequence
                }
            }, 500);
        }
    };
}

// Bell sound
function createBellSound() {
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    const filter = audioContext.createBiquadFilter();
    
    filter.type = 'lowpass';
    filter.frequency.value = 1000;
    filter.Q.value = 10;
    
    oscillator.type = 'triangle';
    oscillator.frequency.setValueAtTime(150, audioContext.currentTime);
    gainNode.gain.setValueAtTime(0, audioContext.currentTime);
    
    oscillator.connect(filter);
    filter.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    return {
        oscillator,
        gainNode,
        filter,
        interval: null,
        start() {
            oscillator.start();
            this.bell();
        },
        stop() {
            if (this.interval) {
                clearInterval(this.interval);
            }
            try {
                oscillator.stop();
            } catch (e) {
                console.log('Oscillator already stopped');
            }
        },
        bell() {
            let count = 0;
            this.interval = setInterval(() => {
                // Bell strike effect
                oscillator.frequency.setValueAtTime(150, audioContext.currentTime);
                gainNode.gain.setValueAtTime(0.6, audioContext.currentTime);
                oscillator.frequency.exponentialRampToValueAtTime(75, audioContext.currentTime + 0.5);
                gainNode.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 1.5);
                
                count++;
                if (count > 10) {
                    count = 0;
                }
            }, 2000);
        }
    };
}

function playAlarmSound(soundType = 'beep', duration = 30) {
    if (!audioContext) {
        console.error('Audio context not initialized');
        return null;
    }
    
    // Ensure sound type exists or default to beep
    const createSound = alarmSounds[soundType] || alarmSounds.beep;
    
    // Create and start the sound
    const sound = createSound();
    sound.start();
    
    // Auto-stop after specified duration
    setTimeout(() => {
        if (sound) {
            sound.stop();
        }
    }, duration * 1000);
    
    return sound;
}

// Text-to-speech helper
function speak(text) {
    // Cancel any ongoing speech
    speechSynthesis.cancel();
    
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.volume = 1;
    utterance.rate = 1;
    utterance.pitch = 1;
    
    speechSynthesis.speak(utterance);
}