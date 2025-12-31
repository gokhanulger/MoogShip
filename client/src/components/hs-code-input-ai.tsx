import React, { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  Search, 
  Sparkles, 
  CheckCircle, 
  AlertTriangle,
  Loader2,
  Brain,
  ThumbsUp,
  ThumbsDown
} from 'lucide-react';
import { HSCodeSearchDialog } from './hs-code-search-dialog';
import { useTranslation } from 'react-i18next';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

interface HSCodeInputAIProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  productName?: string;
  productDescription?: string;
  material?: string;
  category?: string;
  productValue?: number;
  weight?: number;
  dimensions?: {
    length: number;
    width: number;
    height: number;
  };
}

interface AISuggestion {
  hsCode: string;
  description: string;
  confidence: number;
  reasoning: string;
  alternativeCodes?: { code: string; description: string; confidence: number }[];
}

export function HSCodeInputAI({ 
  value, 
  onChange, 
  placeholder,
  className = "",
  disabled = false,
  productName,
  productDescription,
  material,
  category,
  productValue,
  weight,
  dimensions
}: HSCodeInputAIProps) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [aiSuggestion, setAiSuggestion] = useState<AISuggestion | null>(null);
  const [isLoadingAI, setIsLoadingAI] = useState(false);
  const [showAISuggestions, setShowAISuggestions] = useState(false);
  const [validationResult, setValidationResult] = useState<{
    isValid: boolean;
    confidence: number;
    feedback: string;
  } | null>(null);

  // Auto-suggest when product details are available
  useEffect(() => {
    if (productName && productName.length > 3 && !aiSuggestion && !isLoadingAI) {
      handleAISuggestion();
    }
  }, [productName, productDescription, material, category]);

  // Validate HS code when it changes
  useEffect(() => {
    if (value && value.length === 6 && productName) {
      handleHSCodeValidation();
    } else {
      setValidationResult(null);
    }
  }, [value, productName]);

  const handleAISuggestion = async () => {
    if (!productName) {
      toast({
        title: "Product Name Required",
        description: "Please enter a product name to get AI suggestions",
        variant: "destructive"
      });
      return;
    }

    setIsLoadingAI(true);
    try {
      const itemDetails = {
        name: productName,
        description: productDescription,
        material,
        category,
        value: productValue,
        weight,
        dimensions
      };

      const response = await fetch('/api/hs-codes/suggest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(itemDetails)
      });
      
      if (!response.ok) {
        throw new Error('Failed to get AI suggestion');
      }
      
      const suggestion = await response.json();

      setAiSuggestion(suggestion);
      setShowAISuggestions(true);
      
      toast({
        title: "AI Suggestion Ready",
        description: `Found HS code ${suggestion.hsCode} with ${Math.round(suggestion.confidence * 100)}% confidence`,
      });
    } catch (error) {
      console.error('Failed to get AI suggestion:', error);
      toast({
        title: "AI Suggestion Failed",
        description: "Could not generate HS code suggestion. Please try manual search.",
        variant: "destructive"
      });
    } finally {
      setIsLoadingAI(false);
    }
  };

  const handleHSCodeValidation = async () => {
    if (!value || !productName) return;

    try {
      const itemDetails = {
        name: productName,
        description: productDescription,
        material
      };

      const response = await fetch('/api/hs-codes/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ hsCode: value, itemDetails })
      });
      
      if (!response.ok) {
        throw new Error('Failed to validate HS code');
      }
      
      const validation = await response.json();

      setValidationResult(validation);
    } catch (error) {
      console.error('Failed to validate HS code:', error);
    }
  };

  const acceptAISuggestion = (hsCode: string) => {
    onChange(hsCode);
    setShowAISuggestions(false);
    toast({
      title: "HS Code Applied",
      description: `Applied AI suggested HS code: ${hsCode}`,
    });
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return 'text-green-600 bg-green-50 border-green-200';
    if (confidence >= 0.6) return 'text-yellow-600 bg-yellow-50 border-yellow-200';
    return 'text-red-600 bg-red-50 border-red-200';
  };

  const getConfidenceLabel = (confidence: number) => {
    if (confidence >= 0.8) return 'High Confidence';
    if (confidence >= 0.6) return 'Medium Confidence';
    return 'Low Confidence';
  };

  return (
    <div className={`space-y-3 ${className}`}>
      {/* Main HS Code Input */}
      <div className="relative flex gap-2">
        <div className="flex-1">
          <Input
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder || "Enter 6-digit HS Code"}
            disabled={disabled}
            className={`w-full h-9 ${
              validationResult?.isValid === false ? 'border-red-300 focus:border-red-500' :
              validationResult?.isValid === true ? 'border-green-300 focus:border-green-500' : ''
            }`}
          />
          
          {/* Validation Indicator */}
          {validationResult && (
            <div className="absolute right-2 top-2">
              {validationResult.isValid ? (
                <CheckCircle className="h-5 w-5 text-green-500" />
              ) : (
                <AlertTriangle className="h-5 w-5 text-red-500" />
              )}
            </div>
          )}
        </div>
        
        {/* AI Suggestion Button */}
        <Button 
          type="button"
          variant="outline" 
          size="sm"
          disabled={disabled || isLoadingAI || !productName}
          onClick={handleAISuggestion}
          className="shrink-0 h-9"
          title="Get AI HS Code Suggestion"
        >
          {isLoadingAI ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Brain className="h-4 w-4" />
          )}
          {!isLoadingAI && <span className="ml-1">AI</span>}
        </Button>
        
        {/* Manual Search Button */}
        <HSCodeSearchDialog
          open={isDialogOpen}
          onOpenChange={setIsDialogOpen}
          onSelect={(hsCode) => onChange(hsCode)}
          trigger={
            <Button 
              type="button"
              variant="outline" 
              size="icon" 
              className="shrink-0 h-9 w-9"
              disabled={disabled}
              title="Manual HS Code Search"
            >
              <Search className="h-4 w-4" />
            </Button>
          }
        />
      </div>

      {/* Validation Feedback */}
      {validationResult && (
        <div className={`text-sm p-2 rounded-md border ${
          validationResult.isValid ? 'text-green-700 bg-green-50 border-green-200' : 'text-red-700 bg-red-50 border-red-200'
        }`}>
          <div className="flex items-center gap-2">
            {validationResult.isValid ? (
              <CheckCircle className="h-4 w-4" />
            ) : (
              <AlertTriangle className="h-4 w-4" />
            )}
            <span className="font-medium">
              {validationResult.isValid ? 'Valid HS Code' : 'Invalid HS Code'}
            </span>
            <Badge variant="secondary" className="text-xs">
              {Math.round(validationResult.confidence * 100)}% confidence
            </Badge>
          </div>
          <p className="mt-1 text-xs">{validationResult.feedback}</p>
        </div>
      )}

      {/* AI Suggestions Panel */}
      {showAISuggestions && aiSuggestion && (
        <Card className="border-blue-200 bg-blue-50">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-blue-600" />
              AI HS Code Suggestion
              <Badge className={`text-xs ${getConfidenceColor(aiSuggestion.confidence)}`}>
                {getConfidenceLabel(aiSuggestion.confidence)}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {/* Main Suggestion */}
            <div className="flex items-center justify-between p-3 bg-white rounded-lg border">
              <div className="flex-1">
                <div className="font-mono text-lg font-bold text-blue-600">
                  {aiSuggestion.hsCode}
                </div>
                <div className="text-sm text-gray-600 mt-1">
                  {aiSuggestion.description}
                </div>
                <div className="text-xs text-gray-500 mt-2">
                  <strong>Reasoning:</strong> {aiSuggestion.reasoning}
                </div>
              </div>
              <div className="flex gap-2 ml-4">
                <Button
                  size="sm"
                  onClick={() => acceptAISuggestion(aiSuggestion.hsCode)}
                  className="h-8"
                >
                  <ThumbsUp className="h-3 w-3 mr-1" />
                  Use This
                </Button>
              </div>
            </div>

            {/* Alternative Suggestions */}
            {aiSuggestion.alternativeCodes && aiSuggestion.alternativeCodes.length > 0 && (
              <>
                <Separator />
                <div>
                  <h4 className="text-xs font-medium text-gray-700 mb-2">Alternative Options</h4>
                  <div className="space-y-2">
                    {aiSuggestion.alternativeCodes.map((alt, index) => (
                      <div key={index} className="flex items-center justify-between p-2 bg-white rounded border">
                        <div className="flex-1">
                          <div className="font-mono text-sm font-medium">{alt.code}</div>
                          <div className="text-xs text-gray-600">{alt.description}</div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-xs">
                            {Math.round(alt.confidence * 100)}%
                          </Badge>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => acceptAISuggestion(alt.code)}
                            className="h-6 text-xs"
                          >
                            Use
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}

            {/* Actions */}
            <div className="flex justify-end gap-2 pt-2">
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setShowAISuggestions(false)}
              >
                <ThumbsDown className="h-3 w-3 mr-1" />
                Dismiss
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Helper Text */}
      {!productName && (
        <div className="text-xs text-gray-500">
          💡 Enter product details above to get AI-powered HS code suggestions
        </div>
      )}
    </div>
  );
}