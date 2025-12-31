import { useState, useEffect, useRef } from 'react';
import { useTranslation as useI18n } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Languages, Loader2, CheckCircle2, ArrowRight, Search, Package } from 'lucide-react';
// Removed HS code imports - now handled only in HS code field

interface TranslationResult {
  originalText: string;
  translatedText: string;
  detectedLanguage: string;
  confidence: number;
  needsTranslation: boolean;
}

interface ProductNameTranslatorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  onTranslation?: (translation: TranslationResult) => void;
  onHSCodeSelect?: (hsCode: string) => void;
}

export function ProductNameTranslator({ 
  value, 
  onChange, 
  placeholder = "Enter product name...", 
  className = "",
  onTranslation,
  onHSCodeSelect
}: ProductNameTranslatorProps) {
  const { t } = useI18n();
  const [translation, setTranslation] = useState<TranslationResult | null>(null);
  const [showTranslation, setShowTranslation] = useState(false);
  const [isTranslating, setIsTranslating] = useState(false);
  
  // Removed HS Code search state - HS codes should only appear in HS code field
  const resultsRef = useRef<HTMLDivElement>(null);

  // Hide translation confirmation when product value changes (new product added)
  useEffect(() => {
    if (showTranslation) {
      setShowTranslation(false);
      setTranslation(null);
    }
  }, [value]);

  // Removed HS code search functionality - now handled only in HS code field

  const handleTranslate = async () => {
    if (!value.trim() || value.length < 3) {
      return;
    }

    setIsTranslating(true);
    
    try {
      // Use the translation endpoint which includes detection
      const translateResponse = await fetch('/api/translate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text: value }),
      });

      if (translateResponse.ok) {
        const translateData = await translateResponse.json();
        console.log('Translation API response:', translateData);
        
        if (translateData.success && translateData.data) {
          const { originalText, translatedText, detectedLanguage, confidence, needsTranslation } = translateData.data;
          
          // If translation was needed, replace the input text directly
          if (needsTranslation) {
            onChange(translatedText);
          }
          
          // Create translation result for display
          const translationResult: TranslationResult = {
            originalText,
            translatedText,
            detectedLanguage,
            confidence,
            needsTranslation
          };
          
          setTranslation(translationResult);
          setShowTranslation(true);
          onTranslation?.(translationResult);
        }
      }
    } catch (error) {
      console.error('Translation failed:', error);
    } finally {
      setIsTranslating(false);
    }
  };

  const applyTranslation = () => {
    if (translation && translation.needsTranslation) {
      onChange(translation.translatedText);
      setShowTranslation(false);
    }
  };

  const getLanguageName = (code: string) => {
    const languages: { [key: string]: string } = {
      'en': 'English',
      'es': 'Spanish',
      'fr': 'French',
      'de': 'German',
      'it': 'Italian',
      'pt': 'Portuguese',
      'ru': 'Russian',
      'zh': 'Chinese',
      'ja': 'Japanese',
      'ko': 'Korean',
      'ar': 'Arabic',
      'tr': 'Turkish',
      'nl': 'Dutch',
      'sv': 'Swedish',
      'no': 'Norwegian',
      'da': 'Danish',
      'fi': 'Finnish',
      'pl': 'Polish',
      'cs': 'Czech',
      'sk': 'Slovak',
      'hu': 'Hungarian',
      'ro': 'Romanian',
      'bg': 'Bulgarian',
      'hr': 'Croatian',
      'sl': 'Slovenian',
      'et': 'Estonian',
      'lv': 'Latvian',
      'lt': 'Lithuanian',
      'el': 'Greek',
      'he': 'Hebrew',
      'hi': 'Hindi',
      'th': 'Thai',
      'vi': 'Vietnamese',
      'fa': 'Persian',
      'ur': 'Urdu',
      'bn': 'Bengali',
      'ta': 'Tamil',
      'te': 'Telugu',
      'ml': 'Malayalam',
      'kn': 'Kannada',
      'gu': 'Gujarati',
      'pa': 'Punjabi',
      'mr': 'Marathi',
      'ne': 'Nepali',
      'si': 'Sinhala',
      'my': 'Burmese',
      'km': 'Khmer',
      'lo': 'Lao',
      'ka': 'Georgian',
      'am': 'Amharic',
      'sw': 'Swahili',
      'zu': 'Zulu',
      'af': 'Afrikaans',
      'sq': 'Albanian',
      'eu': 'Basque',
      'be': 'Belarusian',
      'bs': 'Bosnian',
      'ca': 'Catalan',
      'cy': 'Welsh',
      'eo': 'Esperanto',
      'fo': 'Faroese',
      'gl': 'Galician',
      'is': 'Icelandic',
      'ga': 'Irish',
      'mk': 'Macedonian',
      'mt': 'Maltese',
      'sr': 'Serbian',
      'uk': 'Ukrainian',
      'uz': 'Uzbek'
    };
    return languages[code] || code.toUpperCase();
  };

  return (
    <div className="space-y-2 relative">
      {/* Input field with translation button */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Input
            type="text"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            className={className}
          />
          
          {/* Removed HS code search indicator */}
        </div>
        
        {/* Translation button - always visible */}
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="h-10 w-10 shrink-0"
                onClick={handleTranslate}
                disabled={isTranslating || !value.trim()}
              >
                {isTranslating ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Languages className="h-4 w-4" />
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>{t('products.tooltips.translateSingle')}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>

      {/* Removed HS Code Results Dropdown - now handled only in HS code field */}

      {/* Translation confirmation display */}
      {showTranslation && translation && (
        <div className="mt-2 p-2 bg-green-50 border border-green-200 rounded-md">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <span className="text-sm text-green-700">
                {translation.needsTranslation 
                  ? `Translated from ${getLanguageName(translation.detectedLanguage)} to English`
                  : `Already in English - ready for customs`
                }
              </span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowTranslation(false)}
              className="h-6 w-6 p-0 text-gray-400 hover:text-gray-600"
            >
              ×
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}