// Alarm functionality
const SNOOZE_TIME = 5; // Snooze for 5 minutes

// Track current ringing alarm
let ringingAlarmId = null;
let alarmTimeout = null;
let currentAlarmSound = null;

// Initialize alarm module
function initAlarms() {
    // Set up event listeners
    document.getElementById('alarmButton').addEventListener('click', openAlarmModal);
    document.getElementById('closeAlarmModal').addEventListener('click', closeAlarmModal);
    document.getElementById('setAlarm').addEventListener('click', addAlarm);
    
    // Set up custom days toggle
    const repeatOptions = document.querySelectorAll('input[name="repeat"]');
    repeatOptions.forEach(option => {
        option.addEventListener('change', function() {
            const customDays = document.getElementById('customDays');
            if (this.value === 'custom') {
                customDays.classList.add('active');
            } else {
                customDays.classList.remove('active');
            }
        });
    });
    
    // Set up alarm overlay controls
    document.getElementById('snoozeAlarm').addEventListener('click', snoozeAlarm);
    document.getElementById('dismissAlarm').addEventListener('click', dismissAlarm);
    
    // Render existing alarms and update count
    renderAlarms();
    updateAlarmCount();
    
    // Listen for clock ticks to check alarms
    EventEmitter.on('checkAlarms', checkAlarms);
}

function openAlarmModal() {
    document.getElementById('alarmModal').classList.add('active');
}

function closeAlarmModal() {
    document.getElementById('alarmModal').classList.remove('active');
}

function addAlarm() {
    const titleInput = document.getElementById('alarmTitle');
    const timeInput = document.getElementById('alarmTime');
    const soundInput = document.getElementById('alarmSound');
    const durationInput = document.getElementById('alarmDuration');
    const repeatOptions = document.querySelector('input[name="repeat"]:checked');
    
    const title = titleInput.value.trim() || 'Alarm';
    const time = timeInput.value;
    const sound = soundInput.value;
    const duration = parseInt(durationInput.value) || 30;
    const repeatType = repeatOptions.value;
    
    if (!time) {
        alert('Please select a time for the alarm');
        return;
    }
    
    // Get selected days for custom repeat
    let repeatDays = [];
    if (repeatType === 'custom') {
        const selectedDays = document.querySelectorAll('#customDays input[type="checkbox"]:checked');
        if (selectedDays.length === 0) {
            alert('Please select at least one day of the week');
            return;
        }
        selectedDays.forEach(day => {
            repeatDays.push(parseInt(day.value));
        });
    }
    
    // Create new alarm object
    const newAlarm = {
        id: Date.now().toString(),
        title: title,
        time: time,
        sound: sound,
        duration: duration,
        repeatType: repeatType,
        repeatDays: repeatDays,
        active: true
    };
    
    // Add to alarms array
    alarms.push(newAlarm);
    
    // Save to localStorage
    saveAlarms();
    
    // Render alarms and update count
    renderAlarms();
    updateAlarmCount();
    
    // Clear form
    titleInput.value = '';
    timeInput.value = '';
    soundInput.value = 'beep';
    durationInput.value = '30';
    document.querySelector('input[value="once"]').checked = true;
    document.getElementById('customDays').classList.remove('active');
    document.querySelectorAll('#customDays input[type="checkbox"]').forEach(cb => {
        cb.checked = false;
    });
    
    // Close modal
    closeAlarmModal();
}

function updateAlarmCount() {
    const activeAlarms = alarms.filter(alarm => alarm.active).length;
    const countElement = document.getElementById('alarmCount');
    
    if (activeAlarms > 0) {
        countElement.textContent = activeAlarms;
        countElement.style.display = 'flex';
    } else {
        countElement.style.display = 'none';
    }
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
        
        // Format repeat type for display
        let repeatText = '';
        if (alarm.repeatType === 'once') {
            repeatText = 'Once';
        } else if (alarm.repeatType === 'daily') {
            repeatText = 'Daily';
        } else if (alarm.repeatType === 'custom') {
            const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
            repeatText = alarm.repeatDays.map(day => dayNames[day]).join(', ');
        }
        
        alarmItem.innerHTML = `
            <div class="alarm-info">
                <div class="alarm-time">${formattedTime}</div>
                <div class="alarm-title">${alarm.title}</div>
                <div class="alarm-details">${repeatText} • ${alarm.sound} • ${alarm.duration}s</div>
            </div>
            <div class="alarm-controls">
                <button class="alarm-toggle" data-id="${alarm.id}">
                    ${alarm.active ? '🔔' : '🔕'}
                </button>
                <button class="delete-alarm" data-id="${alarm.id}">Delete</button>
            </div>
        `;
        
        alarmsList.appendChild(alarmItem);
    });
    
    // Add event listeners
    document.querySelectorAll('.delete-alarm').forEach(button => {
        button.addEventListener('click', (e) => {
            const id = e.target.getAttribute('data-id');
            deleteAlarm(id);
        });
    });
    
    document.querySelectorAll('.alarm-toggle').forEach(button => {
        button.addEventListener('click', (e) => {
            const id = e.target.getAttribute('data-id');
            toggleAlarm(id);
        });
    });
}

function deleteAlarm(id) {
    alarms = alarms.filter(alarm => alarm.id !== id);
    saveAlarms();
    renderAlarms();
    updateAlarmCount();
}

function toggleAlarm(id) {
    const alarm = alarms.find(a => a.id === id);
    if (alarm) {
        alarm.active = !alarm.active;
        saveAlarms();
        renderAlarms();
        updateAlarmCount();
    }
}

function checkAlarms() {
    // Don't check if alarm is already ringing
    if (ringingAlarmId) return;
    
    const now = new Date();
    const currentHour = now.getHours().toString().padStart(2, '0');
    const currentMinute = now.getMinutes().toString().padStart(2, '0');
    const currentTimeString = `${currentHour}:${currentMinute}`;
    const currentDay = now.getDay(); // 0-6, starting with Sunday
    
    alarms.forEach(alarm => {
        if (!alarm.active || alarm.time !== currentTimeString || now.getSeconds() !== 0) {
            return;
        }
        
        // Check repeat conditions
        if (alarm.repeatType === 'once') {
            triggerAlarm(alarm);
            // Deactivate one-time alarms after they trigger
            alarm.active = false;
            saveAlarms();
        } else if (alarm.repeatType === 'daily') {
            triggerAlarm(alarm);
        } else if (alarm.repeatType === 'custom' && alarm.repeatDays.includes(currentDay)) {
            triggerAlarm(alarm);
        }
    });
}

function triggerAlarm(alarm) {
    // Set current ringing alarm
    ringingAlarmId = alarm.id;
    
    // Show alarm overlay
    const overlay = document.getElementById('alarmOverlay');
    const alarmTitle = document.getElementById('alarmAlertTitle');
    const alarmTime = document.getElementById('alarmAlertTime');
    
    // Format time
    const [hours, minutes] = alarm.time.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const hour12 = hour % 12 || 12;
    const formattedTime = `${hour12}:${minutes} ${ampm}`;
    
    alarmTitle.textContent = alarm.title;
    alarmTime.textContent = formattedTime;
    overlay.classList.add('active');
    
    // Play sound
    currentAlarmSound = playAlarmSound(alarm.sound, alarm.duration);
    
    // Auto-dismiss after duration if not interacted with
    alarmTimeout = setTimeout(() => {
        dismissAlarm();
    }, alarm.duration * 1000);
}

function snoozeAlarm() {
    if (!ringingAlarmId) return;
    
    // Find the alarm that's ringing
    const alarm = alarms.find(a => a.id === ringingAlarmId);
    if (!alarm) return;
    
    // Stop current sound
    stopCurrentAlarmSound();
    
    // Create a temporary "snoozed" alarm
    const now = new Date();
    now.setMinutes(now.getMinutes() + SNOOZE_TIME);
    
    const snoozedAlarm = {
        id: Date.now().toString(),
        title: `${alarm.title} (Snoozed)`,
        time: `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`,
        sound: alarm.sound,
        duration: alarm.duration,
        repeatType: 'once',
        repeatDays: [],
        active: true
    };
    
    // Add to alarms array
    alarms.push(snoozedAlarm);
    saveAlarms();
    renderAlarms();
    updateAlarmCount();
    
    // Hide overlay
    document.getElementById('alarmOverlay').classList.remove('active');
    
    // Clear timeout and reset state
    clearTimeout(alarmTimeout);
    ringingAlarmId = null;
}

function dismissAlarm() {
    // Stop sound and hide overlay
    stopCurrentAlarmSound();
    document.getElementById('alarmOverlay').classList.remove('active');
    
    // If the alarm was one-time, update UI
    renderAlarms();
    updateAlarmCount();
    
    // Clear timeout and reset state
    clearTimeout(alarmTimeout);
    ringingAlarmId = null;
}

function stopCurrentAlarmSound() {
    if (currentAlarmSound && typeof currentAlarmSound.stop === 'function') {
        currentAlarmSound.stop();
    }
    currentAlarmSound = null;
}