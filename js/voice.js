// Voice mode functionality
function initVoiceMode() {
    const voiceButton = document.getElementById('voiceMode');
    const voiceStatus = document.getElementById('voiceStatus');
    
    // Check if browser supports speech recognition
    if ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window) {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        recognition = new SpeechRecognition();
        recognition.continuous = false; // Changed to false to prevent multiple recognitions
        recognition.interimResults = false;
        recognition.lang = 'en-US';
        
        voiceButton.addEventListener('click', toggleVoiceMode);
        
        // Set up recognition event handlers
        recognition.onstart = () => {
            isListening = true;
            updateVoiceStatus();
        };
        
        recognition.onend = () => {
            isListening = false;
            updateVoiceStatus();
            
            // Only restart if voice mode is still active and we're not processing a command
            if (voiceModeActive && !isProcessingCommand) {
                setTimeout(() => {
                    if (voiceModeActive) {
                        try {
                            recognition.start();
                        } catch (error) {
                            console.error('Error restarting recognition:', error);
                        }
                    }
                }, 250); // Small delay to prevent rapid restarts
            }
        };
        
        recognition.onresult = handleSpeechResult;
        
        recognition.onerror = (event) => {
            console.error('Speech recognition error:', event.error);
            isListening = false;
            updateVoiceStatus();
            
            if (event.error === 'no-speech' && voiceModeActive) {
                startIdleTimer();
            }
            
            // Auto-recover from errors
            if (voiceModeActive && !isProcessingCommand) {
                setTimeout(() => {
                    if (voiceModeActive) {
                        try {
                            recognition.start();
                        } catch (error) {
                            console.error('Error recovering recognition:', error);
                        }
                    }
                }, 1000);
            }
        };
    } else {
        voiceButton.disabled = true;
        voiceStatus.textContent = 'Not supported in this browser';
        console.error('Speech recognition not supported');
    }
}

// Flag to prevent command processing overlap
let isProcessingCommand = false;
// Store the last processed command to prevent duplicates
let lastProcessedCommand = '';
// Timestamp of last command to prevent rapid repeats
let lastCommandTime = 0;

function toggleVoiceMode() {
    const voiceButton = document.getElementById('voiceMode');
    
    voiceModeActive = !voiceModeActive;
    isProcessingCommand = false;
    lastProcessedCommand = '';
    
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
    // Get the most recent result
    const lastResultIndex = event.results.length - 1;
    const transcript = event.results[lastResultIndex][0].transcript.trim();
    
    // Log recognized speech
    console.log('Speech recognized:', transcript);
    
    // Prevent rapid repeats and duplicate processing 
    const now = Date.now();
    if (now - lastCommandTime < 2000 || transcript === lastProcessedCommand) {
        console.log('Skipping duplicate or rapid command:', transcript);
        return;
    }
    
    // Reset idle timer as we received speech
    if (voiceModeActive) {
        clearTimeout(idleTimer);
        startIdleTimer();
    }
    
    if (isIdle) {
        // Check for wake word when in idle mode
        const lowerTranscript = transcript.toLowerCase();
        if (lowerTranscript.includes('websim') || 
            lowerTranscript.includes('web sim') ||
            lowerTranscript.includes('hey websim')) {
            
            isIdle = false;
            updateVoiceStatus();
            showVoiceResponse("I'm listening. How can I help you?");
            speak("I'm listening. How can I help you?");
            return;
        }
        // Ignore other speech when idle
        return;
    }
    
    // Set processing flag to prevent overlap
    isProcessingCommand = true;
    lastProcessedCommand = transcript;
    lastCommandTime = now;
    
    // Process speech command
    processVoiceCommand(transcript);
    
    // Release processing lock after a delay
    setTimeout(() => {
        isProcessingCommand = false;
    }, 2000); // 2 seconds lock to prevent rapid processing
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
        /(do you|can you) (have|know|tell me) the time/i,
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

function startIdleTimer() {
    clearTimeout(idleTimer);
    idleTimer = setTimeout(() => {
        if (voiceModeActive && !isIdle && !isProcessingCommand) {
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