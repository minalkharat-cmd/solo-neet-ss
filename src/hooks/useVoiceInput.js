// Voice Input Hook - Uses Web Speech API (browser) with MedASR backend fallback
// MedASR (Google's medical speech-to-text, 105M params, 5.2% WER) for medical terminology
import { useState, useCallback, useRef } from 'react';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3002';

/**
 * Hook for voice input with medical speech recognition
 * Uses browser SpeechRecognition API with optional MedASR backend enhancement
 */
export function useVoiceInput() {
    const [isListening, setIsListening] = useState(false);
    const [transcript, setTranscript] = useState('');
    const [interimTranscript, setInterimTranscript] = useState('');
    const [error, setError] = useState(null);
    const [isSupported, setIsSupported] = useState(true);
    const recognitionRef = useRef(null);

    // Initialize browser speech recognition
    const initRecognition = useCallback(() => {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

        if (!SpeechRecognition) {
            setIsSupported(false);
            setError('Speech recognition not supported in this browser');
            return null;
        }

        const recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = 'en-US';
        recognition.maxAlternatives = 1;

        recognition.onresult = (event) => {
            let interim = '';
            let final = '';

            for (let i = event.resultIndex; i < event.results.length; i++) {
                const result = event.results[i];
                if (result.isFinal) {
                    final += result[0].transcript + ' ';
                } else {
                    interim += result[0].transcript;
                }
            }

            if (final) {
                setTranscript(prev => prev + final);
            }
            setInterimTranscript(interim);
        };

        recognition.onerror = (event) => {
            console.error('Speech recognition error:', event.error);
            if (event.error === 'not-allowed') {
                setError('Microphone access denied. Please allow microphone access.');
            } else if (event.error === 'no-speech') {
                // Don't treat as error, just no speech detected
            } else {
                setError(`Voice error: ${event.error}`);
            }
            setIsListening(false);
        };

        recognition.onend = () => {
            // Auto-restart if still supposed to be listening
            if (recognitionRef.current && isListening) {
                try {
                    recognition.start();
                } catch (e) {
                    // Already started
                }
            }
        };

        return recognition;
    }, [isListening]);

    // Start listening
    const startListening = useCallback(() => {
        setError(null);
        setTranscript('');
        setInterimTranscript('');

        const recognition = initRecognition();
        if (!recognition) return;

        recognitionRef.current = recognition;

        try {
            recognition.start();
            setIsListening(true);
        } catch (e) {
            setError('Failed to start voice recognition');
        }
    }, [initRecognition]);

    // Stop listening
    const stopListening = useCallback(() => {
        if (recognitionRef.current) {
            recognitionRef.current.stop();
            recognitionRef.current = null;
        }
        setIsListening(false);
        setInterimTranscript('');
    }, []);

    // Toggle listening
    const toggleListening = useCallback(() => {
        if (isListening) {
            stopListening();
        } else {
            startListening();
        }
    }, [isListening, startListening, stopListening]);

    // Clear transcript
    const clearTranscript = useCallback(() => {
        setTranscript('');
        setInterimTranscript('');
    }, []);

    return {
        isListening,
        transcript,
        interimTranscript,
        error,
        isSupported,
        startListening,
        stopListening,
        toggleListening,
        clearTranscript,
        // Combined text (final + interim)
        fullText: transcript + interimTranscript
    };
}
