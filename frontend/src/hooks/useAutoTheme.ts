'use client';
import { useEffect, useState } from 'react';
import { useTheme } from 'next-themes';

interface AutoThemeSettings {
  enabled: boolean;
  darkHourStart: number; // 24-hour format (e.g., 19 for 7 PM)
  darkHourEnd: number;   // 24-hour format (e.g., 7 for 7 AM)
}

/**
 * Custom hook for automatic theme switching based on user's timezone
 * Automatically switches to dark mode during nighttime hours
 */
export function useAutoTheme() {
  const { theme, setTheme } = useTheme();
  const [autoSettings, setAutoSettings] = useState<AutoThemeSettings>({
    enabled: true,  // 🎯 DEFAULT: Auto theme enabled by default for new users
    darkHourStart: 19, // 7 PM
    darkHourEnd: 7,    // 7 AM
  });
  const [userTimezone, setUserTimezone] = useState<string>('');
  const [currentTime, setCurrentTime] = useState<Date>(new Date());

  // Detect user's timezone
  useEffect(() => {
    try {
      const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      setUserTimezone(timezone);
      console.log('🌍 Detected timezone:', timezone);
    } catch (error) {
      console.warn('Failed to detect timezone:', error);
      setUserTimezone('UTC');
    }
  }, []);

  // Load auto theme settings from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem('auto-theme-settings');
      if (saved) {
        const parsed = JSON.parse(saved);
        setAutoSettings(parsed);
        console.log('🎨 Loaded auto theme settings:', parsed);
      }
    } catch (error) {
      console.warn('Failed to load auto theme settings:', error);
    }
  }, []);

  // Save auto theme settings to localStorage
  const updateAutoSettings = (newSettings: Partial<AutoThemeSettings>) => {
    const updated = { ...autoSettings, ...newSettings };
    
    // Only save if settings actually changed to prevent spam
    const currentSaved = localStorage.getItem('auto-theme-settings');
    const updatedStr = JSON.stringify(updated);
    
    if (currentSaved !== updatedStr) {
      setAutoSettings(updated);
      try {
        localStorage.setItem('auto-theme-settings', updatedStr);
        console.log('💾 Saved auto theme settings:', updated);
      } catch (error) {
        console.warn('Failed to save auto theme settings:', error);
      }
    } else {
      // Settings haven't changed, just update state
      setAutoSettings(updated);
    }
  };

  // Check if current time should use dark mode
  const shouldUseDarkMode = (currentHour: number, settings: AutoThemeSettings): boolean => {
    const { darkHourStart, darkHourEnd } = settings;
    
    if (darkHourStart < darkHourEnd) {
      // Normal case: e.g., dark from 19 to 7 (doesn't cross midnight)
      return false; // This would be for something like 10 AM to 6 PM
    } else {
      // Crosses midnight: e.g., dark from 19 to 7 (7 PM to 7 AM)
      return currentHour >= darkHourStart || currentHour < darkHourEnd;
    }
  };

  // Update current time every minute and check for theme changes
  useEffect(() => {
    // ⚠️ ONLY RUN IF AUTO THEME IS ENABLED
    if (!autoSettings.enabled) {
      // Just update current time for display purposes, don't interfere with manual theme changes
      const updateTime = () => setCurrentTime(new Date());
      updateTime();
      const interval = setInterval(updateTime, 60000);
      return () => clearInterval(interval);
    }

    const updateTime = () => {
      const now = new Date();
      setCurrentTime(now);
      
      if (userTimezone) {
        const currentHour = now.getHours();
        const shouldBeDark = shouldUseDarkMode(currentHour, autoSettings);
        const currentThemeIsDark = theme === 'dark';
        
        if (shouldBeDark && !currentThemeIsDark) {
          console.log('🌙 Auto switching to dark mode at hour:', currentHour);
          setTheme('dark');
        } else if (!shouldBeDark && currentThemeIsDark) {
          console.log('☀️ Auto switching to light mode at hour:', currentHour);
          setTheme('light');
        }
      }
    };

    // Update immediately
    updateTime();
    
    // Then update every minute
    const interval = setInterval(updateTime, 60000);
    
    return () => clearInterval(interval);
  }, [autoSettings.enabled, autoSettings.darkHourStart, autoSettings.darkHourEnd, userTimezone, theme, setTheme]);

  // Get display info for current timezone and time
  const getTimezoneInfo = () => {
    if (!userTimezone) return null;
    
    try {
      const now = new Date();
      const timeString = now.toLocaleTimeString('es-ES', {
        timeZone: userTimezone,
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
      });
      
      const locationParts = userTimezone.split('/');
      const location = locationParts[locationParts.length - 1].replace(/_/g, ' ');
      
      return {
        location,
        time: timeString,
        timezone: userTimezone,
        isDarkHours: autoSettings.enabled ? shouldUseDarkMode(now.getHours(), autoSettings) : false
      };
    } catch (error) {
      return null;
    }
  };

  // Enable auto theme with default settings
  const enableAutoTheme = () => {
    updateAutoSettings({ enabled: true });
    console.log('✨ Auto theme enabled');
  };

  // Disable auto theme
  const disableAutoTheme = () => {
    updateAutoSettings({ enabled: false });
    console.log('❌ Auto theme disabled');
  };

  // Customize dark hours
  const setDarkHours = (startHour: number, endHour: number) => {
    updateAutoSettings({ 
      darkHourStart: startHour, 
      darkHourEnd: endHour 
    });
    console.log(`🕐 Dark hours set: ${startHour}:00 - ${endHour}:00`);
  };

  return {
    // Settings
    autoSettings,
    userTimezone,
    currentTime,
    
    // Info
    timezoneInfo: getTimezoneInfo(),
    
    // Actions
    enableAutoTheme,
    disableAutoTheme,
    setDarkHours,
    updateAutoSettings,
    
    // Computed
    isAutoEnabled: autoSettings.enabled,
    isDarkHours: autoSettings.enabled ? shouldUseDarkMode(currentTime.getHours(), autoSettings) : false
  };
}