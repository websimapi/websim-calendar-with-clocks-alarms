// Voice mode functionality - refactored version
// This file now serves as the main entry point for voice functionality
// with most implementation details moved to separate modules

// Import voice modules with script tags in index.html

function initVoiceMode() {
    // Delegate to core initialization
    initVoiceCore();
}

// Tombstone comments for removed functions:
// removed function toggleVoiceMode() {}
// removed function handleSpeechResult() {}
// removed function processVoiceCommand() {}
// removed function createAlarmFromVoice() {}
// removed function askForAlarmLabel() {}
// removed function confirmAlarmDetails() {}
// removed function createConfirmedAlarm() {}
// removed function listenForSpecificAnswer() {}
// removed function listenForAlarmTime() {}
// removed function startIdleTimer() {}
// removed function updateVoiceStatus() {}
// removed function formatList() {}