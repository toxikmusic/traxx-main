import { useQuery } from '@tanstack/react-query';
import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/AuthProvider';

interface UserSettings {
  id: number;
  userId: number;
  uiColor: string;
  enableAutoplay: boolean;
  defaultSortType: string;
  highContrastMode: boolean;
  createdAt: string;
  updatedAt: string;
}

const defaultSettings: Partial<UserSettings> = {
  uiColor: '#7c3aed', // Default purple
  enableAutoplay: false,
  defaultSortType: 'recent',
  highContrastMode: false
};

interface SettingsCache {
  uiColor: string;
  highContrastMode: boolean;
}

export function useUserSettings() {
  const { user } = useAuth();
  const [cachedSettings, setCachedSettings] = useState<SettingsCache | null>(null);
  
  // Try to load cached settings from localStorage
  useEffect(() => {
    try {
      const storedSettings = localStorage.getItem('userSettings');
      if (storedSettings) {
        const parsed = JSON.parse(storedSettings) as SettingsCache;
        console.log('Initial cached settings:', parsed);
        setCachedSettings(parsed);
        
        // Apply the theme from cache immediately
        document.documentElement.style.setProperty('--primary', parsed.uiColor);
      }
    } catch (error) {
      console.error('Error loading cached settings:', error);
    }
  }, []);

  // Fetch user settings from the API
  const { data, isLoading, error } = useQuery({
    queryKey: ['/api/user-settings', user?.id],
    queryFn: async () => {
      if (!user) return null;
      
      const response = await fetch(`/api/user-settings/${user.id}`);
      if (!response.ok) {
        throw new Error('Failed to fetch user settings');
      }
      
      const data = await response.json();
      
      // Cache settings in localStorage
      const cacheData = {
        uiColor: data.uiColor,
        highContrastMode: data.highContrastMode
      };
      
      try {
        localStorage.setItem('userSettings', JSON.stringify(cacheData));
        console.log('Theme cache updated:', cacheData);
        setCachedSettings(cacheData);
      } catch (error) {
        console.error('Error caching settings:', error);
      }
      
      // Apply theme immediately
      document.documentElement.style.setProperty('--primary', data.uiColor);
      console.log('Applying theme from server settings');
      
      return data;
    },
    enabled: !!user
  });

  // Use cached settings if no data is loaded yet
  const settings = data || (cachedSettings ? { 
    ...defaultSettings,
    uiColor: cachedSettings.uiColor,
    highContrastMode: cachedSettings.highContrastMode
  } : defaultSettings);

  return { 
    settings: settings as UserSettings, 
    isLoading,
    error
  };
}