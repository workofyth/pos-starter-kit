"use client";

import { useEffect, useState } from "react";

export function ThemeInitializer() {
  const [primaryColor, setPrimaryColor] = useState<string | null>(null);

  const fetchThemeColor = async () => {
    try {
      const response = await fetch('/api/settings?key=primary_color');
      if (response.ok) {
        const result = await response.json();
        if (result.success && result.data?.value) {
          setPrimaryColor(result.data.value);
        }
      }
    } catch (error) {
      console.error('Error fetching theme color:', error);
    }
  };

  useEffect(() => {
    fetchThemeColor();

    const handleStorageChange = () => fetchThemeColor();
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  if (!primaryColor) return null;

  // Function to hex to oklch or similar would be better, 
  // but we can just override the primary color with the hex value directly.
  // Tailwind/Shadcn will use this variable.
  
  return (
    <style dangerouslySetInnerHTML={{ __html: `
      :root {
        --primary: ${primaryColor} !important;
        --sidebar-primary: ${primaryColor} !important;
        --ring: ${primaryColor}66 !important;
      }
      .dark {
        --primary: ${primaryColor} !important;
        --sidebar-primary: ${primaryColor} !important;
      }
    `}} />
  );
}
