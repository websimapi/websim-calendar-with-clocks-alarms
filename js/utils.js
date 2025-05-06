// Shared state and utility functions
let currentDate = new Date();
let alarms = JSON.parse(localStorage.getItem('alarms')) || [];
let alarmSound;
let lastCheckedDate = new Date().toDateString(); // Track the last checked date

// Voice recognition state
let recognition;
let speechSynthesis = window.speechSynthesis;
let voiceModeActive = false;
let idleTimer;
let isIdle = false;
let isListening = false;
let isResponding = false; // New state to track when the system is responding

// Event emitter for cross-module communication
const EventEmitter = {
    events: {},
    
    on(event, callback) {
        if (!this.events[event]) {
            this.events[event] = [];
        }
        this.events[event].push(callback);
    },
    
    emit(event, data) {
        if (this.events[event]) {
            this.events[event].forEach(callback => callback(data));
        }
    }
};

// Helper function to save alarms to localStorage
function saveAlarms() {
    localStorage.setItem('alarms', JSON.stringify(alarms));
}

// Helper for showing voice responses
function showVoiceResponse(text) {
    const responseEl = document.getElementById('voiceResponse');
    responseEl.textContent = text;
    responseEl.classList.add('active');
    
    // Hide after a few seconds
    setTimeout(() => {
        responseEl.classList.remove('active');
    }, 5000);
}