// Voice command processing

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
        handleDateQuery(command);
    } else if (isTimeQuery || timeZoneMatch) {
        handleTimeQuery(command, requestedTimeZone, timeZoneMatch);
    } else {
        // Unknown command
        showVoiceResponse("I'm not sure how to help with that. You can ask about the date, time, or set an alarm.");
        speak("I'm not sure how to help with that. You can ask about the date, time, or set an alarm.");
    }
}

function handleDateQuery(command) {
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
}

function handleTimeQuery(command, requestedTimeZone, timeZoneMatch) {
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
}