// Alarm functionality
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
        active: true,
        recurring: null // Add recurring field for recurring alarms
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

// Function to add alarm from voice command
function addAlarmFromVoice(dateTime, recurringPattern = null) {
    // Format time as HH:MM for storage
    const hours = dateTime.getHours().toString().padStart(2, '0');
    const minutes = dateTime.getMinutes().toString().padStart(2, '0');
    const timeString = `${hours}:${minutes}`;
    
    // Create new alarm object
    const newAlarm = {
        id: Date.now().toString(),
        time: timeString,
        active: true,
        recurring: recurringPattern,
        nextTrigger: dateTime.toISOString() // Store next trigger time for one-time and recurring alarms
    };
    
    // Add to alarms array
    alarms.push(newAlarm);
    
    // Save to localStorage
    saveAlarms();
    
    // Render alarms
    renderAlarms();
    
    return newAlarm;
}

function deleteAlarm(id) {
    alarms = alarms.filter(alarm => alarm.id !== id);
    saveAlarms();
    renderAlarms();
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
        
        // Add recurring label if applicable
        let recurringLabel = '';
        if (alarm.recurring) {
            recurringLabel = ` <span class="recurring-label">(${alarm.recurring.description})</span>`;
        }
        
        alarmItem.innerHTML = `
            <span>${formattedTime}${recurringLabel}</span>
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
    const currentDayOfWeek = now.getDay();
    
    alarms.forEach(alarm => {
        if (!alarm.active) return;
        
        let shouldTrigger = false;
        
        // Check if it's a recurring alarm
        if (alarm.recurring) {
            if (alarm.time === currentTimeString && now.getSeconds() === 0) {
                // Check recurring pattern
                switch (alarm.recurring.type) {
                    case 'daily':
                        shouldTrigger = true;
                        break;
                    case 'weekday':
                        shouldTrigger = (currentDayOfWeek >= 1 && currentDayOfWeek <= 5); // Monday to Friday
                        break;
                    case 'weekend':
                        shouldTrigger = (currentDayOfWeek === 0 || currentDayOfWeek === 6); // Sunday or Saturday
                        break;
                    case 'weekly':
                        shouldTrigger = (currentDayOfWeek === alarm.recurring.day);
                        break;
                }
            }
        } 
        // Check one-time alarms
        else if (alarm.time === currentTimeString && now.getSeconds() === 0) {
            // For non-recurring alarms, check if there's a nextTrigger date and if it's today
            if (alarm.nextTrigger) {
                const triggerDate = new Date(alarm.nextTrigger);
                if (isSameDay(triggerDate, now)) {
                    shouldTrigger = true;
                    // Delete the one-time alarm after triggering
                    setTimeout(() => deleteAlarm(alarm.id), 1000);
                }
            } else {
                // Legacy support for alarms without nextTrigger
                shouldTrigger = true;
            }
        }
        
        if (shouldTrigger) {
            playAlarmSound();
            
            // Format time for alert
            const [hours, minutes] = alarm.time.split(':');
            const hour = parseInt(hours);
            const ampm = hour >= 12 ? 'PM' : 'AM';
            const hour12 = hour % 12 || 12;
            const formattedTime = `${hour12}:${minutes} ${ampm}`;
            
            const message = alarm.recurring 
                ? `Alarm! It's ${formattedTime} (${alarm.recurring.description})`
                : `Alarm! It's ${formattedTime}`;
                
            alert(message);
            
            // If voice mode is active, also announce the alarm
            if (voiceModeActive) {
                speak(message);
            }
        }
    });
}

// Helper function to check if two dates are the same day
function isSameDay(date1, date2) {
    return date1.getFullYear() === date2.getFullYear() &&
           date1.getMonth() === date2.getMonth() &&
           date1.getDate() === date2.getDate();
}

function initAlarms() {
    document.getElementById('setAlarm').addEventListener('click', addAlarm);
    renderAlarms();
    
    // Listen for clock ticks to check alarms
    EventEmitter.on('checkAlarms', checkAlarms);
}