import OpenAI from "openai";
import fetch from "node-fetch";

// the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Free translation services
const FREE_TRANSLATION_SERVICES = {
  LIBRE_TRANSLATE: 'https://libretranslate.de/translate',
  MYMEMORY: 'https://api.mymemory.translated.net/get'
};

/**
 * Try LibreTranslate free service
 */
async function tryLibreTranslate(text: string, sourceLanguage: string): Promise<string | null> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout
    
    const response = await fetch(FREE_TRANSLATION_SERVICES.LIBRE_TRANSLATE, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        q: text,
        source: sourceLanguage,
        target: 'en',
        format: 'text'
      }),
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      return null;
    }

    const data = await response.json() as any;
    return data.translatedText || null;
  } catch (error) {
    console.log('LibreTranslate failed:', error);
    return null;
  }
}

/**
 * Try MyMemory free service
 */
async function tryMyMemory(text: string, sourceLanguage: string): Promise<string | null> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000); // 8 second timeout
    
    const url = `${FREE_TRANSLATION_SERVICES.MYMEMORY}?q=${encodeURIComponent(text)}&langpair=${sourceLanguage}|en`;
    
    const response = await fetch(url, {
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      return null;
    }

    const data = await response.json() as any;
    
    if (data.responseStatus === 200 && data.responseData?.translatedText) {
      return data.responseData.translatedText;
    }
    
    return null;
  } catch (error) {
    console.log('MyMemory failed:', error);
    return null;
  }
}

export interface LanguageDetectionResult {
  detectedLanguage: string;
  confidence: number;
  isEnglish: boolean;
}

export interface TranslationResult {
  originalText: string;
  translatedText: string;
  detectedLanguage: string;
  confidence: number;
  needsTranslation: boolean;
  error?: string;
}

/**
 * Detect the language of a given text
 */
export async function detectLanguage(text: string): Promise<LanguageDetectionResult> {
  try {
    if (!text || text.trim().length === 0) {
      return {
        detectedLanguage: 'en',
        confidence: 1.0,
        isEnglish: true
      };
    }

    // Check for obvious Turkish characters first (for immediate detection)
    const turkishChars = ['ü', 'ö', 'ı', 'ğ', 'ş', 'ç', 'İ'];
    const hasTurkishChars = turkishChars.some(char => text.includes(char));
    
    // Only use pre-detection for texts with Turkish special characters
    if (hasTurkishChars) {
      console.log(`Turkish characters detected in "${text}"`);
      return {
        detectedLanguage: 'tr',
        confidence: 0.95,
        isEnglish: false
      };
    }

    // Enhanced OpenAI language detection with better prompting
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: "You are an expert multilingual language detector for international shipping. Analyze text carefully and detect the primary language. Common Turkish words: 'masa'=table, 'seti'=set, 'erkek'=men, 'elbise'=dress/clothing, 'kitap'=book, 'oyuncak'=toy, 'çanta'=bag, 'ayakkabı'=shoe, 'telefon'=phone, 'kılıf'=case, 'kadın'=women, 'çocuk'=children, 'bebek'=baby. Turkish has special characters: ü,ö,ı,ğ,ş,ç,İ. Detect patterns like word structure, grammar, and vocabulary. Be confident in your detection (0.8+ for clear cases). Respond with JSON: { 'language': 'ISO_code', 'confidence': 0.0-1.0, 'reasoning': 'brief_explanation' }"
        },
        {
          role: "user",
          content: `Detect the language: "${text}"`
        }
      ],
      response_format: { type: "json_object" },
      max_tokens: 150,
      temperature: 0.1 // Lower temperature for more consistent detection
    });

    const result = JSON.parse(response.choices[0].message.content || '{}');
    console.log(`OpenAI language detection for "${text}":`, result);
    
    return {
      detectedLanguage: result.language || 'en',
      confidence: Math.max(0, Math.min(1, result.confidence || 0.5)),
      isEnglish: (result.language || 'en').toLowerCase() === 'en'
    };
  } catch (error: any) {
    console.error('Language detection error:', error);
    
    // Enhanced offline fallback detection
    const lowerText = text.toLowerCase();
    
    // Turkish detection patterns
    const turkishChars = /[üöığşçİÜÖĞŞÇ]/;
    const turkishWords = ['masa', 'seti', 'erkek', 'elbise', 'kadın', 'çocuk', 'bebek', 'kitap', 'oyuncak', 'çanta', 'ayakkabı', 'telefon', 'kılıf'];
    
    // Spanish detection patterns
    const spanishWords = ['ropa', 'hombre', 'mujer', 'niño', 'niña', 'vestido', 'camisa', 'pantalón', 'zapatos', 'de', 'para', 'con'];
    
    // French detection patterns
    const frenchWords = ['bonjour', 'monde', 'homme', 'femme', 'enfant', 'robe', 'chemise', 'pantalon', 'chaussures', 'pour', 'avec', 'dans', 'vêtement', 'sac', 'bijou', 'parfum'];
    
    // Check Turkish
    if (turkishChars.test(text) || turkishWords.some(word => lowerText.includes(word))) {
      return {
        detectedLanguage: 'tr',
        confidence: 0.8,
        isEnglish: false
      };
    }
    
    // Check Spanish
    if (spanishWords.some(word => lowerText.includes(word))) {
      return {
        detectedLanguage: 'es',
        confidence: 0.7,
        isEnglish: false
      };
    }
    
    // Check French
    if (frenchWords.some(word => lowerText.includes(word))) {
      return {
        detectedLanguage: 'fr',
        confidence: 0.7,
        isEnglish: false
      };
    }
    
    // Default to English if no patterns match
    return {
      detectedLanguage: 'en',
      confidence: 0.6,
      isEnglish: true
    };
  }
}

/**
 * Translate text to English with language detection
 */
export async function translateToEnglish(text: string): Promise<TranslationResult> {
  try {
    if (!text || text.trim().length === 0) {
      return {
        originalText: text,
        translatedText: text,
        detectedLanguage: 'en',
        confidence: 1.0,
        needsTranslation: false
      };
    }

    // First detect the language
    const detection = await detectLanguage(text);
    
    // If it's already English (with reasonable confidence), no translation needed
    if (detection.isEnglish && detection.confidence > 0.6) {
      return {
        originalText: text,
        translatedText: text,
        detectedLanguage: detection.detectedLanguage,
        confidence: detection.confidence,
        needsTranslation: false
      };
    }

    // Enhanced OpenAI translation with comprehensive error handling
    try {
      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: "You are an expert translator for international shipping customs. Translate non-English product names to clear, customs-friendly English. Key Turkish vocabulary: 'masa'=table, 'seti'=set, 'erkek'=men/male, 'elbise'=dress/clothing, 'kadın'=women/female, 'çocuk'=children, 'bebek'=baby, 'kitap'=book, 'oyuncak'=toy, 'çanta'=bag, 'ayakkabı'=shoe, 'telefon'=phone, 'kılıf'=case, 'takım'=set/suit. Provide accurate, professional translations. Respond with JSON: { 'translated': 'english_translation', 'original_language': 'ISO_language_code', 'confidence': 0.0-1.0 }"
          },
          {
            role: "user",
            content: `Translate this product name to English: "${text}"`
          }
        ],
        response_format: { type: "json_object" },
        max_tokens: 200,
        temperature: 0.2
      });

      const result = JSON.parse(response.choices[0].message.content || '{}');
      console.log(`OpenAI translation for "${text}":`, result);
      
      const detectedLang = result.original_language || detection.detectedLanguage;
      const translatedText = result.translated || text;
      
      return {
        originalText: text,
        translatedText: translatedText,
        detectedLanguage: detectedLang,
        confidence: Math.max(detection.confidence, result.confidence || 0.8),
        needsTranslation: detectedLang !== 'en' && translatedText !== text
      };
    } catch (apiError: any) {
      console.error('OpenAI API error during translation:', apiError);
      
      // Try free translation services before falling back to offline dictionary
      if (detection.detectedLanguage !== 'en') {
        console.log('Trying free translation services...');
        
        // Try LibreTranslate first
        const libreResult = await tryLibreTranslate(text, detection.detectedLanguage);
        if (libreResult && libreResult !== text) {
          return {
            originalText: text,
            translatedText: libreResult,
            detectedLanguage: detection.detectedLanguage,
            confidence: detection.confidence,
            needsTranslation: true,
            error: 'Using LibreTranslate (OpenAI quota exceeded)'
          };
        }
        
        // Try MyMemory as second option
        const myMemoryResult = await tryMyMemory(text, detection.detectedLanguage);
        if (myMemoryResult && myMemoryResult !== text) {
          return {
            originalText: text,
            translatedText: myMemoryResult,
            detectedLanguage: detection.detectedLanguage,
            confidence: detection.confidence,
            needsTranslation: true,
            error: 'Using MyMemory (OpenAI quota exceeded)'
          };
        }
      }
      
      console.log('Free services failed, using offline dictionary...');
      
      // Comprehensive offline translation dictionary as final fallback
      const offlineTranslations: Record<string, Record<string, string>> = {
        'tr': {
          'masa': 'table',
          'seti': 'set',
          'masa seti': 'table set',
          'erkek': 'men',
          'elbise': 'dress',
          'erkek elbise': 'men clothing',
          'kadın': 'women',
          'çocuk': 'children',
          'bebek': 'baby',
          'kitap': 'book',
          'oyuncak': 'toy',
          'çanta': 'bag',
          'ayakkabı': 'shoe',
          'telefon': 'phone',
          'kılıf': 'case'
        },
        'es': {
          'ropa': 'clothing',
          'hombre': 'man',
          'ropa de hombre': 'men clothing',
          'mujer': 'woman',
          'ropa de mujer': 'women clothing',
          'niño': 'boy',
          'niña': 'girl',
          'vestido': 'dress',
          'camisa': 'shirt',
          'pantalón': 'pants',
          'zapatos': 'shoes'
        },
        'fr': {
          'homme': 'man',
          'femme': 'woman',
          'enfant': 'child',
          'robe': 'dress',
          'chemise': 'shirt',
          'pantalon': 'pants',
          'chaussures': 'shoes'
        }
      };
      
      // Use offline translation based on detected language
      const langTranslations = offlineTranslations[detection.detectedLanguage] || {};
      const lowerText = text.toLowerCase();
      
      // Try exact match first
      let translation = langTranslations[lowerText];
      
      // If no exact match, try word-by-word translation
      if (!translation && detection.detectedLanguage !== 'en') {
        const words = lowerText.split(' ');
        const translatedWords = words.map(word => langTranslations[word] || word);
        
        // Only use word-by-word if we translated at least one word
        if (translatedWords.some((word, index) => word !== words[index])) {
          translation = translatedWords.join(' ');
        }
      }
      
      // Return translation result
      return {
        originalText: text,
        translatedText: translation || text,
        detectedLanguage: detection.detectedLanguage,
        confidence: detection.confidence,
        needsTranslation: detection.detectedLanguage !== 'en' && !!translation,
        error: apiError?.status === 429 ? 'Using offline translation (API quota exceeded)' : undefined
      };
    }
  } catch (error) {
    console.error('Translation error:', error);
    // Return original text if translation fails
    return {
      originalText: text,
      translatedText: text,
      detectedLanguage: 'unknown',
      confidence: 0.0,
      needsTranslation: false
    };
  }
}

/**
 * Get language name from language code
 */
export function getLanguageName(languageCode: string): string {
  const languages: { [key: string]: string } = {
    'en': 'English',
    'es': 'Spanish',
    'fr': 'French',
    'de': 'German',
    'it': 'Italian',
    'pt': 'Portuguese',
    'ru': 'Russian',
    'ja': 'Japanese',
    'ko': 'Korean',
    'zh': 'Chinese',
    'ar': 'Arabic',
    'hi': 'Hindi',
    'tr': 'Turkish',
    'nl': 'Dutch',
    'sv': 'Swedish',
    'da': 'Danish',
    'no': 'Norwegian',
    'fi': 'Finnish',
    'pl': 'Polish',
    'cs': 'Czech',
    'hu': 'Hungarian',
    'ro': 'Romanian',
    'bg': 'Bulgarian',
    'hr': 'Croatian',
    'sk': 'Slovak',
    'sl': 'Slovenian',
    'et': 'Estonian',
    'lv': 'Latvian',
    'lt': 'Lithuanian',
    'el': 'Greek',
    'he': 'Hebrew',
    'th': 'Thai',
    'vi': 'Vietnamese',
    'id': 'Indonesian',
    'ms': 'Malay',
    'tl': 'Filipino',
    'uk': 'Ukrainian',
    'be': 'Belarusian',
    'ka': 'Georgian',
    'am': 'Amharic',
    'sw': 'Swahili',
    'zu': 'Zulu',
    'xh': 'Xhosa',
    'af': 'Afrikaans'
  };
  
  return languages[languageCode.toLowerCase()] || languageCode.toUpperCase();
}