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

function initAlarms() {
    document.getElementById('setAlarm').addEventListener('click', addAlarm);
    renderAlarms();
    
    // Listen for clock ticks to check alarms
    EventEmitter.on('checkAlarms', checkAlarms);
}