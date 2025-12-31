import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { changeLanguage, getCurrentLanguage, languageNames } from '../i18n';
import { Globe, Check } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";

export function SimpleLanguageSwitcher() {
  const { i18n } = useTranslation();
  const [currentLang, setCurrentLang] = useState(getCurrentLanguage());

  const handleLanguageChange = (lang: string) => {
    changeLanguage(lang);
    setCurrentLang(lang);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="px-3 py-1">
          <Globe className="h-4 w-4 mr-2" />
          {languageNames[currentLang as keyof typeof languageNames] || 'Language'}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-40">
        {Object.entries(languageNames).map(([code, name]) => (
          <DropdownMenuItem
            key={code}
            onClick={() => handleLanguageChange(code)}
            className="flex items-center justify-between"
          >
            <span>{name}</span>
            {currentLang === code && <Check className="h-4 w-4" />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}