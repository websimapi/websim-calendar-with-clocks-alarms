// Utility for identifying US holidays
const holidays = {
    // Function to determine if a date is a holiday and return holiday info
    getHolidayInfo(date) {
        const year = date.getFullYear();
        const month = date.getMonth(); // 0-11
        const day = date.getDate();
        const dayOfWeek = date.getDay(); // 0-6, starting with Sunday
        
        // Format date as MM-DD for easy comparison
        const mmdd = `${month + 1}-${day}`;
        
        // Fixed date holidays
        const fixedHolidays = {
            "1-1": { name: "New Year's Day", color: "#3D85C6", icon: "🎉" },
            "2-14": { name: "Valentine's Day", color: "#E06666", icon: "❤️" },
            "3-17": { name: "St. Patrick's Day", color: "#6AA84F", icon: "☘️" },
            "7-4": { name: "Independence Day", color: "#3D85C6", icon: "🎆" },
            "10-31": { name: "Halloween", color: "#FF9900", icon: "🎃" },
            "11-11": { name: "Veterans Day", color: "#674EA7", icon: "🎖️" },
            "12-25": { name: "Christmas", color: "#CC0000", icon: "🎄" },
        };
        
        // Check fixed date holidays
        if (fixedHolidays[mmdd]) {
            return fixedHolidays[mmdd];
        }
        
        // Variable date holidays
        
        // Martin Luther King Jr. Day (3rd Monday in January)
        if (month === 0 && dayOfWeek === 1 && day >= 15 && day <= 21) {
            return { name: "MLK Jr. Day", color: "#674EA7", icon: "✊🏽" };
        }
        
        // Presidents' Day (3rd Monday in February)
        if (month === 1 && dayOfWeek === 1 && day >= 15 && day <= 21) {
            return { name: "Presidents' Day", color: "#3D85C6", icon: "🇺🇸" };
        }
        
        // Easter (variable date)
        const easterDate = this.calculateEaster(year);
        if (month === easterDate.getMonth() && day === easterDate.getDate()) {
            return { name: "Easter", color: "#6AA84F", icon: "🐰" };
        }
        
        // Mother's Day (2nd Sunday in May)
        if (month === 4 && dayOfWeek === 0 && day >= 8 && day <= 14) {
            return { name: "Mother's Day", color: "#E06666", icon: "💐" };
        }
        
        // Memorial Day (Last Monday in May)
        if (month === 4 && dayOfWeek === 1 && day >= 25 && day <= 31) {
            return { name: "Memorial Day", color: "#CC0000", icon: "🇺🇸" };
        }
        
        // Father's Day (3rd Sunday in June)
        if (month === 5 && dayOfWeek === 0 && day >= 15 && day <= 21) {
            return { name: "Father's Day", color: "#3D85C6", icon: "👔" };
        }
        
        // Labor Day (1st Monday in September)
        if (month === 8 && dayOfWeek === 1 && day <= 7) {
            return { name: "Labor Day", color: "#3D85C6", icon: "🛠️" };
        }
        
        // Columbus Day / Indigenous Peoples' Day (2nd Monday in October)
        if (month === 9 && dayOfWeek === 1 && day >= 8 && day <= 14) {
            return { name: "Columbus Day", color: "#674EA7", icon: "🧭" };
        }
        
        // Thanksgiving (4th Thursday in November)
        if (month === 10 && dayOfWeek === 4 && day >= 22 && day <= 28) {
            return { name: "Thanksgiving", color: "#B45F06", icon: "🦃" };
        }
        
        // Not a holiday
        return null;
    },
    
    // Helper method to calculate Easter date for a given year
    calculateEaster(year) {
        // Meeus/Jones/Butcher algorithm
        const a = year % 19;
        const b = Math.floor(year / 100);
        const c = year % 100;
        const d = Math.floor(b / 4);
        const e = b % 4;
        const f = Math.floor((b + 8) / 25);
        const g = Math.floor((b - f + 1) / 3);
        const h = (19 * a + b - d - g + 15) % 30;
        const i = Math.floor(c / 4);
        const k = c % 4;
        const l = (32 + 2 * e + 2 * i - h - k) % 7;
        const m = Math.floor((a + 11 * h + 22 * l) / 451);
        const month = Math.floor((h + l - 7 * m + 114) / 31) - 1; // 0-based month
        const day = ((h + l - 7 * m + 114) % 31) + 1;
        
        return new Date(year, month, day);
    }
};