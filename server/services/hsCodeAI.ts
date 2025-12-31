import OpenAI from "openai";
import type { ChatCompletionCreateParamsBase } from "openai/resources/chat/completions";

// the newest OpenAI model is "gpt-5" which was released August 7, 2025. do not change this unless explicitly requested by the user
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export interface HSCodeSuggestion {
  hsCode: string;
  description: string;
  confidence: number;
  reasoning: string;
  alternativeCodes?: { code: string; description: string; confidence: number }[];
}

export interface PackageItemDetails {
  name: string;
  description?: string;
  material?: string;
  category?: string;
  value?: number;
  weight?: number;
  dimensions?: {
    length: number;
    width: number;
    height: number;
  };
  origin?: string;
  brand?: string;
  model?: string;
}

export async function suggestHSCode(itemDetails: PackageItemDetails): Promise<HSCodeSuggestion> {
  try {
    const prompt = `You are an expert in international trade and customs classification. Based on the following product details, suggest the most accurate 6-digit HS (Harmonized System) code.

Product Details:
- Name: ${itemDetails.name}
- Description: ${itemDetails.description || 'Not provided'}
- Material: ${itemDetails.material || 'Not specified'}
- Category: ${itemDetails.category || 'Not specified'}
- Value: ${itemDetails.value ? `$${itemDetails.value}` : 'Not provided'}
- Weight: ${itemDetails.weight ? `${itemDetails.weight}kg` : 'Not provided'}
- Dimensions: ${itemDetails.dimensions ? `${itemDetails.dimensions.length}x${itemDetails.dimensions.width}x${itemDetails.dimensions.height}cm` : 'Not provided'}
- Origin: ${itemDetails.origin || 'Not specified'}
- Brand: ${itemDetails.brand || 'Not specified'}
- Model: ${itemDetails.model || 'Not specified'}

Please provide your response in the following JSON format:
{
  "hsCode": "123456",
  "description": "Clear description of what this HS code covers",
  "confidence": 0.95,
  "reasoning": "Detailed explanation of why this HS code is appropriate",
  "alternativeCodes": [
    {
      "code": "123457",
      "description": "Alternative classification description",
      "confidence": 0.75
    }
  ]
}

Requirements:
1. Use only valid 6-digit HS codes (e.g., 123456 format)
2. Confidence should be between 0.1 and 1.0
3. Provide reasoning based on the product characteristics
4. Include 1-3 alternative codes if applicable
5. Consider the material, function, and intended use of the product
6. Be specific about why each code applies`;

    const response = await openai.chat.completions.create({
      model: "gpt-5", // the newest OpenAI model is "gpt-5" which was released August 7, 2025. do not change this unless explicitly requested by the user
      messages: [
        {
          role: "system",
          content: "You are an expert customs and trade specialist with deep knowledge of HS codes and international trade classification. Always respond with valid JSON format."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      response_format: { type: "json_object" },
      temperature: 0.3, // Lower temperature for more consistent results
      max_tokens: 1000
    });

    const result = JSON.parse(response.choices[0].message.content);

    // Validate the response structure
    if (!result.hsCode || !result.description || typeof result.confidence !== 'number') {
      throw new Error('Invalid response format from AI service');
    }

    // Ensure confidence is within valid range
    result.confidence = Math.max(0.1, Math.min(1.0, result.confidence));

    return result as HSCodeSuggestion;
  } catch (error) {
    console.error('Error suggesting HS code:', error);
    throw new Error('Failed to generate HS code suggestion: ' + (error as Error).message);
  }
}

export async function suggestMultipleHSCodes(items: PackageItemDetails[]): Promise<HSCodeSuggestion[]> {
  try {
    const suggestions = await Promise.all(
      items.map(item => suggestHSCode(item))
    );
    return suggestions;
  } catch (error) {
    console.error('Error suggesting multiple HS codes:', error);
    throw new Error('Failed to generate HS code suggestions for multiple items');
  }
}

export async function validateHSCode(hsCode: string, itemDetails: PackageItemDetails): Promise<{
  isValid: boolean;
  confidence: number;
  feedback: string;
  suggestedCode?: string;
}> {
  try {
    const prompt = `You are an expert in HS code validation. Please validate if the provided HS code is appropriate for the given product.

Product Details:
- Name: ${itemDetails.name}
- Description: ${itemDetails.description || 'Not provided'}
- Material: ${itemDetails.material || 'Not specified'}

Provided HS Code: ${hsCode}

Please respond with JSON format:
{
  "isValid": true/false,
  "confidence": 0.95,
  "feedback": "Detailed explanation of validation result",
  "suggestedCode": "123456" (only if isValid is false)
}`;

    const response = await openai.chat.completions.create({
      model: "gpt-5", // the newest OpenAI model is "gpt-5" which was released August 7, 2025. do not change this unless explicitly requested by the user
      messages: [
        {
          role: "system",
          content: "You are an expert customs specialist validating HS code classifications. Always respond with valid JSON."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      response_format: { type: "json_object" },
      temperature: 0.2,
      max_tokens: 500
    });

    const result = JSON.parse(response.choices[0].message.content);
    result.confidence = Math.max(0.1, Math.min(1.0, result.confidence || 0.5));

    return result;
  } catch (error) {
    console.error('Error validating HS code:', error);
    throw new Error('Failed to validate HS code: ' + (error as Error).message);
  }
}