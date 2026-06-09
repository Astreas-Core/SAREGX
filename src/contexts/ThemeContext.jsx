import React, { createContext, useState, useContext, useEffect } from 'react';

const ThemeContext = createContext();

export const THEMES = {
  pink: { name: 'Neon Pink', hex: '#b04090', rgb: '176, 48, 136' },
  blue: { name: 'Cyber Blue', hex: '#00ccff', rgb: '0, 204, 255' },
  green: { name: 'Emerald', hex: '#00ff88', rgb: '0, 255, 136' },
  orange: { name: 'Sunset', hex: '#ff5500', rgb: '255, 85, 0' },
  purple: { name: 'Amethyst', hex: '#9d4edd', rgb: '157, 78, 221' },
  red: { name: 'Crimson', hex: '#ff2a2a', rgb: '255, 42, 42' },
  dynamic: { name: 'Dynamic (Thumbnail)', hex: '#ffffff', rgb: '255, 255, 255' }
};

export function ThemeProvider({ children }) {
  const [currentTheme, setCurrentTheme] = useState(() => {
    const saved = localStorage.getItem('saregx_theme');
    return saved && THEMES[saved] ? saved : 'pink';
  });

  const [dynamicColor, setDynamicColor] = useState(null);

  useEffect(() => {
    let themeToApply = THEMES[currentTheme];
    
    if (currentTheme === 'dynamic' && dynamicColor) {
      themeToApply = dynamicColor;
    }

    // Apply variables to root document
    document.documentElement.style.setProperty('--accent-pink', themeToApply.hex); // Legacy support
    document.documentElement.style.setProperty('--accent-hex', themeToApply.hex);
    document.documentElement.style.setProperty('--accent-rgb', themeToApply.rgb);
    
    // Save to local storage
    localStorage.setItem('saregx_theme', currentTheme);
  }, [currentTheme, dynamicColor]);

  return (
    <ThemeContext.Provider value={{ 
      currentTheme, 
      setCurrentTheme, 
      themeObj: currentTheme === 'dynamic' && dynamicColor ? dynamicColor : THEMES[currentTheme],
      setDynamicColor 
    }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);
