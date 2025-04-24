// Alarm functionality
function openAlarmModal() {
    const modal = document.getElementById('alarmModal');
    modal.style.display = 'block';
    
    // Set default date to today
    const today = new Date();
    const dateInput = document.getElementById('alarmDate');
    dateInput.valueAsDate = today;
}

function closeAlarmModal() {
    const modal = document.getElementById('alarmModal');
    modal.style.display = 'none';
    resetAlarmForm();
}

function resetAlarmForm() {
    document.getElementById('alarmTime').value = '';
    document.getElementById('alarmLabel').value = '';
    document.getElementById('alarmDate').valueAsDate = new Date();
    document.querySelector('input[name="repeatType"][value="once"]').checked = true;
    document.querySelectorAll('input[name="weekday"]').forEach(checkbox => {
        checkbox.checked = false;
    });
    document.getElementById('weekdaySelector').classList.add('hidden');
    document.getElementById('dateSelector').classList.remove('hidden');
}

function handleRepeatTypeChange() {
    const repeatType = document.querySelector('input[name="repeatType"]:checked').value;
    const weekdaySelector = document.getElementById('weekdaySelector');
    const dateSelector = document.getElementById('dateSelector');
    
    if (repeatType === 'custom') {
        weekdaySelector.classList.remove('hidden');
        dateSelector.classList.add('hidden');
    } else if (repeatType === 'once') {
        weekdaySelector.classList.add('hidden');
        dateSelector.classList.remove('hidden');
    } else if (repeatType === 'weekly' || repeatType === 'biweekly') {
        // For weekly/bi-weekly, pre-check today's weekday
        weekdaySelector.classList.remove('hidden');
        dateSelector.classList.add('hidden');
        
        // Get current day of week and check that checkbox
        const today = new Date().getDay().toString();
        document.querySelectorAll('input[name="weekday"]').forEach(checkbox => {
            checkbox.checked = checkbox.value === today;
        });
    } else {
        // daily or monthly
        weekdaySelector.classList.add('hidden');
        dateSelector.classList.add('hidden');
    }
}

function saveAlarm() {
    const time = document.getElementById('alarmTime').value;
    const label = document.getElementById('alarmLabel').value;
    const repeatType = document.querySelector('input[name="repeatType"]:checked').value;
    
    if (!time) {
        alert('Please select a time for the alarm');
        return;
    }
    
    // Create the base alarm object
    const newAlarm = {
        id: Date.now().toString(),
        time: time,
        label: label || 'Alarm',
        type: repeatType,
        active: true
    };
    
    // Add date specific properties based on type
    if (repeatType === 'once') {
        const date = document.getElementById('alarmDate').value;
        if (!date) {
            alert('Please select a date for the one-time alarm');
            return;
        }
        newAlarm.date = date;
    } else if (repeatType === 'custom' || repeatType === 'weekly' || repeatType === 'biweekly') {
        const selectedDays = [];
        document.querySelectorAll('input[name="weekday"]:checked').forEach(checkbox => {
            selectedDays.push(parseInt(checkbox.value));
        });
        
        if (selectedDays.length === 0) {
            alert('Please select at least one day of the week');
            return;
        }
        
        newAlarm.weekdays = selectedDays;
        
        if (repeatType === 'biweekly') {
            // Store the reference week (current week number in year)
            const now = new Date();
            const start = new Date(now.getFullYear(), 0, 1);
            const diff = now - start;
            const oneWeek = 7 * 24 * 60 * 60 * 1000;
            const weekNumber = Math.floor(diff / oneWeek);
            newAlarm.referenceWeek = weekNumber % 2; // 0 or 1 to track alternating weeks
        }
    } else if (repeatType === 'monthly') {
        // Store the day of month for monthly recurrence
        const today = new Date();
        newAlarm.dayOfMonth = today.getDate();
    }
    
    // Add to alarms array
    alarms.push(newAlarm);
    
    // Save to localStorage
    saveAlarms();
    
    // Close modal and render alarms
    closeAlarmModal();
    renderAlarms();
}

function toggleAlarm(id) {
    const alarm = alarms.find(a => a.id === id);
    if (alarm) {
        alarm.active = !alarm.active;
        saveAlarms();
        renderAlarms();
    }
}

function deleteAlarm(id) {
    alarms = alarms.filter(alarm => alarm.id !== id);
    saveAlarms();
    renderAlarms();
}

function editAlarm(id) {
    const alarm = alarms.find(a => a.id === id);
    if (!alarm) return;
    
    openAlarmModal();
    
    // Populate form with alarm values
    document.getElementById('alarmTime').value = alarm.time;
    document.getElementById('alarmLabel').value = alarm.label || '';
    
    // Set repeat type
    document.querySelector(`input[name="repeatType"][value="${alarm.type}"]`).checked = true;
    
    // Handle specific alarm type data
    if (alarm.type === 'once' && alarm.date) {
        document.getElementById('alarmDate').value = alarm.date;
    } else if ((alarm.type === 'custom' || alarm.type === 'weekly' || alarm.type === 'biweekly') && alarm.weekdays) {
        document.querySelectorAll('input[name="weekday"]').forEach(checkbox => {
            checkbox.checked = alarm.weekdays.includes(parseInt(checkbox.value));
        });
    }
    
    // Show/hide appropriate sections
    handleRepeatTypeChange();
    
    // Remove the old alarm when saving
    document.getElementById('saveAlarm').onclick = function() {
        deleteAlarm(id);
        saveAlarm();
    };
}

function renderAlarms() {
    const alarmsList = document.getElementById('alarmsList');
    alarmsList.innerHTML = '';
    
    if (alarms.length === 0) {
        alarmsList.innerHTML = '<p>No alarms set</p>';
        return;
    }
    
    // Sort alarms by time
    alarms.sort((a, b) => {
        return a.time.localeCompare(b.time);
    });
    
    alarms.forEach(alarm => {
        const alarmItem = document.createElement('div');
        alarmItem.classList.add('alarm-item');
        
        // Format time for display (12 hour format)
        const [hours, minutes] = alarm.time.split(':');
        const hour = parseInt(hours);
        const ampm = hour >= 12 ? 'PM' : 'AM';
        const hour12 = hour % 12 || 12;
        const formattedTime = `${hour12}:${minutes} ${ampm}`;
        
        // Create description of alarm recurrence
        let recurrenceText = '';
        
        switch (alarm.type) {
            case 'once':
                if (alarm.date) {
                    const date = new Date(alarm.date);
                    recurrenceText = `Once on ${date.toLocaleDateString()}`;
                } else {
                    recurrenceText = 'One-time alarm';
                }
                break;
            case 'daily':
                recurrenceText = 'Every day';
                break;
            case 'weekly':
                if (alarm.weekdays && alarm.weekdays.length > 0) {
                    const days = getDaysText(alarm.weekdays);
                    recurrenceText = `Weekly on ${days}`;
                } else {
                    recurrenceText = 'Every week';
                }
                break;
            case 'biweekly':
                if (alarm.weekdays && alarm.weekdays.length > 0) {
                    const days = getDaysText(alarm.weekdays);
                    recurrenceText = `Every other week on ${days}`;
                } else {
                    recurrenceText = 'Every other week';
                }
                break;
            case 'monthly':
                const dayOfMonth = alarm.dayOfMonth || (new Date()).getDate();
                recurrenceText = `Monthly on day ${dayOfMonth}`;
                break;
            case 'custom':
                if (alarm.weekdays && alarm.weekdays.length > 0) {
                    const days = getDaysText(alarm.weekdays);
                    recurrenceText = `Every ${days}`;
                } else {
                    recurrenceText = 'Custom schedule';
                }
                break;
        }
        
        alarmItem.innerHTML = `
            <div class="alarm-item-details">
                <div class="alarm-time">${formattedTime}</div>
                <div class="alarm-days">${recurrenceText}</div>
                ${alarm.label ? `<div class="alarm-label">${alarm.label}</div>` : ''}
            </div>
            <div class="alarm-controls">
                <label class="alarm-toggle">
                    <input type="checkbox" ${alarm.active ? 'checked' : ''} data-id="${alarm.id}">
                    <span class="alarm-toggle-slider"></span>
                </label>
                <button class="edit-alarm" data-id="${alarm.id}">Edit</button>
                <button class="delete-alarm" data-id="${alarm.id}">Delete</button>
            </div>
        `;
        
        alarmsList.appendChild(alarmItem);
    });
    
    // Add event listeners for controls
    document.querySelectorAll('.delete-alarm').forEach(button => {
        button.addEventListener('click', (e) => {
            const id = e.target.getAttribute('data-id');
            deleteAlarm(id);
        });
    });
    
    document.querySelectorAll('.edit-alarm').forEach(button => {
        button.addEventListener('click', (e) => {
            const id = e.target.getAttribute('data-id');
            editAlarm(id);
        });
    });
    
    document.querySelectorAll('.alarm-toggle input').forEach(checkbox => {
        checkbox.addEventListener('change', (e) => {
            const id = e.target.getAttribute('data-id');
            toggleAlarm(id);
        });
    });
}

function getDaysText(weekdays) {
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const dayList = weekdays.map(day => dayNames[day]).join(', ');
    return dayList;
}

function checkAlarms() {
    const now = new Date();
    const currentHour = now.getHours().toString().padStart(2, '0');
    const currentMinute = now.getMinutes().toString().padStart(2, '0');
    const currentTimeString = `${currentHour}:${currentMinute}`;
    
    const currentDay = now.getDay(); // 0-6, Sunday-Saturday
    const currentDate = now.getDate(); // Day of month (1-31)
    const currentDateString = now.toISOString().split('T')[0]; // YYYY-MM-DD
    
    // Calculate current week number for bi-weekly alarms
    const start = new Date(now.getFullYear(), 0, 1);
    const diff = now - start;
    const oneWeek = 7 * 24 * 60 * 60 * 1000;
    const currentWeekNumber = Math.floor(diff / oneWeek) % 2;
    
    alarms.forEach(alarm => {
        if (!alarm.active || alarm.time !== currentTimeString || now.getSeconds() !== 0) {
            return; // Skip this alarm if not active, not matching time, or not at 0 seconds
        }
        
        // Check specific alarm types
        let shouldTrigger = false;
        
        switch (alarm.type) {
            case 'once':
                shouldTrigger = alarm.date === currentDateString;
                break;
            case 'daily':
                shouldTrigger = true; // Always trigger daily alarms
                break;
            case 'weekly':
                shouldTrigger = alarm.weekdays && alarm.weekdays.includes(currentDay);
                break;
            case 'biweekly':
                shouldTrigger = alarm.weekdays && 
                               alarm.weekdays.includes(currentDay) && 
                               (alarm.referenceWeek === currentWeekNumber);
                break;
            case 'monthly':
                shouldTrigger = alarm.dayOfMonth === currentDate;
                break;
            case 'custom':
                shouldTrigger = alarm.weekdays && alarm.weekdays.includes(currentDay);
                break;
        }
        
        if (shouldTrigger) {
            playAlarmSound();
            
            // Use label in alert if available
            const alarmMessage = alarm.label 
                ? `Alarm: ${alarm.label}` 
                : `Alarm! It's ${alarm.time}`;
                
            alert(alarmMessage);
            
            // For one-time alarms, deactivate after triggering
            if (alarm.type === 'once') {
                alarm.active = false;
                saveAlarms();
                renderAlarms();
            }
        }
    });
}

function initAlarms() {
    // Create alarm button opens modal
    document.getElementById('createAlarm').addEventListener('click', openAlarmModal);
    
    // Close modal when clicking X or Cancel
    document.querySelector('.close-modal').addEventListener('click', closeAlarmModal);
    document.getElementById('cancelAlarm').addEventListener('click', closeAlarmModal);
    
    // Handle repeat type changes to show/hide day selectors
    document.querySelectorAll('input[name="repeatType"]').forEach(radio => {
        radio.addEventListener('change', handleRepeatTypeChange);
    });
    
    // Save alarm when clicking save
    document.getElementById('saveAlarm').addEventListener('click', saveAlarm);
    
    // Close modal when clicking outside
    window.addEventListener('click', (e) => {
        const modal = document.getElementById('alarmModal');
        if (e.target === modal) {
            closeAlarmModal();
        }
    });
    
    renderAlarms();
    
    // Listen for clock ticks to check alarms
    EventEmitter.on('checkAlarms', checkAlarms);
}