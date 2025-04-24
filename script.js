// Global variables
let currentDate = new Date();
let alarms = JSON.parse(localStorage.getItem('alarms')) || [];
let alarmSound;

// Voice recognition variables
let recognition;
let speechSynthesis = window.speechSynthesis;
let voiceModeActive = false;
let idleTimer;
let isIdle = false;
let isListening = false;

// Initialize on document load
document.addEventListener('DOMContentLoaded', () => {
    // Initialize calendar
    renderCalendar();
    document.getElementById('prevMonth').addEventListener('click', () => {
        currentDate.setMonth(currentDate.getMonth() - 1);
        renderCalendar();
    });
    document.getElementById('nextMonth').addEventListener('click', () => {
        currentDate.setMonth(currentDate.getMonth() + 1);
        renderCalendar();
    });

    // Initialize clocks
    initializeAnalogClock();
    updateDigitalClock();
    setInterval(() => {
        updateAnalogClock();
        updateDigitalClock();
        checkAlarms();
    }, 1000);

    // Initialize alarms
    document.getElementById('setAlarm').addEventListener('click', addAlarm);
    renderAlarms();
    
    // Initialize audio context
    initAudioContext();

    // Initialize voice mode
    initVoiceMode();
});

// Calendar Functions
function renderCalendar() {
    const monthYear = document.getElementById('monthYear');
    const calendar = document.getElementById('calendar');
    
    const month = currentDate.getMonth();
    const year = currentDate.getFullYear();
    
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    
    monthYear.textContent = `${firstDay.toLocaleString('default', { month: 'long' })} ${year}`;
    
    calendar.innerHTML = '';
    
    // Add days from previous month
    const firstDayIndex = firstDay.getDay();
    const prevLastDay = new Date(year, month, 0).getDate();
    
    for (let i = firstDayIndex; i > 0; i--) {
        const dayElement = document.createElement('div');
        dayElement.classList.add('day', 'other-month');
        dayElement.textContent = prevLastDay - i + 1;
        calendar.appendChild(dayElement);
    }
    
    // Current month days
    for (let i = 1; i <= lastDay.getDate(); i++) {
        const dayElement = document.createElement('div');
        dayElement.classList.add('day');
        dayElement.textContent = i;
        
        const today = new Date();
        if (i === today.getDate() && month === today.getMonth() && year === today.getFullYear()) {
            dayElement.classList.add('today');
        }
        
        calendar.appendChild(dayElement);
    }
    
    // Next month days
    const nextDays = 42 - (firstDayIndex + lastDay.getDate());
    for (let i = 1; i <= nextDays; i++) {
        const dayElement = document.createElement('div');
        dayElement.classList.add('day', 'other-month');
        dayElement.textContent = i;
        calendar.appendChild(dayElement);
    }
}

// Analog Clock Functions
function initializeAnalogClock() {
    const hourMarkers = document.querySelector('.hour-markers');
    hourMarkers.innerHTML = ''; // Clear existing markers first
    
    // Create hour markers
    for (let i = 1; i <= 12; i++) {
        const marker = document.createElement('div');
        marker.classList.add('hour-marker');
        const angle = (i * 30) - 90; // 30 degrees per hour, -90 to start at 12 o'clock
        const radians = angle * Math.PI / 180;
        const radius = 42; // Position relative to clock size (percentage from center)
        
        marker.style.position = 'absolute';
        marker.style.top = `${50 + radius * Math.sin(radians)}%`;
        marker.style.left = `${50 + radius * Math.cos(radians)}%`;
        marker.style.transform = 'translate(-50%, -50%)';
        marker.textContent = i;
        
        hourMarkers.appendChild(marker);
    }
    
    updateAnalogClock();
}

function updateAnalogClock() {
    const now = new Date();
    const hours = now.getHours() % 12;
    const minutes = now.getMinutes();
    const seconds = now.getSeconds();
    
    const hourAngle = (hours * 30) + (minutes * 0.5); // 30 degrees per hour + adjustment for minutes
    const minuteAngle = minutes * 6; // 6 degrees per minute
    const secondAngle = seconds * 6; // 6 degrees per second
    
    document.querySelector('.hour-hand').style.transform = `translateX(-50%) rotate(${hourAngle}deg)`;
    document.querySelector('.minute-hand').style.transform = `translateX(-50%) rotate(${minuteAngle}deg)`;
    document.querySelector('.second-hand').style.transform = `translateX(-50%) rotate(${secondAngle}deg)`;
}

// Digital Clock Functions
function updateDigitalClock() {
    const now = new Date();
    const digitalTime = document.getElementById('digital-time');
    const digitalDate = document.getElementById('digital-date');
    
    // Format time as HH:MM:SS AM/PM
    let hours = now.getHours();
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12; // Convert 0 to 12
    const minutes = now.getMinutes().toString().padStart(2, '0');
    const seconds = now.getSeconds().toString().padStart(2, '0');
    digitalTime.textContent = `${hours}:${minutes}:${seconds} ${ampm}`;
    
    // Format date as Day, Month Date, Year
    digitalDate.textContent = now.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
}

// Alarm Functions
function addAlarm() {
    const alarmTimeInput = document.getElementById('alarmTime');
    const alarmTime = alarmTimeInput.value;
    
    if (!alarmTime) {
        alert('Please select a time for the alarm');
        return;
    }
    
    // Create new alarm object
    const newAlarm = {
        id: Date.now().toString(),
        time: alarmTime,
        active: true
    };
    
    // Add to alarms array
    alarms.push(newAlarm);
    
    // Save to localStorage
    saveAlarms();
    
    // Render alarms
    renderAlarms();
    
    // Clear input
    alarmTimeInput.value = '';
}

function deleteAlarm(id) {
    alarms = alarms.filter(alarm => alarm.id !== id);
    saveAlarms();
    renderAlarms();
}

function saveAlarms() {
    localStorage.setItem('alarms', JSON.stringify(alarms));
}

function renderAlarms() {
    const alarmsList = document.getElementById('alarmsList');
    alarmsList.innerHTML = '';
    
    if (alarms.length === 0) {
        alarmsList.innerHTML = '<p>No alarms set</p>';
        return;
    }
    
    alarms.forEach(alarm => {
        const alarmItem = document.createElement('div');
        alarmItem.classList.add('alarm-item');
        
        // Format time for display (12 hour format)
        const [hours, minutes] = alarm.time.split(':');
        const hour = parseInt(hours);
        const ampm = hour >= 12 ? 'PM' : 'AM';
        const hour12 = hour % 12 || 12;
        const formattedTime = `${hour12}:${minutes} ${ampm}`;
        
        alarmItem.innerHTML = `
            <span>${formattedTime}</span>
            <button class="delete-alarm" data-id="${alarm.id}">Delete</button>
        `;
        
        alarmsList.appendChild(alarmItem);
    });
    
    // Add event listeners for delete buttons
    document.querySelectorAll('.delete-alarm').forEach(button => {
        button.addEventListener('click', (e) => {
            const id = e.target.getAttribute('data-id');
            deleteAlarm(id);
        });
    });
}

function checkAlarms() {
    const now = new Date();
    const currentHour = now.getHours().toString().padStart(2, '0');
    const currentMinute = now.getMinutes().toString().padStart(2, '0');
    const currentTimeString = `${currentHour}:${currentMinute}`;
    
    alarms.forEach(alarm => {
        if (alarm.active && alarm.time === currentTimeString && now.getSeconds() === 0) {
            playAlarmSound();
            alert(`Alarm! It's ${alarm.time}`);
        }
    });
}

// Audio Functions
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

// Voice Mode Functions
function initVoiceMode() {
    const voiceButton = document.getElementById('voiceMode');
    const voiceStatus = document.getElementById('voiceStatus');
    
    // Check if browser supports speech recognition
    if ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window) {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = false;
        recognition.lang = 'en-US';
        
        voiceButton.addEventListener('click', toggleVoiceMode);
        
        // Set up recognition event handlers
        recognition.onstart = () => {
            isListening = true;
            updateVoiceStatus();
        };
        
        recognition.onend = () => {
            if (voiceModeActive) {
                recognition.start(); // Restart recognition if mode is still active
            } else {
                isListening = false;
                updateVoiceStatus();
            }
        };
        
        recognition.onresult = handleSpeechResult;
        
        recognition.onerror = (event) => {
            console.error('Speech recognition error:', event.error);
            if (event.error === 'no-speech' && voiceModeActive) {
                startIdleTimer();
            }
        };
    } else {
        voiceButton.disabled = true;
        voiceStatus.textContent = 'Not supported in this browser';
        console.error('Speech recognition not supported');
    }
}

function toggleVoiceMode() {
    const voiceButton = document.getElementById('voiceMode');
    
    voiceModeActive = !voiceModeActive;
    
    if (voiceModeActive) {
        // Start voice recognition
        voiceButton.classList.add('active');
        isIdle = false;
        try {
            recognition.start();
            showVoiceResponse("Voice mode activated. How can I help you?");
            speak("Voice mode activated. How can I help you?");
        } catch (error) {
            console.error('Recognition start error:', error);
        }
        startIdleTimer();
    } else {
        // Stop voice recognition
        voiceButton.classList.remove('active', 'listening', 'idle');
        clearTimeout(idleTimer);
        try {
            recognition.stop();
            showVoiceResponse("Voice mode deactivated.");
            speak("Voice mode deactivated.");
        } catch (error) {
            console.error('Recognition stop error:', error);
        }
    }
    
    updateVoiceStatus();
}

function handleSpeechResult(event) {
    const transcript = Array.from(event.results)
        .map(result => result[0].transcript)
        .join('');
    
    console.log('Speech recognized:', transcript);
    
    // Reset idle timer as we received speech
    if (voiceModeActive) {
        clearTimeout(idleTimer);
        startIdleTimer();
    }
    
    if (isIdle) {
        // Check for wake word when in idle mode
        if (transcript.toLowerCase().includes('websim') || 
            transcript.toLowerCase().includes('web sim') ||
            transcript.toLowerCase().includes('hey websim')) {
            
            isIdle = false;
            updateVoiceStatus();
            showVoiceResponse("I'm listening. How can I help you?");
            speak("I'm listening. How can I help you?");
            return;
        }
        // Ignore other speech when idle
        return;
    }
    
    // Process speech command
    processVoiceCommand(transcript);
}

function processVoiceCommand(command) {
    command = command.toLowerCase().trim();
    
    // Date query patterns
    const datePatterns = [
        /what (date|day) is (it|today)/i,
        /what is today('s date)?/i,
        /(tell me|what's) (the|today's) date/i,
        /what day (of the week|of the month)? is it/i,
        /what is the current date/i,
        /today's date/i
    ];
    
    // Time query patterns
    const timePatterns = [
        /what (time|hour) is it/i,
        /what('s| is) the (current |)time/i,
        /(tell me|what's) the time/i,
        /do you (have|know) the time/i,
        /got the time/i,
        /check the time/i,
        /current time/i
    ];
    
    // Format patterns
    const formatPatterns = {
        // Date formats
        shortFormat: /(short|brief|simple) format/i,
        longFormat: /(long|full|complete) format/i,
        numericalFormat: /(numerical|number) format/i,
        dayOfWeek: /(day of the week|weekday)/i,
        monthYear: /(month and year|month year)/i,
        
        // Time formats
        militaryTime: /(military|24[-\s]hour) time/i,
        twentyFourHour: /24[-\s]hour (format|time)/i,
        twelveHour: /12[-\s]hour (format|time)/i,
        withSeconds: /with seconds/i,
        withoutSeconds: /without seconds/i
    };
    
    // Time zone patterns
    const timeZonePatterns = [
        /time in ([a-z\s]+)/i,
        /what('s| is) the time in ([a-z\s]+)/i,
        /what time is it in ([a-z\s]+)/i
    ];
    
    // Time zone mapping (common ones)
    const timeZones = {
        "eastern": "America/New_York",
        "est": "America/New_York",
        "et": "America/New_York",
        "new york": "America/New_York",
        "central": "America/Chicago",
        "cst": "America/Chicago",
        "ct": "America/Chicago",
        "chicago": "America/Chicago",
        "mountain": "America/Denver",
        "mst": "America/Denver",
        "mt": "America/Denver",
        "denver": "America/Denver",
        "pacific": "America/Los_Angeles",
        "pst": "America/Los_Angeles",
        "pt": "America/Los_Angeles",
        "los angeles": "America/Los_Angeles",
        "london": "Europe/London",
        "gmt": "Europe/London",
        "utc": "Etc/UTC",
        "paris": "Europe/Paris",
        "tokyo": "Asia/Tokyo",
        "sydney": "Australia/Sydney",
        "india": "Asia/Kolkata",
        "delhi": "Asia/Kolkata",
        "mumbai": "Asia/Kolkata",
        "beijing": "Asia/Shanghai",
        "china": "Asia/Shanghai",
        "hong kong": "Asia/Hong_Kong"
    };
    
    // Check if command is asking for date
    const isDateQuery = datePatterns.some(pattern => pattern.test(command));
    
    // Check if command is asking for time
    const isTimeQuery = timePatterns.some(pattern => pattern.test(command));
    
    // Check if command is asking for time in a specific timezone
    let timeZoneMatch = null;
    let requestedTimeZone = null;
    
    for (const pattern of timeZonePatterns) {
        const match = command.match(pattern);
        if (match && match.length > 1) {
            timeZoneMatch = match;
            const zoneName = match[match.length - 1].toLowerCase().trim();
            
            // Find the time zone in our mapping
            for (const [key, value] of Object.entries(timeZones)) {
                if (zoneName.includes(key)) {
                    requestedTimeZone = value;
                    break;
                }
            }
            break;
        }
    }
    
    if (isDateQuery) {
        const now = new Date();
        let response = "";
        let formattedDate = "";
        
        // Check for specific format requests
        if (formatPatterns.shortFormat.test(command)) {
            formattedDate = now.toLocaleDateString();
            response = `Today's date in short format is ${formattedDate}.`;
        } else if (formatPatterns.longFormat.test(command)) {
            formattedDate = now.toLocaleDateString('en-US', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            });
            response = `Today's date in full format is ${formattedDate}.`;
        } else if (formatPatterns.numericalFormat.test(command)) {
            formattedDate = `${now.getMonth() + 1}/${now.getDate()}/${now.getFullYear()}`;
            response = `Today's date in numerical format is ${formattedDate}.`;
        } else if (formatPatterns.dayOfWeek.test(command)) {
            formattedDate = now.toLocaleDateString('en-US', { weekday: 'long' });
            response = `Today is ${formattedDate}.`;
        } else if (formatPatterns.monthYear.test(command)) {
            formattedDate = now.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
            response = `It's ${formattedDate}.`;
        } else {
            // Default format
            formattedDate = now.toLocaleDateString('en-US', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            });
            response = `Today's date is ${formattedDate}.`;
        }
        
        showVoiceResponse(response);
        speak(response);
    } else if (isTimeQuery || timeZoneMatch) {
        let now = new Date();
        let response = "";
        let formattedTime = "";
        
        // Handle time zone conversion if requested
        if (requestedTimeZone) {
            try {
                // Format the time in the requested time zone
                const options = { 
                    timeZone: requestedTimeZone,
                    hour: 'numeric', 
                    minute: 'numeric',
                    second: formatPatterns.withSeconds.test(command) ? 'numeric' : undefined,
                    hour12: !formatPatterns.militaryTime.test(command) && !formatPatterns.twentyFourHour.test(command)
                };
                
                formattedTime = new Intl.DateTimeFormat('en-US', options).format(now);
                
                // Get a friendly name for the time zone
                let friendlyZoneName = timeZoneMatch[timeZoneMatch.length - 1].trim();
                // Capitalize first letter of each word
                friendlyZoneName = friendlyZoneName.replace(/\b\w/g, l => l.toUpperCase());
                
                response = `The current time in ${friendlyZoneName} is ${formattedTime}.`;
            } catch (error) {
                response = `I'm sorry, I couldn't determine the time for that location.`;
                console.error("Time zone conversion error:", error);
            }
        } else {
            // Handle specific time format requests
            const options = { 
                hour: 'numeric', 
                minute: 'numeric'
            };
            
            if (formatPatterns.withSeconds.test(command)) {
                options.second = 'numeric';
            }
            
            if (formatPatterns.militaryTime.test(command) || formatPatterns.twentyFourHour.test(command)) {
                options.hour12 = false;
                let formattedTime = now.toLocaleTimeString('en-US', options);
                response = `The current time in 24-hour format is ${formattedTime}.`;
            } else if (formatPatterns.twelveHour.test(command)) {
                options.hour12 = true;
                let formattedTime = now.toLocaleTimeString('en-US', options);
                response = `The current time in 12-hour format is ${formattedTime}.`;
            } else {
                // Default format (12-hour with AM/PM)
                options.hour12 = true;
                formattedTime = now.toLocaleTimeString('en-US', options);
                response = `The current time is ${formattedTime}.`;
            }
        }
        
        showVoiceResponse(response);
        speak(response);
    }
}

function speak(text) {
    // Cancel any ongoing speech
    speechSynthesis.cancel();
    
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.volume = 1;
    utterance.rate = 1;
    utterance.pitch = 1;
    
    speechSynthesis.speak(utterance);
}

function startIdleTimer() {
    clearTimeout(idleTimer);
    idleTimer = setTimeout(() => {
        if (voiceModeActive && !isIdle) {
            isIdle = true;
            updateVoiceStatus();
            showVoiceResponse("I'm now in idle mode. Say 'Websim' to wake me up.");
            speak("I'm now in idle mode. Say 'Websim' to wake me up.");
        }
    }, 10000); // 10 seconds
}

function updateVoiceStatus() {
    const voiceButton = document.getElementById('voiceMode');
    const voiceStatus = document.getElementById('voiceStatus');
    
    if (!voiceModeActive) {
        voiceStatus.textContent = 'Inactive';
        voiceButton.classList.remove('active', 'listening', 'idle');
    } else if (isIdle) {
        voiceStatus.textContent = 'Idle - Say "Websim" to wake';
        voiceButton.classList.add('idle');
        voiceButton.classList.remove('listening');
    } else if (isListening) {
        voiceStatus.textContent = 'Listening...';
        voiceButton.classList.add('listening');
        voiceButton.classList.remove('idle');
    } else {
        voiceStatus.textContent = 'Active';
        voiceButton.classList.add('active');
        voiceButton.classList.remove('listening', 'idle');
    }
}

function showVoiceResponse(text) {
    const responseEl = document.getElementById('voiceResponse');
    responseEl.textContent = text;
    responseEl.classList.add('active');
    
    // Hide after a few seconds
    setTimeout(() => {
        responseEl.classList.remove('active');
    }, 5000);
}