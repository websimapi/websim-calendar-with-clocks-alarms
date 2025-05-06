// Clock functionality
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

let lastCheckedDate;

function checkDateRollover() {
    const now = new Date();
    const today = now.toDateString(); // Get current day as string
    
    if (today !== lastCheckedDate) {
        // Date has changed, update the calendar
        console.log("Date rollover detected, updating calendar");
        lastCheckedDate = today;
        renderCalendar(); // Re-render the calendar to update today's indicator
    }
}

function initClocks() {
    initializeAnalogClock();
    updateDigitalClock();
    
    // Start clock updates
    setInterval(() => {
        updateAnalogClock();
        updateDigitalClock();
        // Check if date has rolled over
        checkDateRollover();
        // Emit event for alarm checking
        EventEmitter.emit('checkAlarms');
    }, 1000);
}