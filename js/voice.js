// Voice mode functionality
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
    
    // Existing date query patterns
    const datePatterns = [
        /what (date|day) is (it|today)/i,
        /what is today('s date)?/i,
        /(tell me|what's) (the|today's) date/i,
        /what day (of the week|of the month)? is it/i,
        /what is the current date/i,
        /today's date/i
    ];
    
    // Existing time query patterns
    const timePatterns = [
        /what (time|hour) is it/i,
        /what('s| is) the (current |)time/i,
        /(tell me|what's) the time/i,
        /do you (have|know) the time/i,
        /got the time/i,
        /check the time/i,
        /current time/i
    ];
    
    // Alarm setting patterns
    const alarmSetPatterns = [
        /set (an|a) alarm for (.+)/i,
        /set (an|a) (recurring|repeating|daily|weekly|monthly) alarm for (.+)/i,
        /wake me (up )?at (.+)/i,
        /remind me at (.+)/i,
        /create (an|a) alarm for (.+)/i,
        /add (an|a) alarm for (.+)/i,
        /schedule (an|a) alarm for (.+)/i
    ];
    
    // Alarm deletion patterns
    const alarmDeletePatterns = [
        /delete (the|all|my) alarms?/i,
        /remove (the|all|my) alarms?/i,
        /cancel (the|all|my) alarms?/i,
        /clear (the|all|my) alarms?/i,
        /turn off (the|all|my) alarms?/i,
        /delete (the|my) alarm (at|for) (.+)/i,
        /remove (the|my) alarm (at|for) (.+)/i,
        /cancel (the|my) alarm (at|for) (.+)/i
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
    
    // Check for alarm setting command
    let alarmMatch = null;
    for (const pattern of alarmSetPatterns) {
        const match = command.match(pattern);
        if (match) {
            alarmMatch = match;
            break;
        }
    }
    
    // Check for alarm deletion command
    let deleteMatch = null;
    for (const pattern of alarmDeletePatterns) {
        const match = command.match(pattern);
        if (match) {
            deleteMatch = match;
            break;
        }
    }
    
    // Check if command is asking for date or time (existing code)
    const isDateQuery = datePatterns.some(pattern => pattern.test(command));
    const isTimeQuery = timePatterns.some(pattern => pattern.test(command));
    let timeZoneMatch = null;
    let requestedTimeZone = null;
    
    // Existing code for time zone matching
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
    
    if (alarmMatch) {
        // Handle alarm setting
        handleAlarmSetCommand(alarmMatch, command);
    } else if (deleteMatch) {
        // Handle alarm deletion
        handleAlarmDeleteCommand(deleteMatch, command);
    } else if (isDateQuery) {
        // Existing date query handling
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
        // Existing time query handling
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

// Function to handle alarm setting commands
function handleAlarmSetCommand(match, fullCommand) {
    // Determine if it's a recurring alarm
    const isRecurring = /recurring|repeating|daily|weekly|monthly|every/i.test(fullCommand);
    
    // Extract time information
    let timeInfo;
    if (match[0].includes('recurring') || match[0].includes('repeating') || 
        match[0].includes('daily') || match[0].includes('weekly') || match[0].includes('monthly')) {
        timeInfo = match[3]; // For patterns with recurring specification
    } else {
        timeInfo = match[match.length - 1]; // Last capturing group has the time info
    }
    
    // Parse the time information
    const parsedTime = parseTimeFromText(timeInfo, fullCommand);
    
    if (parsedTime.needsMoreInfo) {
        // Ask for clarification if time couldn't be fully determined
        const response = `I need more information about when to set the alarm. ${parsedTime.clarificationQuestion}`;
        showVoiceResponse(response);
        speak(response);
        
        // Set a context flag for the next command
        window.alarmContextPending = {
            isRecurring: isRecurring,
            partialInfo: parsedTime.partialInfo
        };
        return;
    }
    
    // Create and add the alarm
    const alarmTime = parsedTime.time;
    const recurring = isRecurring ? parsedTime.recurringPattern : null;
    
    // Call the function to add the alarm from voice command
    addAlarmFromVoice(alarmTime, recurring);
    
    // Confirm to the user
    let response;
    if (recurring) {
        response = `I've set a recurring alarm for ${formatTimeForSpeech(alarmTime)} ${recurring.description}.`;
    } else {
        response = `I've set an alarm for ${formatTimeForSpeech(alarmTime)}.`;
    }
    
    showVoiceResponse(response);
    speak(response);
}

// Function to handle alarm deletion commands
function handleAlarmDeleteCommand(match, fullCommand) {
    if (/all|my alarms/i.test(fullCommand)) {
        // Clear all alarms
        if (alarms.length === 0) {
            const response = "You don't have any alarms set.";
            showVoiceResponse(response);
            speak(response);
            return;
        }
        
        const count = alarms.length;
        alarms = [];
        saveAlarms();
        renderAlarms();
        
        const response = `I've deleted all ${count} alarms.`;
        showVoiceResponse(response);
        speak(response);
    } else if (match.length > 3) {
        // Delete specific alarm
        const timeInfo = match[match.length - 1];
        const parsedTime = parseTimeFromText(timeInfo, fullCommand);
        
        if (parsedTime.needsMoreInfo) {
            const response = `I need more information about which alarm to delete. ${parsedTime.clarificationQuestion}`;
            showVoiceResponse(response);
            speak(response);
            return;
        }
        
        // Convert to HH:MM format for comparison
        const targetTime = parsedTime.time.toTimeString().substring(0, 5);
        const initialCount = alarms.length;
        
        alarms = alarms.filter(alarm => alarm.time !== targetTime);
        
        if (initialCount === alarms.length) {
            const response = `I couldn't find an alarm set for ${formatTimeForSpeech(parsedTime.time)}.`;
            showVoiceResponse(response);
            speak(response);
        } else {
            saveAlarms();
            renderAlarms();
            const response = `I've deleted the alarm for ${formatTimeForSpeech(parsedTime.time)}.`;
            showVoiceResponse(response);
            speak(response);
        }
    }
}

// Parse time information from natural language text
function parseTimeFromText(timeText, fullCommand) {
    // Current date/time
    const now = new Date();
    const result = {
        time: null,
        needsMoreInfo: false,
        clarificationQuestion: "",
        partialInfo: {},
        recurringPattern: null
    };
    
    // Common time formats
    const timeFormats = [
        // 12-hour format with am/pm
        { regex: /(\d{1,2})(:|\.)?(\d{2})?\s*(am|pm)/i, process: matches => {
            const hours = parseInt(matches[1]);
            const minutes = matches[3] ? parseInt(matches[3]) : 0;
            const isPM = matches[4].toLowerCase() === 'pm';
            const adjustedHours = isPM ? (hours === 12 ? 12 : hours + 12) : (hours === 12 ? 0 : hours);
            return [adjustedHours, minutes];
        }},
        // Just hour with am/pm
        { regex: /(\d{1,2})\s*(am|pm)/i, process: matches => {
            const hours = parseInt(matches[1]);
            const isPM = matches[2].toLowerCase() === 'pm';
            const adjustedHours = isPM ? (hours === 12 ? 12 : hours + 12) : (hours === 12 ? 0 : hours);
            return [adjustedHours, 0];
        }},
        // 24-hour format
        { regex: /(\d{1,2}):(\d{2})/i, process: matches => {
            return [parseInt(matches[1]), parseInt(matches[2])];
        }},
        // Natural language times
        { regex: /noon/i, process: () => [12, 0] },
        { regex: /midnight/i, process: () => [0, 0] }
    ];
    
    // First, try to extract time
    let timeFound = false;
    let hours = 0;
    let minutes = 0;
    
    for (const format of timeFormats) {
        const matches = timeText.match(format.regex);
        if (matches) {
            [hours, minutes] = format.process(matches);
            timeFound = true;
            break;
        }
    }
    
    // If no time format was recognized
    if (!timeFound) {
        result.needsMoreInfo = true;
        result.clarificationQuestion = "Please specify the time for the alarm, like '8am' or '3:30pm'.";
        return result;
    }
    
    // Create a time object
    const alarmTime = new Date();
    alarmTime.setHours(hours);
    alarmTime.setMinutes(minutes);
    alarmTime.setSeconds(0);
    
    // Check if the time has already passed today
    if (alarmTime < now) {
        // If it's a "today" command but the time has passed, ask for clarification
        if (/today/i.test(timeText) || /tonight/i.test(timeText)) {
            result.needsMoreInfo = true;
            result.clarificationQuestion = `It's already past ${formatTimeForSpeech(alarmTime)}. Did you mean tomorrow?`;
            result.partialInfo = { hours, minutes };
            return result;
        }
        
        // Otherwise, assume tomorrow
        alarmTime.setDate(alarmTime.getDate() + 1);
    }
    
    // Check for day of week
    const daysOfWeek = [
        { regex: /sunday|sun/i, day: 0 },
        { regex: /monday|mon/i, day: 1 },
        { regex: /tuesday|tue/i, day: 2 },
        { regex: /wednesday|wed/i, day: 3 },
        { regex: /thursday|thu/i, day: 4 },
        { regex: /friday|fri/i, day: 5 },
        { regex: /saturday|sat/i, day: 6 }
    ];
    
    let daySpecified = false;
    for (const dayObj of daysOfWeek) {
        if (dayObj.regex.test(timeText)) {
            daySpecified = true;
            let targetDay = dayObj.day;
            const currentDay = now.getDay();
            
            // Calculate days to add
            let daysToAdd = targetDay - currentDay;
            if (daysToAdd <= 0) {
                daysToAdd += 7; // Next week
            }
            
            // If "next" is specified, add an additional week
            if (/next/i.test(timeText)) {
                daysToAdd += 7;
            }
            
            alarmTime.setDate(now.getDate() + daysToAdd);
            break;
        }
    }
    
    // Check for recurring patterns
    const recurringPatterns = [
        { regex: /every day|daily/i, type: 'daily', description: 'every day' },
        { regex: /every weekday/i, type: 'weekday', description: 'every weekday' },
        { regex: /every weekend/i, type: 'weekend', description: 'every weekend' },
        { regex: /every monday/i, type: 'weekly', day: 1, description: 'every Monday' },
        { regex: /every tuesday/i, type: 'weekly', day: 2, description: 'every Tuesday' },
        { regex: /every wednesday/i, type: 'weekly', day: 3, description: 'every Wednesday' },
        { regex: /every thursday/i, type: 'weekly', day: 4, description: 'every Thursday' },
        { regex: /every friday/i, type: 'weekly', day: 5, description: 'every Friday' },
        { regex: /every saturday/i, type: 'weekly', day: 6, description: 'every Saturday' },
        { regex: /every sunday/i, type: 'weekly', day: 0, description: 'every Sunday' }
    ];
    
    for (const pattern of recurringPatterns) {
        if (pattern.regex.test(fullCommand)) {
            result.recurringPattern = {
                type: pattern.type,
                day: pattern.day,
                description: pattern.description
            };
            break;
        }
    }
    
    // Set the time
    result.time = alarmTime;
    
    return result;
}

// Format time for speech
function formatTimeForSpeech(date) {
    let hours = date.getHours();
    const minutes = date.getMinutes();
    const ampm = hours >= 12 ? 'PM' : 'AM';
    
    hours = hours % 12;
    hours = hours ? hours : 12; // Convert 0 to 12
    
    let timeString = `${hours}`;
    if (minutes > 0) {
        timeString += `:${minutes.toString().padStart(2, '0')}`;
    }
    timeString += ` ${ampm}`;
    
    return timeString;
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