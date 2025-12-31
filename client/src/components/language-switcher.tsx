import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { languageNames, languageDirections, changeLanguage as setLanguage, getCurrentLanguage } from '../i18n';
import { Languages, Check, Globe } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * Language switcher component that allows users to change the application language
 * - Renders a dropdown menu with all supported languages
 * - Updates the document direction based on the selected language (LTR or RTL)
 * - Saves the language preference to localStorage
 */
export function LanguageSwitcher({ variant = 'default', size = 'default', className = '' }: { 
  variant?: 'default' | 'outline' | 'ghost' | 'secondary' | 'link' | 'destructive',
  size?: 'default' | 'sm' | 'lg' | 'icon',
  className?: string
}) {
  const { i18n } = useTranslation();
  const [currentLanguage, setCurrentLanguage] = useState(i18n.language);
  
  // Update the document direction based on the current language
  useEffect(() => {
    const direction = languageDirections[currentLanguage as keyof typeof languageDirections] || 'ltr';
    document.documentElement.dir = direction;
    document.documentElement.lang = currentLanguage;
  }, [currentLanguage]);
  
  const handleLanguageChange = (lng: string) => {
    setLanguage(lng);
    setCurrentLanguage(lng);
  };
  
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="outline"
          size={size}
          className={cn("px-3 py-1 rounded-md border border-gray-300 hover:bg-gray-100", className, {
            "flex-row-reverse": document.documentElement.dir === "rtl"
          })}
        >
          <span>{languageNames[currentLanguage as keyof typeof languageNames] || languageNames.en}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {Object.entries(languageNames).map(([code, name]) => (
          <DropdownMenuItem
            key={code}
            className={cn("flex items-center gap-2 cursor-pointer", {
              "font-bold": currentLanguage === code,
              "justify-end": code === "ar"
            })}
            onClick={() => handleLanguageChange(code)}
          >
            <span>{name}</span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/**
 * Simple language switcher that only shows an icon.
 * Useful for mobile views or space-constrained areas.
 */
export function MiniLanguageSwitcher({ className = '' }: { className?: string }) {
  const { i18n } = useTranslation();
  const [currentLanguage, setCurrentLanguage] = useState(i18n.language);
  
  // Listen for language changes from i18n
  useEffect(() => {
    setCurrentLanguage(i18n.language);
  }, [i18n.language]);
  
  // Update the document direction based on the current language
  useEffect(() => {
    const direction = languageDirections[currentLanguage as keyof typeof languageDirections] || 'ltr';
    document.documentElement.dir = direction;
    document.documentElement.lang = currentLanguage;
  }, [currentLanguage]);
  
  const handleLanguageChange = (lng: string) => {
    setLanguage(lng);
    setCurrentLanguage(lng);
  };
  
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="outline" 
          size="sm"
          className={cn("flex items-center gap-1 px-2 py-1 rounded-md border border-gray-300 hover:bg-gray-100", className)}
        >
          <span className="font-medium text-xs uppercase">{currentLanguage.substring(0, 2)}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {Object.entries(languageNames).map(([code, name]) => (
          <DropdownMenuItem
            key={code}
            className={cn("flex items-center gap-2 cursor-pointer", {
              "font-bold": currentLanguage === code,
              "justify-end": code === "ar"
            })}
            onClick={() => handleLanguageChange(code)}
          >
            <span>{name}</span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}