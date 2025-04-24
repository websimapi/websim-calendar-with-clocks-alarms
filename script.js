// Global variables
let currentDate = new Date();
let alarms = JSON.parse(localStorage.getItem('alarms')) || [];
let alarmSound;

// Initialize on document load
document.addEventListener('DOMContentLoaded', () => {
    // Initialize calendar
    renderCalendar();
    document.getElementById('prevMonth').addEventListener('click', () => {
        currentDate.setMonth(currentDate.getMonth() - 1);
        renderCalendar();
    });
    document.getElementById('nextMonth').addEventListener('click', () => {
        currentDate.setMonth(currentDate.getMonth() + 1);
        renderCalendar();
    });

    // Initialize clocks
    initializeAnalogClock();
    updateDigitalClock();
    setInterval(() => {
        updateAnalogClock();
        updateDigitalClock();
        checkAlarms();
    }, 1000);

    // Initialize alarms
    document.getElementById('setAlarm').addEventListener('click', addAlarm);
    renderAlarms();
    
    // Initialize audio context
    initAudioContext();
});

// Calendar Functions
function renderCalendar() {
    const monthYear = document.getElementById('monthYear');
    const calendar = document.getElementById('calendar');
    
    const month = currentDate.getMonth();
    const year = currentDate.getFullYear();
    
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    
    monthYear.textContent = `${firstDay.toLocaleString('default', { month: 'long' })} ${year}`;
    
    calendar.innerHTML = '';
    
    // Add days from previous month
    const firstDayIndex = firstDay.getDay();
    const prevLastDay = new Date(year, month, 0).getDate();
    
    for (let i = firstDayIndex; i > 0; i--) {
        const dayElement = document.createElement('div');
        dayElement.classList.add('day', 'other-month');
        dayElement.textContent = prevLastDay - i + 1;
        calendar.appendChild(dayElement);
    }
    
    // Current month days
    for (let i = 1; i <= lastDay.getDate(); i++) {
        const dayElement = document.createElement('div');
        dayElement.classList.add('day');
        dayElement.textContent = i;
        
        const today = new Date();
        if (i === today.getDate() && month === today.getMonth() && year === today.getFullYear()) {
            dayElement.classList.add('today');
        }
        
        calendar.appendChild(dayElement);
    }
    
    // Next month days
    const nextDays = 42 - (firstDayIndex + lastDay.getDate());
    for (let i = 1; i <= nextDays; i++) {
        const dayElement = document.createElement('div');
        dayElement.classList.add('day', 'other-month');
        dayElement.textContent = i;
        calendar.appendChild(dayElement);
    }
}

// Analog Clock Functions
function initializeAnalogClock() {
    const hourMarkers = document.querySelector('.hour-markers');
    hourMarkers.innerHTML = ''; // Clear existing markers first
    
    // Create hour markers
    for (let i = 1; i <= 12; i++) {
        const marker = document.createElement('div');
        marker.classList.add('hour-marker');
        const angle = (i * 30) - 90; // 30 degrees per hour, -90 to start at 12 o'clock
        const radians = angle * Math.PI / 180;
        const radius = 42; // Position relative to clock size (percentage from center)
        
        marker.style.position = 'absolute';
        marker.style.top = `${50 + radius * Math.sin(radians)}%`;
        marker.style.left = `${50 + radius * Math.cos(radians)}%`;
        marker.style.transform = 'translate(-50%, -50%)';
        marker.textContent = i;
        
        hourMarkers.appendChild(marker);
    }
    
    updateAnalogClock();
}

function updateAnalogClock() {
    const now = new Date();
    const hours = now.getHours() % 12;
    const minutes = now.getMinutes();
    const seconds = now.getSeconds();
    
    const hourAngle = (hours * 30) + (minutes * 0.5); // 30 degrees per hour + adjustment for minutes
    const minuteAngle = minutes * 6; // 6 degrees per minute
    const secondAngle = seconds * 6; // 6 degrees per second
    
    document.querySelector('.hour-hand').style.transform = `translateX(-50%) rotate(${hourAngle}deg)`;
    document.querySelector('.minute-hand').style.transform = `translateX(-50%) rotate(${minuteAngle}deg)`;
    document.querySelector('.second-hand').style.transform = `translateX(-50%) rotate(${secondAngle}deg)`;
}

// Digital Clock Functions
function updateDigitalClock() {
    const now = new Date();
    const digitalTime = document.getElementById('digital-time');
    const digitalDate = document.getElementById('digital-date');
    
    // Format time as HH:MM:SS AM/PM
    let hours = now.getHours();
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12; // Convert 0 to 12
    const minutes = now.getMinutes().toString().padStart(2, '0');
    const seconds = now.getSeconds().toString().padStart(2, '0');
    digitalTime.textContent = `${hours}:${minutes}:${seconds} ${ampm}`;
    
    // Format date as Day, Month Date, Year
    digitalDate.textContent = now.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
}

// Alarm Functions
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

function saveAlarms() {
    localStorage.setItem('alarms', JSON.stringify(alarms));
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

// Audio Functions
function initAudioContext() {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    const audioContext = new AudioContext();
    
    // Create oscillator for alarm sound
    function createAlarmSound() {
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.type = 'square';
        oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
        gainNode.gain.setValueAtTime(0.5, audioContext.currentTime);
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        return {
            oscillator,
            gainNode,
            start() {
                oscillator.start();
                // Create a beeping effect
                this.beep();
            },
            stop() {
                oscillator.stop();
            },
            beep() {
                let beepCount = 0;
                const beepInterval = setInterval(() => {
                    if (beepCount % 2 === 0) {
                        gainNode.gain.setValueAtTime(0.5, audioContext.currentTime);
                    } else {
                        gainNode.gain.setValueAtTime(0, audioContext.currentTime);
                    }
                    beepCount++;
                    
                    if (beepCount > 10) {
                        clearInterval(beepInterval);
                        this.stop();
                    }
                }, 300);
            }
        };
    }
    
    alarmSound = createAlarmSound;
}

function playAlarmSound() {
    if (alarmSound) {
        const sound = alarmSound();
        sound.start();
    }
}