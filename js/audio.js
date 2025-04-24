// Audio functionality
function initAudioContext() {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    const audioContext = new AudioContext();
    
    // Create oscillator for alarm sound
    function createAlarmSound() {
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
            start() {
                oscillator.start();
                // Create a beeping effect
                this.beep();
            },
            stop() {
                oscillator.stop();
            },
            beep() {
                let beepCount = 0;
                const beepInterval = setInterval(() => {
                    if (beepCount % 2 === 0) {
                        gainNode.gain.setValueAtTime(0.5, audioContext.currentTime);
                    } else {
                        gainNode.gain.setValueAtTime(0, audioContext.currentTime);
                    }
                    beepCount++;
                    
                    if (beepCount > 10) {
                        clearInterval(beepInterval);
                        this.stop();
                    }
                }, 300);
            }
        };
    }
    
    alarmSound = createAlarmSound;
}

function playAlarmSound() {
    if (alarmSound) {
        const sound = alarmSound();
        sound.start();
    }
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