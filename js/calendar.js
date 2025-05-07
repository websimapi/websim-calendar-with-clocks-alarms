// Calendar functionality
let calendar;

function initCalendarControls() {
    const calendarEl = document.getElementById('calendar');
    
    calendar = new FullCalendar.Calendar(calendarEl, {
        initialView: 'dayGridMonth',
        headerToolbar: {
            left: 'prev,next today',
            center: 'title',
            right: 'dayGridMonth,timeGridWeek'
        },
        firstDay: 0, // Start week on Sunday
        height: 'auto',
        dayMaxEvents: true, // Allow "more" link when too many events
        weekends: true,
        showNonCurrentDates: true,
        fixedWeekCount: false,
        navLinks: true, // Can click day/week names to navigate views
        dayHeaderFormat: { weekday: 'long' }, // Full day names
        dayCellDidMount: function(info) {
            // Check for holidays
            const date = info.date;
            const holidayInfo = holidays.getHolidayInfo(date);
            
            if (holidayInfo) {
                // Create holiday indicator
                const holidayEl = document.createElement('div');
                holidayEl.className = 'holiday-indicator';
                holidayEl.textContent = holidayInfo.icon;
                holidayEl.style.color = holidayInfo.color;
                holidayEl.title = holidayInfo.name;
                
                // Style the day cell
                info.el.classList.add('holiday');
                info.el.style.borderColor = holidayInfo.color;
                info.el.appendChild(holidayEl);
                
                // Add tooltip functionality
                info.el.setAttribute('data-holiday', holidayInfo.name);
            }
            
            // Check if today
            const today = new Date();
            if (date.getDate() === today.getDate() && 
                date.getMonth() === today.getMonth() && 
                date.getFullYear() === today.getFullYear()) {
                info.el.classList.add('today');
            }
        },
        // Custom styling for day cells
        dayCellContent: function(info) {
            // Create and return custom day cell content
            const dayNumber = document.createElement('div');
            dayNumber.classList.add('day-number');
            dayNumber.textContent = info.dayNumberText;
            return { domNodes: [dayNumber] };
        }
    });
    
    calendar.render();
    
    // Add custom styles for improved layout
    const style = document.createElement('style');
    style.textContent = `
        .fc-daygrid-day-top {
            justify-content: flex-start !important;
            padding-left: 5px !important;
        }
        .day-number {
            font-size: 1.1em;
            font-weight: 500;
            margin-top: 5px;
        }
    `;
    document.head.appendChild(style);
    
    // Listen for window resize to adjust calendar
    window.addEventListener('resize', () => {
        calendar.updateSize();
    });
}

// Expose functions needed by other modules
function renderCalendar() {
    // FullCalendar handles rendering internally
    if (calendar) {
        calendar.today(); // Go to today
        calendar.render();
    }
}