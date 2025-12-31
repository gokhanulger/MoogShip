import { useState } from 'react';
import Layout from '@/components/layout';
import { ProductNameTranslator } from '@/components/product-name-translator';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  Languages, 
  Globe, 
  CheckCircle2, 
  ArrowRight,
  Sparkles
} from 'lucide-react';

interface TranslationResult {
  originalText: string;
  translatedText: string;
  detectedLanguage: string;
  confidence: number;
  needsTranslation: boolean;
}

export default function TranslationDemo() {
  const [productName, setProductName] = useState('');
  const [translationHistory, setTranslationHistory] = useState<TranslationResult[]>([]);

  const handleTranslation = (translation: TranslationResult) => {
    setTranslationHistory(prev => [translation, ...prev].slice(0, 10)); // Keep last 10 translations
  };

  const sampleTexts = [
    { text: 'Smartphone Samsung Galaxy', lang: 'English' },
    { text: 'Ordinateur portable Dell', lang: 'French' },
    { text: 'Zapatos deportivos Nike', lang: 'Spanish' },
    { text: 'Drahtlose Kopfhörer', lang: 'German' },
    { text: 'MacBook Pro 비용', lang: 'Korean' },
    { text: 'iPhone 手机壳', lang: 'Chinese' },
    { text: 'Беспроводная мышь', lang: 'Russian' },
    { text: 'Kablosuz kulaklık', lang: 'Turkish' },
    { text: 'カメラレンズ', lang: 'Japanese' },
    { text: 'کیبورد مکانیکی', lang: 'Persian' }
  ];

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2 mb-4">
            <Languages className="h-8 w-8 text-primary" />
            <h1 className="text-3xl font-bold">Product Name Translation System</h1>
          </div>
          <p className="text-lg text-muted-foreground">
            Automatic language detection and English translation for international shipping customs
          </p>
        </div>

        <div className="grid gap-6">
          {/* Main Translation Interface */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Globe className="h-5 w-5" />
                Try the Translation System
              </CardTitle>
              <CardDescription>
                Enter a product name in any language. The system will automatically detect the language and offer translation to English for customs clarity.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Product Name</label>
                <ProductNameTranslator
                  value={productName}
                  onChange={setProductName}
                  placeholder="Enter product name in any language..."
                  className="text-lg"
                  onTranslation={handleTranslation}
                />
              </div>
              
              {/* Sample texts for quick testing */}
              <div>
                <label className="text-sm font-medium mb-2 block">Quick Test Examples</label>
                <div className="flex flex-wrap gap-2">
                  {sampleTexts.map((sample, index) => (
                    <Button
                      key={index}
                      variant="outline"
                      size="sm"
                      onClick={() => setProductName(sample.text)}
                      className="text-xs"
                    >
                      {sample.text} <Badge variant="secondary" className="ml-1">{sample.lang}</Badge>
                    </Button>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Translation History */}
          {translationHistory.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5" />
                  Translation History
                </CardTitle>
                <CardDescription>
                  Recent translations performed by the system
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {translationHistory.map((translation, index) => (
                    <div key={index} className="border rounded-lg p-4 bg-gray-50">
                      <div className="flex items-center justify-between mb-2">
                        <Badge variant="outline" className="text-xs">
                          {translation.detectedLanguage.toUpperCase()}
                        </Badge>
                        <Badge 
                          variant={translation.confidence > 0.8 ? "default" : translation.confidence > 0.6 ? "secondary" : "destructive"}
                          className="text-xs"
                        >
                          {Math.round(translation.confidence * 100)}% confidence
                        </Badge>
                      </div>
                      
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-muted-foreground">Original:</span>
                          <span className="font-medium">{translation.originalText}</span>
                        </div>
                        
                        {translation.needsTranslation && (
                          <>
                            <div className="flex items-center gap-2 text-muted-foreground">
                              <ArrowRight className="h-3 w-3" />
                              <span className="text-xs">Translated for customs</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-sm text-muted-foreground">English:</span>
                              <span className="font-medium text-green-700">{translation.translatedText}</span>
                              <CheckCircle2 className="h-4 w-4 text-green-600" />
                            </div>
                          </>
                        )}
                        
                        {!translation.needsTranslation && (
                          <div className="flex items-center gap-2 text-green-600">
                            <CheckCircle2 className="h-4 w-4" />
                            <span className="text-sm">Already in English - ready for customs</span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* System Information */}
          <Card>
            <CardHeader>
              <CardTitle>How It Works</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid md:grid-cols-3 gap-4">
                <div className="text-center p-4 border rounded-lg">
                  <Globe className="h-8 w-8 mx-auto mb-2 text-blue-600" />
                  <h3 className="font-semibold mb-1">Language Detection</h3>
                  <p className="text-sm text-muted-foreground">
                    Automatically identifies the language of product names with high accuracy
                  </p>
                </div>
                
                <div className="text-center p-4 border rounded-lg">
                  <Languages className="h-8 w-8 mx-auto mb-2 text-green-600" />
                  <h3 className="font-semibold mb-1">Smart Translation</h3>
                  <p className="text-sm text-muted-foreground">
                    Translates to clear, customs-friendly English when needed
                  </p>
                </div>
                
                <div className="text-center p-4 border rounded-lg">
                  <CheckCircle2 className="h-8 w-8 mx-auto mb-2 text-purple-600" />
                  <h3 className="font-semibold mb-1">Customs Ready</h3>
                  <p className="text-sm text-muted-foreground">
                    Ensures product names are clear for international customs processing
                  </p>
                </div>
              </div>
              
              <Separator />
              
              <div className="space-y-2">
                <h3 className="font-semibold">Supported Languages</h3>
                <p className="text-sm text-muted-foreground">
                  The system supports 40+ languages including Spanish, French, German, Chinese, Japanese, Korean, Arabic, Russian, Turkish, and many more.
                </p>
              </div>
              
              <div className="space-y-2">
                <h3 className="font-semibold">Integration</h3>
                <p className="text-sm text-muted-foreground">
                  This translation system is integrated into the product name input fields throughout the shipping platform, 
                  providing automatic language detection and translation suggestions to improve customs processing efficiency.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
}