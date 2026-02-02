import { createContext, useContext, useState, useEffect } from 'react';

const ThemeContext = createContext();

export function ThemeProvider({ children }) {
    const [theme, setTheme] = useState(() => {
        const saved = localStorage.getItem('theme');
        return saved || 'dark';
    });

    const [textSize, setTextSize] = useState(() => {
        const saved = localStorage.getItem('textSize');
        return saved || 'medium';
    });

    useEffect(() => {
        document.documentElement.setAttribute('data-theme', theme);
        localStorage.setItem('theme', theme);
    }, [theme]);

    useEffect(() => {
        document.documentElement.setAttribute('data-text-size', textSize);
        localStorage.setItem('textSize', textSize);
    }, [textSize]);

    const toggleTheme = () => {
        setTheme(prev => prev === 'dark' ? 'light' : 'dark');
    };

    const cycleTextSize = () => {
        const sizes = ['small', 'medium', 'large'];
        const currentIndex = sizes.indexOf(textSize);
        const nextIndex = (currentIndex + 1) % sizes.length;
        setTextSize(sizes[nextIndex]);
    };

    return (
        <ThemeContext.Provider value={{ theme, toggleTheme, textSize, setTextSize, cycleTextSize }}>
            {children}
        </ThemeContext.Provider>
    );
}

export function useTheme() {
    const context = useContext(ThemeContext);
    if (!context) {
        throw new Error('useTheme must be used within a ThemeProvider');
    }
    return context;
}
