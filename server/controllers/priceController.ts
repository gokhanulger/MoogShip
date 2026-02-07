import { Request, Response } from 'express';
import { z } from 'zod';
// ServiceLevel enum definition
enum ServiceLevel {
  STANDARD = 'standard',
  EXPRESS = 'express', 
  PRIORITY = 'priority'
}
import { calculateCombinedPricing } from '../services/moogship-pricing';
import USITCDutyService from '../services/usitc-duty-rates';

const priceCalculationSchema = z.object({
  senderPostalCode: z.string().min(1, "Sender postal code is required"),
  senderCity: z.string().min(1, "Sender city is required"),
  receiverPostalCode: z.string().min(1, "Receiver postal code is required"),
  receiverCity: z.string().min(1, "Receiver city is required"),
  receiverCountry: z.string().length(2, "Receiver country must be a 2-letter code"),
  packageLength: z.coerce.number().positive({
    message: "Package length is required and must be a positive number. Please enter package dimensions."
  }),
  packageWidth: z.coerce.number().positive({
    message: "Package width is required and must be a positive number. Please enter package dimensions."
  }),
  packageHeight: z.coerce.number().positive({
    message: "Package height is required and must be a positive number. Please enter package dimensions."
  }),
  packageWeight: z.coerce.number().positive({
    message: "Package weight is required and must be a positive number. Please enter package weight."
  }),
  pieceCount: z.coerce.number().int().positive().default(1),
  serviceLevel: z.enum([ServiceLevel.STANDARD, ServiceLevel.EXPRESS, ServiceLevel.PRIORITY]),
  userId: z.number().optional(),
  includeInsurance: z.boolean().optional().default(false),
  customsValue: z.number().optional(),
  productName: z.string().optional(),
  productDescription: z.string().optional(),
  hsCode: z.string().optional(),
  dutyProvider: z.enum(['easyship', 'ups', 'both']).optional().default('ups'),
  shippingTerms: z.enum(['dap', 'ddp']).optional().default('dap'),
  selectedService: z.string().optional(),
  useCustomerService: z.boolean().optional().default(false),
  originalSelectedService: z.string().optional(),
  originalServiceLevel: z.string().optional(),
  originalShippingProvider: z.string().optional(),
  originalCarrierName: z.string().optional()
});

export const calculatePrice = async (req: Request, res: Response) => {
  try {
    // Validate request body
    const result = priceCalculationSchema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({ 
        message: 'Invalid request data', 
        errors: result.error.errors,
        receivedData: req.body
      });
    }

    const data = result.data;
    
    // Get pricing: external (Navlungo) first, Ship Entegra fallback
    const combinedResult = await calculateCombinedPricing(
      data.packageLength,
      data.packageWidth,
      data.packageHeight,
      data.packageWeight,
      data.receiverCountry,
      1.0,       // userMultiplier (this endpoint doesn't apply multiplier)
      false,     // skipMultiplier
      data.userId
    );

    // Backward-compatible flat format (frontend expects totalPrice, basePrice at top level)
    const bestOption = combinedResult.options?.[0];
    const priceData = {
      success: combinedResult.success,
      options: combinedResult.options || [],
      bestOption: combinedResult.bestOption,
      currency: combinedResult.currency || 'USD',
      rawApiResponses: combinedResult.rawApiResponses,
      // Legacy top-level fields for frontend compatibility
      basePrice: bestOption?.cargoPrice || 0,
      fuelCharge: bestOption?.fuelCost || 0,
      totalPrice: bestOption?.totalPrice || 0,
      estimatedDeliveryDays: bestOption ? (parseInt(bestOption.deliveryTime) || 5) : 5,
      carrierName: bestOption?.displayName || 'MoogShip',
    };

    if (!priceData.success || !priceData.totalPrice) {
      return res.status(500).json({
        message: 'Failed to calculate shipping price - no pricing available'
      });
    }

    // Calculate duties ONLY for US destinations
    let dutiesData = null;
    const destinationCountry = data.receiverCountry;
    
    if (destinationCountry === 'US' && data.hsCode && data.customsValue) {
      try {
        console.log(`[DUTY CALC] Calculating duties for TR → US, HS Code: ${data.hsCode}`);
        
        const usitcService = new USITCDutyService();
        const usitcResult = await usitcService.getDutyRateAndAmount(
          data.hsCode, 
          data.customsValue
        );
        
        if (usitcResult.dutyRate && usitcResult.dutyRate.code) {
          // Calculate DDP processing fee if DDP terms selected
          const ddpProcessingFee = data.shippingTerms === 'ddp' ? 450 : 0; // $4.50 in cents
          const dutyAmountCents = Math.round(usitcResult.dutyAmount * 100);
          const totalWithDDPFee = dutyAmountCents + ddpProcessingFee;
          
          dutiesData = {
            available: true,
            provider: 'USITC',
            shippingTerms: data.shippingTerms || 'dap',
            duty: dutyAmountCents,
            tax: 0,
            total: dutyAmountCents,
            ddpProcessingFee: ddpProcessingFee,
            totalWithDDPFee: totalWithDDPFee,
            dutyRate: usitcResult.dutyRate.dutyPercentage,
            hsCode: data.hsCode,
            formattedDuty: new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(usitcResult.dutyAmount),
            formattedTax: new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(0),
            formattedTotal: new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(usitcResult.dutyAmount),
            formattedDDPProcessingFee: new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(ddpProcessingFee / 100),
            formattedTotalWithDDPFee: new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(totalWithDDPFee / 100),
            customsValue: data.customsValue,
            message: `Official US duty rate: ${((usitcResult.dutyRate.dutyPercentage || 0) * 100).toFixed(1)}%`,
            note: `Official USITC duty rates. ${data.shippingTerms === 'ddp' ? 'DDP processing fee included.' : ''} Final amounts may vary.`
          };
          
          console.log(`💰 USITC calculated duties: Rate=${((usitcResult.dutyRate.dutyPercentage || 0) * 100).toFixed(1)}%, Duty=$${usitcResult.dutyAmount.toFixed(2)} (official)`);
        }
      } catch (error) {
        console.error('[USITC] Error calculating duties:', error);
        dutiesData = {
          available: false,
          provider: 'USITC',
          message: 'Error calculating duties with USITC parser',
          customsValue: data.customsValue
        };
      }
    } else {
      // For non-US destinations, no customs calculation
      console.log(`[DUTY CALC] Skipping customs calculation for non-US destination: ${destinationCountry}`);
      dutiesData = {
        available: false,
        message: 'Customs calculations are only available for US destinations',
        customsValue: data.customsValue || 0
      };
    }

    // Return response
    const responseData = {
      ...priceData,
      appliedMultiplier: 1,
      pieceCount: data.pieceCount,
      duties: dutiesData,
      dutyCalculations: dutiesData
    };

    return res.status(200).json(responseData);
  } catch (error) {
    console.error('Error in calculatePrice:', error);
    return res.status(500).json({ message: 'Failed to calculate shipping price' });
  }
};

export const getUSITCDutyRate = async (req: Request, res: Response) => {
  try {
    const { hsCode, customsValue } = req.query;

    if (!hsCode || typeof hsCode !== 'string') {
      return res.status(400).json({ 
        error: 'HS code is required',
        message: 'Please provide a valid HS code' 
      });
    }

    console.log(`[USITC API] Getting duty rate for HS code: ${hsCode}`);

    const usitcService = new USITCDutyService();
    const customsValueNumber = customsValue ? Number(customsValue) : 0;
    const usitcResult = await usitcService.getDutyRateAndAmount(hsCode, customsValueNumber);

    if (!usitcResult.dutyRate) {
      return res.status(404).json({
        error: 'HS code not found',
        message: 'No duty rate information found for this HS code',
        hsCode: hsCode
      });
    }

    return res.status(200).json({
      success: true,
      hsCode: hsCode,
      description: usitcResult.dutyRate.description || `Product classified under HS code ${hsCode}`,
      dutyRate: {
        text: usitcResult.dutyRate.text,
        percentage: usitcResult.dutyRate.dutyPercentage
      },
      calculation: {
        customsValue: customsValueNumber,
        baseDutyAmount: Math.round(usitcResult.dutyAmount * 100),
        trumpTariffAmount: Math.round((usitcResult.dutyAmount * 0.15) * 100),
        totalDutyAmount: Math.round(usitcResult.dutyAmount * 100)
      }
    });
  } catch (error) {
    console.error('[USITC API] Error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to calculate duty rate'
    });
  }
};