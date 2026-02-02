// Solo NEET SS - Aura Sound Engine
// Web Audio API-based sound synthesis

let audioContext = null;

const getAudioContext = () => {
    if (!audioContext) {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
    }
    return audioContext;
};

const playTone = (frequency, duration, type = 'sine', volume = 0.3) => {
    try {
        const ctx = getAudioContext();
        const oscillator = ctx.createOscillator();
        const gainNode = ctx.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(ctx.destination);

        oscillator.type = type;
        oscillator.frequency.setValueAtTime(frequency, ctx.currentTime);

        gainNode.gain.setValueAtTime(volume, ctx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + duration);

        oscillator.start(ctx.currentTime);
        oscillator.stop(ctx.currentTime + duration);
    } catch (e) {
        console.warn('Audio playback failed:', e);
    }
};

export const playCorrect = () => {
    playTone(523.25, 0.1); // C5
    setTimeout(() => playTone(659.25, 0.1), 50); // E5
    setTimeout(() => playTone(783.99, 0.15), 100); // G5
};

export const playWrong = () => {
    playTone(300, 0.2, 'sawtooth', 0.2);
    setTimeout(() => playTone(200, 0.3, 'sawtooth', 0.15), 100);
};

export const playLevelUp = () => {
    const notes = [523.25, 659.25, 783.99, 1046.50];
    notes.forEach((freq, i) => {
        setTimeout(() => playTone(freq, 0.2, 'sine', 0.25), i * 100);
    });
};

export const playRankUp = () => {
    const notes = [392, 523.25, 659.25, 783.99, 1046.50, 1318.51];
    notes.forEach((freq, i) => {
        setTimeout(() => playTone(freq, 0.25, 'sine', 0.3), i * 120);
    });
};

export const playAchievement = () => {
    const notes = [392, 493.88, 587.33, 783.99];
    notes.forEach((freq, i) => {
        setTimeout(() => playTone(freq, 0.15, 'triangle', 0.25), i * 80);
    });
};

export const playClick = () => {
    playTone(800, 0.05, 'square', 0.1);
};

export const playTimerTick = () => {
    playTone(1000, 0.03, 'square', 0.08);
};

export const playCritical = () => {
    playTone(880, 0.1, 'sine', 0.4);
    setTimeout(() => playTone(1174.66, 0.15, 'sine', 0.4), 80);
    setTimeout(() => playTone(1396.91, 0.2, 'triangle', 0.35), 160);
};

export const playDungeonEnter = () => {
    playTone(220, 0.4, 'sine', 0.2);
    setTimeout(() => playTone(277.18, 0.4, 'sine', 0.2), 200);
    setTimeout(() => playTone(329.63, 0.5, 'sine', 0.25), 400);
};

export const playVictory = () => {
    const notes = [523.25, 659.25, 783.99, 1046.50, 1318.51];
    notes.forEach((freq, i) => {
        setTimeout(() => playTone(freq, 0.3, 'sine', 0.3), i * 150);
    });
};

export const playDefeat = () => {
    const notes = [392, 349.23, 311.13, 261.63];
    notes.forEach((freq, i) => {
        setTimeout(() => playTone(freq, 0.3, 'sawtooth', 0.15), i * 200);
    });
};
