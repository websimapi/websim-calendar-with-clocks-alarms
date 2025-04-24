// Alarm functionality via voice

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
    
    // Extract date and recurrence information
    extractDateAndRecurrence(command, date, repeatType, weekdays);
    
    // Extract potential label only if explicitly mentioned
    extractAlarmLabel(command, label);
    
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

function extractDateAndRecurrence(command, date, repeatType, weekdays) {
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
        date = dayAfterTomorrow.toISOString().split('T')[0];
    } 
    // Check for "tomorrow"
    else if (tomorrowPattern.test(command)) {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        date = tomorrow.toISOString().split('T')[0];
    } 
    // Check for "today"
    else if (todayPattern.test(command)) {
        date = now.toISOString().split('T')[0];
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
        date = targetDate.toISOString().split('T')[0];
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
        date = specifiedDate.toISOString().split('T')[0];
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
            date = nextOccurrence.toISOString().split('T')[0];
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
}

function extractAlarmLabel(command, label) {
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

// Helper function to format a list of items in a natural language way
function formatList(items) {
    if (items.length === 0) return '';
    if (items.length === 1) return items[0];
    if (items.length === 2) return `${items[0]} and ${items[1]}`;
    
    const lastItem = items.pop();
    return `${items.join(', ')}, and ${lastItem}`;
}