// Voice mode functionality
function initVoiceMode() {
    const voiceButton = document.getElementById('voiceMode');
    const voiceStatus = document.getElementById('voiceStatus');
    
    // Check if browser supports speech recognition
    if ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window) {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true; // Changed to true to detect ongoing speech
        recognition.lang = 'en-US';
        
        voiceButton.addEventListener('click', toggleVoiceMode);
        
        // Set up recognition event handlers
        recognition.onstart = () => {
            isListening = true;
            updateVoiceStatus();
        };
        
        recognition.onend = () => {
            if (voiceModeActive && !isResponding) {
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
        
        // Set up speech synthesis event listeners
        speechSynthesis.addEventListener('voiceschanged', () => {
            console.log('Voices loaded:', speechSynthesis.getVoices().length);
        });
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
        isResponding = false;
        try {
            recognition.start();
            respondToUser("Voice mode activated. How can I help you?");
        } catch (error) {
            console.error('Recognition start error:', error);
        }
        startIdleTimer();
    } else {
        // Stop voice recognition
        voiceButton.classList.remove('active', 'listening', 'idle');
        clearTimeout(idleTimer);
        clearTimeout(speechDebounceTimer);
        try {
            recognition.stop();
            respondToUser("Voice mode deactivated.");
        } catch (error) {
            console.error('Recognition stop error:', error);
        }
    }
    
    updateVoiceStatus();
}

// Track final transcripts and debounce processing
let finalTranscript = '';
let speechDebounceTimer = null;
let lastSpeechTime = 0;
const SPEECH_DEBOUNCE_DELAY = 1500; // 1.5 seconds of silence before processing

function handleSpeechResult(event) {
    // If system is responding, don't process new speech
    if (isResponding) {
        return;
    }
    
    const now = Date.now();
    lastSpeechTime = now;
    
    // Get interim results
    let interimTranscript = '';
    let isFinal = false;
    
    for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        
        if (event.results[i].isFinal) {
            finalTranscript += ' ' + transcript;
            isFinal = true;
        } else {
            interimTranscript += transcript;
        }
    }
    
    // Show interim transcript if available
    if (interimTranscript && !isIdle) {
        document.getElementById('voiceStatus').textContent = 'Listening: ' + interimTranscript;
    }
    
    // Clear any existing timer
    clearTimeout(speechDebounceTimer);
    
    // Set a new timer - will only process speech after silence
    speechDebounceTimer = setTimeout(() => {
        if (finalTranscript.trim()) {
            console.log('Processing speech after silence:', finalTranscript);
            
            // Process the speech
            if (isIdle) {
                // Check for wake word when in idle mode
                if (finalTranscript.toLowerCase().includes('websim') || 
                    finalTranscript.toLowerCase().includes('web sim') ||
                    finalTranscript.toLowerCase().includes('hey websim')) {
                    
                    isIdle = false;
                    updateVoiceStatus();
                    respondToUser("I'm listening. How can I help you?");
                } 
                // Reset transcript regardless of wake word result
                finalTranscript = '';
                return;
            }
            
            // Process speech command
            processVoiceCommand(finalTranscript);
            finalTranscript = ''; // Reset after processing
        }
    }, SPEECH_DEBOUNCE_DELAY);
    
    // If in idle mode and no wake word, don't restart the idle timer
    if (!isIdle) {
        // Reset idle timer as we received speech
        if (voiceModeActive) {
            clearTimeout(idleTimer);
            startIdleTimer();
        }
    }
}

// Helper function to handle both visual and audio responses
function respondToUser(text) {
    // Set the responding state to true
    isResponding = true;
    
    // Try to stop recognition during response
    try {
        recognition.stop();
    } catch (error) {
        console.log("Recognition was already stopped");
    }
    
    // Show visual response
    showVoiceResponse(text);
    
    // Set up event listeners for speech
    const utterance = new SpeechSynthesisUtterance(text);
    
    utterance.onstart = () => {
        console.log("Speech started");
    };
    
    utterance.onend = () => {
        console.log("Speech ended");
        isResponding = false;
        
        // Restart recognition after speaking if voice mode is still active
        if (voiceModeActive) {
            setTimeout(() => {
                try {
                    recognition.start();
                } catch (error) {
                    console.log("Recognition already started");
                }
            }, 500); // Short delay before starting to listen again
        }
    };
    
    utterance.onerror = (event) => {
        console.error("Speech synthesis error:", event);
        isResponding = false;
        
        // Restart recognition if voice mode is still active
        if (voiceModeActive) {
            try {
                recognition.start();
            } catch (error) {
                console.log("Recognition already started");
            }
        }
    };
    
    // Speak the response
    speechSynthesis.cancel(); // Cancel any ongoing speech
    speechSynthesis.speak(utterance);
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
        
        respondToUser(response);
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
        
        respondToUser(response);
    } else if (command.includes('time')) {
        // If the command contains the word "time" but doesn't match any specific pattern,
        // assume the user is asking for the current time
        const now = new Date();
        const options = { 
            hour: 'numeric', 
            minute: 'numeric',
            hour12: true
        };
        const formattedTime = now.toLocaleTimeString('en-US', options);
        respondToUser(`The current time is ${formattedTime}.`);
    } else {
        // If we don't recognize the command
        respondToUser("I'm sorry, I didn't understand that command. You can ask me about the date or time.");
    }
}

function startIdleTimer() {
    clearTimeout(idleTimer);
    idleTimer = setTimeout(() => {
        if (voiceModeActive && !isIdle && !isResponding) {
            isIdle = true;
            updateVoiceStatus();
            respondToUser("I'm now in idle mode. Say 'Websim' to wake me up.");
        }
    }, 10000); // 10 seconds
}

function updateVoiceStatus() {
    const voiceButton = document.getElementById('voiceMode');
    const voiceStatus = document.getElementById('voiceStatus');
    
    if (!voiceModeActive) {
        voiceStatus.textContent = 'Inactive';
        voiceButton.classList.remove('active', 'listening', 'idle');
    } else if (isResponding) {
        voiceStatus.textContent = 'Responding...';
        voiceButton.classList.add('active');
        voiceButton.classList.remove('listening', 'idle');
    } else if (isIdle) {
        voiceStatus.textContent = 'Say "Websim"';
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