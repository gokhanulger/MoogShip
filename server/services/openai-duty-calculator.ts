/**
 * OpenAI-powered Duty and Tax Calculator
 * 
 * Uses ChatGPT to determine duty rates, tax rates, and other import costs
 * based on HS codes, origin/destination countries, and product information.
 * This serves as an intelligent fallback when other APIs timeout or fail.
 */

import OpenAI from "openai";

// the newest OpenAI model is "gpt-5" which was released August 7, 2025. do not change this unless explicitly requested by the user
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

interface DutyCalculationInput {
  hsCode?: string;
  productDescription: string;
  originCountry: string;
  destinationCountry: string;
  productValue: number; // in USD
  shippingCost?: number; // in USD
  productWeight?: number; // in kg
}

interface DutyCalculationResult {
  success: boolean;
  provider: 'OpenAI';
  currency: 'USD';
  dutyRate?: number; // percentage (e.g., 15.5 for 15.5%)
  taxRate?: number; // percentage
  vatRate?: number; // percentage
  estimatedDuty?: number; // in USD
  estimatedTax?: number; // in USD
  estimatedVAT?: number; // in USD
  totalEstimatedCost?: number; // in USD
  confidence?: number; // 0-1 scale
  reasoning?: string;
  error?: string;
  hsCodeUsed?: string;
  dataSource?: string;
}

class OpenAIDutyCalculator {
  
  /**
   * Calculate duty and tax rates using OpenAI's knowledge base
   */
  async calculateDutyRates(input: DutyCalculationInput): Promise<DutyCalculationResult> {
    try {
      if (!process.env.OPENAI_API_KEY) {
        throw new Error('OpenAI API key not configured');
      }

      // Construct the prompt for ChatGPT
      const prompt = this.buildDutyCalculationPrompt(input);

      console.log(`[OPENAI DUTY] Calculating duties for ${input.productDescription} from ${input.originCountry} to ${input.destinationCountry}`);
      
      const response = await openai.chat.completions.create({
        model: "gpt-5", // the newest OpenAI model is "gpt-5" which was released August 7, 2025. do not change this unless explicitly requested by the user
        messages: [
          {
            role: "system",
            content: "You are a customs and international trade expert. Provide accurate duty and tax rate estimates based on HS codes, product descriptions, and country trade agreements. Always respond in JSON format."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        response_format: { type: "json_object" },
        max_completion_tokens: 1000
      });

      const result = JSON.parse(response.choices[0].message.content || '{}');
      
      // Validate and process the response
      return this.processOpenAIResponse(result, input);
      
    } catch (error) {
      console.error('[OPENAI DUTY] Error calculating duties:', error);
      return {
        success: false,
        provider: 'OpenAI',
        currency: 'USD',
        error: error instanceof Error ? error.message : 'Unknown error calculating duties with OpenAI'
      };
    }
  }

  /**
   * Build a detailed prompt for ChatGPT to calculate duty rates
   */
  private buildDutyCalculationPrompt(input: DutyCalculationInput): string {
    return `
Calculate the import duty and tax rates for the following shipment:

Product Information:
- Description: ${input.productDescription}
- HS Code: ${input.hsCode || 'Not provided - please suggest appropriate HS code'}
- Value: $${input.productValue} USD
- Weight: ${input.productWeight || 'Unknown'} kg
- Shipping Cost: $${input.shippingCost || 0} USD

Trade Route:
- Origin Country: ${input.originCountry}
- Destination Country: ${input.destinationCountry}

Please provide accurate duty and tax rate estimates based on:
1. Current trade agreements between these countries
2. The specific HS code classification
3. Standard import duty rates
4. VAT/GST rates if applicable
5. Any additional taxes or fees

Respond in JSON format with this exact structure:
{
  "hsCodeUsed": "suggested or confirmed HS code",
  "dutyRate": number (percentage, e.g., 15.5 for 15.5%),
  "taxRate": number (percentage for import tax),
  "vatRate": number (percentage for VAT/GST),
  "estimatedDuty": number (in USD),
  "estimatedTax": number (in USD),
  "estimatedVAT": number (in USD),
  "totalEstimatedCost": number (total duties + taxes in USD),
  "confidence": number (0-1 scale of estimate accuracy),
  "reasoning": "brief explanation of rates and calculations",
  "dataSource": "trade agreements, standard rates, etc.",
  "warnings": "any important notes or disclaimers"
}

Focus on accuracy and include any relevant trade agreement information (USMCA, EU trade deals, etc.).
`.trim();
  }

  /**
   * Process and validate OpenAI response
   */
  private processOpenAIResponse(aiResponse: any, input: DutyCalculationInput): DutyCalculationResult {
    try {
      // Extract rates and calculate amounts
      const dutyRate = parseFloat(aiResponse.dutyRate) || 0;
      const taxRate = parseFloat(aiResponse.taxRate) || 0;
      const vatRate = parseFloat(aiResponse.vatRate) || 0;
      
      // Calculate duty amounts based on product value
      const dutyBase = input.productValue;
      const estimatedDuty = (dutyBase * dutyRate) / 100;
      const estimatedTax = (dutyBase * taxRate) / 100;
      const estimatedVAT = ((dutyBase + estimatedDuty) * vatRate) / 100; // VAT often calculated on goods + duty
      
      const totalEstimatedCost = estimatedDuty + estimatedTax + estimatedVAT;
      
      console.log(`[OPENAI DUTY] Calculated rates - Duty: ${dutyRate}%, Tax: ${taxRate}%, VAT: ${vatRate}%`);
      console.log(`[OPENAI DUTY] Estimated costs - Duty: $${estimatedDuty.toFixed(2)}, Tax: $${estimatedTax.toFixed(2)}, VAT: $${estimatedVAT.toFixed(2)}`);
      
      return {
        success: true,
        provider: 'OpenAI',
        currency: 'USD',
        dutyRate,
        taxRate,
        vatRate,
        estimatedDuty,
        estimatedTax,
        estimatedVAT,
        totalEstimatedCost,
        confidence: parseFloat(aiResponse.confidence) || 0.7,
        reasoning: aiResponse.reasoning || 'AI-estimated duty rates',
        hsCodeUsed: aiResponse.hsCodeUsed || input.hsCode,
        dataSource: aiResponse.dataSource || 'OpenAI knowledge base'
      };
      
    } catch (error) {
      console.error('[OPENAI DUTY] Error processing AI response:', error);
      return {
        success: false,
        provider: 'OpenAI',
        currency: 'USD',
        error: 'Failed to process AI response'
      };
    }
  }

  /**
   * Get HS code suggestion for a product description
   */
  async suggestHSCode(productDescription: string, originCountry?: string): Promise<{ hsCode?: string; confidence?: number; reasoning?: string }> {
    try {
      const prompt = `
Suggest the most appropriate HS code for this product:

Product: ${productDescription}
Origin Country: ${originCountry || 'Unknown'}

Provide the 6-digit HS code that best matches this product for international trade classification.

Respond in JSON format:
{
  "hsCode": "6-digit HS code",
  "confidence": number (0-1 scale),
  "reasoning": "explanation of why this HS code fits",
  "alternativeHSCodes": ["list", "of", "possible", "alternatives"]
}
`;

      const response = await openai.chat.completions.create({
        model: "gpt-5", // the newest OpenAI model is "gpt-5" which was released August 7, 2025. do not change this unless explicitly requested by the user
        messages: [
          {
            role: "system",
            content: "You are an HS code classification expert. Provide accurate HS code suggestions for international trade."
          },
          {
            role: "user", 
            content: prompt
          }
        ],
        response_format: { type: "json_object" },
        max_completion_tokens: 500
      });

      const result = JSON.parse(response.choices[0].message.content || '{}');
      return {
        hsCode: result.hsCode,
        confidence: result.confidence,
        reasoning: result.reasoning
      };
      
    } catch (error) {
      console.error('[OPENAI DUTY] Error suggesting HS code:', error);
      return {};
    }
  }
}

export const openAIDutyCalculator = new OpenAIDutyCalculator();
export { DutyCalculationInput, DutyCalculationResult };