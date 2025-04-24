// Calendar functionality
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
        dayElement.innerHTML = `<span>${prevLastDay - i + 1}</span>`;
        calendar.appendChild(dayElement);
    }
    
    // Current month days
    for (let i = 1; i <= lastDay.getDate(); i++) {
        const dayElement = document.createElement('div');
        dayElement.classList.add('day');
        dayElement.innerHTML = `<span>${i}</span>`;
        
        const today = new Date();
        if (i === today.getDate() && month === today.getMonth() && year === today.getFullYear()) {
            dayElement.classList.add('today');
        }
        
        // Add a data attribute to identify days in the 6th row that belong to current month
        const dayRow = Math.ceil((firstDayIndex + i) / 7);
        if (dayRow === 6) {
            dayElement.setAttribute('data-row', '6');
            dayElement.setAttribute('data-current-month', 'true');
        }
        
        calendar.appendChild(dayElement);
    }
    
    // Next month days
    const totalDaysDisplayed = firstDayIndex + lastDay.getDate();
    const nextDays = 42 - totalDaysDisplayed;
    for (let i = 1; i <= nextDays; i++) {
        const dayElement = document.createElement('div');
        dayElement.classList.add('day', 'other-month');
        dayElement.innerHTML = `<span>${i}</span>`;
        
        // Add a data attribute to identify days in the 6th row 
        const dayRow = Math.ceil((totalDaysDisplayed + i) / 7);
        if (dayRow === 6) {
            dayElement.setAttribute('data-row', '6');
        }
        
        calendar.appendChild(dayElement);
    }
    
    // Apply special hover effects to 6th row days that are in current month
    adjustSixthRowHover();
}

function adjustSixthRowHover() {
    // Remove all special hover styles first
    document.querySelectorAll('.day[data-row="6"]').forEach(day => {
        day.style.background = '';
        day.style.backgroundImage = '';
        day.style.cursor = 'default';
    });
    
    // Add special hover to current month days in 6th row
    document.querySelectorAll('.day[data-row="6"][data-current-month="true"]').forEach(day => {
        day.style.cursor = 'pointer';
        
        day.addEventListener('mouseenter', () => {
            day.style.backgroundImage = 'linear-gradient(to bottom, #f0f0f0 50%, transparent 50%)';
        });
        
        day.addEventListener('mouseleave', () => {
            day.style.backgroundImage = '';
        });
    });
}

function initCalendarControls() {
    document.getElementById('prevMonth').addEventListener('click', () => {
        currentDate.setMonth(currentDate.getMonth() - 1);
        renderCalendar();
    });
    
    document.getElementById('nextMonth').addEventListener('click', () => {
        currentDate.setMonth(currentDate.getMonth() + 1);
        renderCalendar();
    });
    
    // Add event listener for window resize
    window.addEventListener('resize', renderCalendar);
    
    // Initial render
    renderCalendar();
    
    // Force a re-render after a short delay to fix any initial layout issues
    setTimeout(renderCalendar, 100);
}