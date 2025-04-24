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
    
    // Alarm creation patterns
    const createAlarmPatterns = [
        /set (an|a|) alarm/i,
        /create (an|a|) alarm/i,
        /add (an|a|) alarm/i,
        /wake me up/i,
        /remind me/i,
        /set (a|) reminder/i,
        /new alarm/i
    ];
    
    // Check if command is asking for date
    const isDateQuery = datePatterns.some(pattern => pattern.test(command));
    
    // Check if command is asking for time
    const isTimeQuery = timePatterns.some(pattern => pattern.test(command));
    
    // Check if command is asking to create an alarm
    const isAlarmCreation = createAlarmPatterns.some(pattern => pattern.test(command));
    
    // Check if command is asking for time in a specific timezone
    let timeZoneMatch = null;
    let requestedTimeZone = null;
    
    const timeZonePatterns = [
        /time in ([a-z\s]+)/i,
        /what('s| is) the time in ([a-z\s]+)/i,
        /what time is it in ([a-z\s]+)/i
    ];
    
    for (const pattern of timeZonePatterns) {
        const match = command.match(pattern);
        if (match && match.length > 1) {
            timeZoneMatch = match;
            const zoneName = match[match.length - 1].toLowerCase().trim();
            
            // Find the time zone in our mapping
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
            
            for (const [key, value] of Object.entries(timeZones)) {
                if (zoneName.includes(key)) {
                    requestedTimeZone = value;
                    break;
                }
            }
            break;
        }
    }
    
    // Check for date, time, or alarm creation
    if (isAlarmCreation) {
        createAlarmFromVoice(command);
    } else if (isDateQuery) {
        const now = new Date();
        let response = "";
        let formattedDate = "";
        
        // Check for specific format requests
        const formatPatterns = {
            // Date formats
            shortFormat: /(short|brief|simple) format/i,
            longFormat: /(long|full|complete) format/i,
            numericalFormat: /(numerical|number) format/i,
            dayOfWeek: /(day of the week|weekday)/i,
            monthYear: /(month and year|month year)/i,
        };
        
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
                    second: /(with seconds)/i.test(command) ? 'numeric' : undefined,
                    hour12: !/(military|24[-\s]hour)/i.test(command) && !/(twenty[-\s]four[-\s]hour)/i.test(command)
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
            
            if (/(with seconds)/i.test(command)) {
                options.second = 'numeric';
            }
            
            if (/(military|24[-\s]hour)/i.test(command) || /(twenty[-\s]four[-\s]hour)/i.test(command)) {
                options.hour12 = false;
                let formattedTime = now.toLocaleTimeString('en-US', options);
                response = `The current time in 24-hour format is ${formattedTime}.`;
            } else if (/(twelve[-\s]hour)/i.test(command)) {
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
    } else {
        // Unknown command
        showVoiceResponse("I'm not sure how to help with that. You can ask about the date, time, or set an alarm.");
        speak("I'm not sure how to help with that. You can ask about the date, time, or set an alarm.");
    }
}

// Alarm creation from voice
function createAlarmFromVoice(command) {
    // Parameters to extract from voice command
    let time = null;
    let date = null;
    let repeatType = "once";
    let label = "";
    let weekdays = [];
    
    // Advanced time extraction patterns
    // Look for specific time patterns like "at 1pm", "at 1:30", etc.
    const timeAtPattern = /(at|@)\s+(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/i;
    const timeAtMatch = command.match(timeAtPattern);
    
    // Regular time pattern (without "at")
    const timeRegex = /(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/i;
    
    if (timeAtMatch) {
        let hours = parseInt(timeAtMatch[2]);
        const minutes = timeAtMatch[3] ? parseInt(timeAtMatch[3]) : 0;
        const period = timeAtMatch[4] ? timeAtMatch[4].toLowerCase() : null;
        
        // Handle AM/PM logic
        if (period === 'pm' && hours < 12) {
            hours += 12;
        } else if (period === 'am' && hours === 12) {
            hours = 0;
        }
        
        // If no AM/PM specified and reasonable hour
        if (!period) {
            // For afternoon hours without AM/PM, assume PM
            if (hours < 12 && hours >= 7) {
                // Don't adjust - could be AM or PM
            } else if (hours < 7) {
                // Early morning hours without AM/PM likely mean PM
                hours += 12;
            }
        }
        
        time = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
    } else {
        // Try the regular pattern if "at X" wasn't found
        const timeMatch = command.match(timeRegex);
        
        if (timeMatch) {
            let hours = parseInt(timeMatch[1]);
            const minutes = timeMatch[2] ? parseInt(timeMatch[2]) : 0;
            const period = timeMatch[3] ? timeMatch[3].toLowerCase() : null;
            
            // Same AM/PM handling
            if (period === 'pm' && hours < 12) {
                hours += 12;
            } else if (period === 'am' && hours === 12) {
                hours = 0;
            }
            
            if (!period) {
                if (hours < 12 && hours >= 7) {
                    // Don't adjust
                } else if (hours < 7) {
                    hours += 12;
                }
            }
            
            time = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
        }
    }
    
    // Enhanced date extraction
    // Look for specific date references
    const todayPattern = /\b(today)\b/i;
    const tomorrowPattern = /\b(tomorrow)\b/i;
    const dayAfterTomorrowPattern = /\b(day after tomorrow)\b/i;
    const nextDayPattern = /\b(next|this)\s+(monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/i;
    const specificDatePattern = /\b(january|february|march|april|may|june|july|august|september|october|november|december)\s+(\d{1,2})(?:st|nd|rd|th)?(?:\s*,?\s*(\d{4}))?\b/i;
    
    const now = new Date();
    
    // Check for "day after tomorrow"
    if (dayAfterTomorrowPattern.test(command)) {
        const dayAfterTomorrow = new Date();
        dayAfterTomorrow.setDate(dayAfterTomorrow.getDate() + 2);
        // Format date as YYYY-MM-DD in local timezone instead of using toISOString() which uses UTC
        const year = dayAfterTomorrow.getFullYear();
        const month = (dayAfterTomorrow.getMonth() + 1).toString().padStart(2, '0');
        const day = dayAfterTomorrow.getDate().toString().padStart(2, '0');
        date = `${year}-${month}-${day}`;
    } 
    // Check for "tomorrow"
    else if (tomorrowPattern.test(command)) {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        // Format date as YYYY-MM-DD in local timezone
        const year = tomorrow.getFullYear();
        const month = (tomorrow.getMonth() + 1).toString().padStart(2, '0');
        const day = tomorrow.getDate().toString().padStart(2, '0');
        date = `${year}-${month}-${day}`;
    } 
    // Check for "today"
    else if (todayPattern.test(command)) {
        // Format date as YYYY-MM-DD in local timezone
        const year = now.getFullYear();
        const month = (now.getMonth() + 1).toString().padStart(2, '0');
        const day = now.getDate().toString().padStart(2, '0');
        date = `${year}-${month}-${day}`;
    } 
    // Check for "next Monday", "this Tuesday", etc.
    else if (nextDayMatch = command.match(nextDayPattern)) {
        const dayName = nextDayMatch[2].toLowerCase();
        const daysMap = {
            'sunday': 0, 'monday': 1, 'tuesday': 2, 'wednesday': 3,
            'thursday': 4, 'friday': 5, 'saturday': 6
        };
        
        const targetDay = daysMap[dayName];
        const currentDay = now.getDay();
        let daysUntilTarget;
        
        // If "next" was specified, always go to next week's instance
        if (nextDayMatch[1].toLowerCase() === 'next') {
            daysUntilTarget = 7 + ((targetDay - currentDay + 7) % 7);
        } else {
            // For "this", if it's today or already passed this week, move to next week
            daysUntilTarget = (targetDay - currentDay + 7) % 7;
            if (daysUntilTarget === 0) daysUntilTarget = 7; // If same day, go to next week
        }
        
        const targetDate = new Date();
        targetDate.setDate(now.getDate() + daysUntilTarget);
        
        // Format date as YYYY-MM-DD in local timezone
        const year = targetDate.getFullYear();
        const month = (targetDate.getMonth() + 1).toString().padStart(2, '0');
        const day = targetDate.getDate().toString().padStart(2, '0');
        date = `${year}-${month}-${day}`;
    }
    // Check for specific date like "January 15" or "December 25, 2023"
    else if (specificDateMatch = command.match(specificDatePattern)) {
        const monthName = specificDateMatch[1].toLowerCase();
        const day = parseInt(specificDateMatch[2]);
        let year = specificDateMatch[3] ? parseInt(specificDateMatch[3]) : now.getFullYear();
        
        const monthsMap = {
            'january': 0, 'february': 1, 'march': 2, 'april': 3, 'may': 4, 'june': 5,
            'july': 6, 'august': 7, 'september': 8, 'october': 9, 'november': 10, 'december': 11
        };
        
        const month = monthsMap[monthName];
        
        // If month is earlier in the year and no year specified, assume next year
        if (!specificDateMatch[3] && month < now.getMonth() || 
            (month === now.getMonth() && day < now.getDate())) {
            year = now.getFullYear() + 1;
        }
        
        const specifiedDate = new Date(year, month, day);
        
        // Format date as YYYY-MM-DD in local timezone
        const specYear = specifiedDate.getFullYear();
        const specMonth = (specifiedDate.getMonth() + 1).toString().padStart(2, '0');
        const specDay = specifiedDate.getDate().toString().padStart(2, '0');
        date = `${specYear}-${specMonth}-${specDay}`;
    }
    
    // Check for day of week mentions (for recurring alarms)
    const weekdayRegex = /\b(monday|tuesday|wednesday|thursday|friday|saturday|sunday)s?\b/ig;
    const daysMap = {
        'sunday': 0, 'monday': 1, 'tuesday': 2, 'wednesday': 3,
        'thursday': 4, 'friday': 5, 'saturday': 6
    };
    
    const dayMatches = [...command.matchAll(weekdayRegex)];
    if (dayMatches.length > 0) {
        // If days are mentioned, likely a weekly alarm
        weekdays = dayMatches.map(match => daysMap[match[0].toLowerCase()]);
        
        if (weekdays.length === 1 && !date) {
            // Set date to the next occurrence of this weekday
            const targetDay = weekdays[0];
            const daysUntilTarget = (targetDay + 7 - now.getDay()) % 7;
            const nextOccurrence = new Date();
            nextOccurrence.setDate(now.getDate() + (daysUntilTarget === 0 ? 7 : daysUntilTarget));
            date = `${nextOccurrence.getFullYear()}-${(nextOccurrence.getMonth() + 1).toString().padStart(2, '0')}-${nextOccurrence.getDate().toString().padStart(2, '0')}`;
        }
    }
    
    // Check for recurring patterns
    const dailyRegex = /\b(daily|every day|each day)\b/i;
    const weeklyRegex = /\b(weekly|every week|each week)\b/i;
    const biweeklyRegex = /\b(bi weekly|biweekly|every other week|every two weeks|every 2 weeks)\b/i;
    const monthlyRegex = /\b(monthly|every month|each month)\b/i;
    const workdaysRegex = /\b(weekdays|work days|working days|on weekdays)\b/i;
    const weekendsRegex = /\b(weekends|on weekends|weekend days)\b/i;
    
    // Determine repeat type
    if (dailyRegex.test(command)) {
        repeatType = "daily";
    } else if (biweeklyRegex.test(command)) {
        repeatType = "biweekly";
    } else if (weeklyRegex.test(command)) {
        repeatType = "weekly";
    } else if (monthlyRegex.test(command)) {
        repeatType = "monthly";
    } else if (workdaysRegex.test(command)) {
        repeatType = "custom";
        weekdays = [1, 2, 3, 4, 5]; // Monday to Friday
    } else if (weekendsRegex.test(command)) {
        repeatType = "custom";
        weekdays = [0, 6]; // Sunday and Saturday
    } else if (weekdays.length > 0) {
        repeatType = "custom";
    }
    
    // Extract potential label only if explicitly mentioned
    const forRegex = /\b(?:for|about)\s+(.+?)(?:\s+at|\s+tomorrow|\s+today|\s+on|\s+every|\s+daily|\s+weekly|\s+monthly|$)/i;
    const labelledRegex = /\b(?:labelled|labeled)\s+(?:as\s+)?["']?(.+?)["']?(?:\s+at|\s+tomorrow|\s+today|\s+on|\s+every|\s+daily|\s+weekly|\s+monthly|$)/i;
    const calledRegex = /\b(?:called)\s+(?:as\s+)?["']?(.+?)["']?(?:\s+at|\s+tomorrow|\s+today|\s+on|\s+every|\s+daily|\s+weekly|\s+monthly|$)/i;
    const namedRegex = /\b(?:named)\s+(?:as\s+)?["']?(.+?)["']?(?:\s+at|\s+tomorrow|\s+today|\s+on|\s+every|\s+daily|\s+weekly|\s+monthly|$)/i;
    
    let labelMatch = command.match(labelledRegex) || 
                      command.match(calledRegex) ||
                      command.match(namedRegex);
                      
    if (labelMatch && labelMatch[1]) {
        label = labelMatch[1].trim();
    }
    
    // Now we need to handle different scenarios based on what information we extracted
    
    // If we couldn't extract a time, ask the user for it
    if (!time) {
        showVoiceResponse("What time would you like to set the alarm for?");
        speak("What time would you like to set the alarm for?");
        
        // Set up a listener for the time answer
        listenForSpecificAnswer('time', (response) => {
            // Extract time from the response
            const timeMatch = response.match(timeRegex);
            if (timeMatch) {
                let hours = parseInt(timeMatch[1]);
                const minutes = timeMatch[2] ? parseInt(timeMatch[2]) : 0;
                const period = timeMatch[3] ? timeMatch[3].toLowerCase() : null;
                
                if (period === 'pm' && hours < 12) {
                    hours += 12;
                } else if (period === 'am' && hours === 12) {
                    hours = 0;
                }
                
                // If no AM/PM, make a reasonable guess
                if (!period && hours < 12 && hours >= 7) {
                    // Could be AM or PM, assume AM
                } else if (!period && hours < 7) {
                    // Early morning hours - likely PM
                    hours += 12;
                }
                
                const extractedTime = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
                
                // Now ask for a label if none was provided
                askForAlarmLabel(extractedTime, date, repeatType, weekdays, label);
            } else {
                showVoiceResponse("I couldn't understand the time. Please try setting the alarm again.");
                speak("I couldn't understand the time. Please try setting the alarm again.");
            }
        });
        return;
    }
    
    // If we have the time but no explicit label, ask for it
    askForAlarmLabel(time, date, repeatType, weekdays, label);
}

// Ask user for an alarm label if not provided
function askForAlarmLabel(time, date, repeatType, weekdays, label) {
    if (!label) {
        showVoiceResponse("What would you like to name this alarm?");
        speak("What would you like to name this alarm?");
        
        listenForSpecificAnswer('label', (response) => {
            // If user says something like "no label" or "don't need one"
            if (response.match(/\b(no label|don'?t need one|no name|skip|none|no thanks|not needed)\b/i)) {
                label = ""; // Empty label
                confirmAlarmDetails(time, date, repeatType, weekdays, label);
            } else {
                label = response.trim();
                confirmAlarmDetails(time, date, repeatType, weekdays, label);
            }
        });
    } else {
        confirmAlarmDetails(time, date, repeatType, weekdays, label);
    }
}

// Ask user to confirm alarm details before creation
function confirmAlarmDetails(time, date, repeatType, weekdays, label) {
    // Format the details for confirmation
    const timeObj = time.split(':');
    const hour = parseInt(timeObj[0]);
    const minute = timeObj[1];
    const period = hour >= 12 ? "PM" : "AM";
    const hour12 = (hour % 12) || 12;
    const friendlyTime = `${hour12}:${minute} ${period}`;
    
    let confirmationMessage = `I'll set an alarm for ${friendlyTime}`;
    
    // Add repeat information
    if (repeatType === "once" && date) {
        const dateObj = new Date(date);
        const options = { weekday: 'long', month: 'long', day: 'numeric' };
        confirmationMessage += ` on ${dateObj.toLocaleDateString('en-US', options)}`;
    } else if (repeatType === "daily") {
        confirmationMessage += ` daily`;
    } else if (repeatType === "weekly") {
        confirmationMessage += ` every week`;
        if (weekdays.length > 0) {
            const dayNames = weekdays.map(day => {
                const d = new Date(2023, 0, day + 1); // Jan 1, 2023 is a Sunday
                return d.toLocaleDateString('en-US', { weekday: 'long' });
            });
            confirmationMessage += ` on ${formatList(dayNames)}`;
        }
    } else if (repeatType === "biweekly") {
        confirmationMessage += ` every other week`;
        if (weekdays.length > 0) {
            const dayNames = weekdays.map(day => {
                const d = new Date(2023, 0, day + 1);
                return d.toLocaleDateString('en-US', { weekday: 'long' });
            });
            confirmationMessage += ` on ${formatList(dayNames)}`;
        }
    } else if (repeatType === "monthly") {
        confirmationMessage += ` every month`;
    } else if (repeatType === "custom" && weekdays.length > 0) {
        const dayNames = weekdays.map(day => {
            const d = new Date(2023, 0, day + 1);
            return d.toLocaleDateString('en-US', { weekday: 'long' });
        });
        confirmationMessage += ` every ${formatList(dayNames)}`;
    }
    
    if (label) {
        confirmationMessage += ` labeled "${label}"`;
    }
    
    confirmationMessage += ". Would you like me to create this alarm?";
    
    // Ask for confirmation
    showVoiceResponse(confirmationMessage);
    speak(confirmationMessage);
    
    listenForSpecificAnswer('confirmation', (response) => {
        const affirmativePattern = /\b(yes|yeah|yep|sure|okay|ok|confirm|please|go ahead|create it|set it|that's right|that is right|correct|sounds good)\b/i;
        const negativePattern = /\b(no|nope|don't|do not|cancel|stop|nevermind|incorrect|wrong|not right)\b/i;
        
        if (affirmativePattern.test(response)) {
            // Create the alarm
            createConfirmedAlarm(time, date, repeatType, weekdays, label);
        } else if (negativePattern.test(response)) {
            // Cancel alarm creation
            showVoiceResponse("Alarm creation cancelled.");
            speak("Alarm creation cancelled.");
        } else {
            // Unclear response, ask again
            showVoiceResponse("I didn't understand. Would you like me to create this alarm? Please say yes or no.");
            speak("I didn't understand. Would you like me to create this alarm? Please say yes or no.");
            
            listenForSpecificAnswer('confirmation', (secondResponse) => {
                if (affirmativePattern.test(secondResponse)) {
                    createConfirmedAlarm(time, date, repeatType, weekdays, label);
                } else {
                    showVoiceResponse("Alarm creation cancelled.");
                    speak("Alarm creation cancelled.");
                }
            });
        }
    });
}

// Create the alarm after confirmation
function createConfirmedAlarm(time, date, repeatType, weekdays, label) {
    // Create the alarm object
    const newAlarm = {
        id: Date.now().toString(),
        time: time,
        label: label || 'Alarm',
        type: repeatType,
        active: true
    };
    
    // Add type-specific properties
    if (repeatType === "once") {
        newAlarm.date = date || new Date().toISOString().split('T')[0]; // Default to today
    } else if (repeatType === "custom" || repeatType === "weekly" || repeatType === "biweekly") {
        newAlarm.weekdays = weekdays;
        
        if (repeatType === "biweekly") {
            // Store reference week
            const now = new Date();
            const start = new Date(now.getFullYear(), 0, 1);
            const diff = now - start;
            const oneWeek = 7 * 24 * 60 * 60 * 1000;
            const weekNumber = Math.floor(diff / oneWeek);
            newAlarm.referenceWeek = weekNumber % 2;
        }
    } else if (repeatType === "monthly") {
        // Store day of month
        newAlarm.dayOfMonth = new Date().getDate();
    }
    
    // Add to alarms array
    alarms.push(newAlarm);
    saveAlarms();
    renderAlarms();
    
    // Inform the user
    showVoiceResponse("Alarm created successfully.");
    speak("Alarm created successfully.");
}

// Listen for specific answer types (time, label, confirmation)
function listenForSpecificAnswer(type, callback) {
    // Set flag that we're expecting a specific answer
    window.expectingVoiceResponse = type;
    
    // Save original handler
    const originalOnResult = recognition.onresult;
    
    // Set up a one-time listener for the next speech result
    recognition.onresult = function(event) {
        const transcript = Array.from(event.results)
            .map(result => result[0].transcript)
            .join('');
        
        console.log(`${type} response:`, transcript);
        
        // Reset the onresult handler
        recognition.onresult = originalOnResult;
        window.expectingVoiceResponse = false;
        
        // Pass the transcript to the callback
        callback(transcript);
    };
}

// This function is now deprecated - replaced by listenForSpecificAnswer
function listenForAlarmTime(callback) {
    listenForSpecificAnswer('time', callback);
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

// Helper function to format a list of items in a natural language way
function formatList(items) {
    if (items.length === 0) return '';
    if (items.length === 1) return items[0];
    if (items.length === 2) return `${items[0]} and ${items[1]}`;
    
    const lastItem = items.pop();
    return `${items.join(', ')}, and ${lastItem}`;
}