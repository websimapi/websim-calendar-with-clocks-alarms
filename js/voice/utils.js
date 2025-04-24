// Voice utility functions

// Listen for specific answer types (time, label, confirmation)
function listenForSpecificAnswer(type, callback) {
    // Set flag that we're expecting a specific answer
    window.expectingVoiceResponse = type;
    
    // Save original handler
    const originalOnResult = recognition.onresult;
    
    // Set up a one-time listener for the next speech result
    recognition.onresult = function(event) {
        const transcript = Array.from(event.results)
            .map(result => result[0].transcript)
            .join('');
        
        console.log(`${type} response:`, transcript);
        
        // Reset the onresult handler
        recognition.onresult = originalOnResult;
        window.expectingVoiceResponse = false;
        
        // Pass the transcript to the callback
        callback(transcript);
    };
}

// This function is now deprecated - replaced by listenForSpecificAnswer
function listenForAlarmTime(callback) {
    listenForSpecificAnswer('time', callback);
}

// Helper function to format a list of items in a natural language way
function formatList(items) {
    if (items.length === 0) return '';
    if (items.length === 1) return items[0];
    if (items.length === 2) return `${items[0]} and ${items[1]}`;
    
    const lastItem = items.pop();
    return `${items.join(', ')}, and ${lastItem}`;
}