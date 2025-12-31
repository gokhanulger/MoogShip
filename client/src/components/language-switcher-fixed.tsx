import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { languageNames, languageDirections, setLanguageWithPersistence } from '../i18n';
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
 * Fixed language switcher component with proper persistence
 */
export function LanguageSwitcherFixed({ variant = 'default', size = 'default', className = '' }: { 
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
  
  const changeLanguage = (lng: string) => {
    setLanguageWithPersistence(lng);
    setCurrentLanguage(lng);
    // Force re-render to ensure translations update
    setTimeout(() => {
      window.location.reload();
    }, 100);
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
          aria-label="Select language"
        >
          <Globe className="h-4 w-4 mr-2" />
          <span className="text-sm font-medium">
            {languageNames[currentLanguage as keyof typeof languageNames] || 'Language'}
          </span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent 
        align="end" 
        className="w-48 max-h-60 overflow-y-auto bg-white border border-gray-200 rounded-md shadow-lg z-50"
      >
        {Object.entries(languageNames).map(([code, name]) => (
          <DropdownMenuItem
            key={code}
            onClick={() => changeLanguage(code)}
            className={cn(
              "flex items-center justify-between px-3 py-2 text-sm cursor-pointer hover:bg-gray-100 rounded-sm",
              currentLanguage === code && "bg-blue-50 text-blue-700 font-medium"
            )}
          >
            <span>{name}</span>
            {currentLanguage === code && (
              <Check className="h-4 w-4 text-blue-600" />
            )}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}