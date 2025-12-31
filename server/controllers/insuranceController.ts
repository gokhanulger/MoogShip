import { Request, Response } from 'express';
import { storage } from '../storage';

// Placeholder functions for missing exports
export async function createInsuranceRange(req: Request, res: Response) {
  res.status(501).json({ message: 'Not implemented yet' });
}

export async function getAllInsuranceRanges(req: Request, res: Response) {
  try {
    const ranges = await storage.getActiveInsuranceRanges();
    res.json(ranges);
  } catch (error) {
    console.error('Error fetching insurance ranges:', error);
    res.status(500).json({ message: 'Failed to fetch insurance ranges' });
  }
}

export async function getInsuranceRangeById(req: Request, res: Response) {
  res.status(501).json({ message: 'Not implemented yet' });
}

export async function updateInsuranceRange(req: Request, res: Response) {
  res.status(501).json({ message: 'Not implemented yet' });
}

export async function deleteInsuranceRange(req: Request, res: Response) {
  res.status(501).json({ message: 'Not implemented yet' });
}

export async function calculateInsuranceCost(req: Request, res: Response) {
  try {
    const { insuranceValue } = req.query;
    
    if (!insuranceValue || isNaN(Number(insuranceValue))) {
      return res.status(400).json({ message: 'Invalid insurance value' });
    }

    const valueInCents = Number(insuranceValue);
    
    // Get insurance ranges from database
    const insuranceRanges = await storage.getActiveInsuranceRanges();
    
    // Find the appropriate range for the value
    const applicableRange = insuranceRanges.find(range => 
      valueInCents >= range.minValue && valueInCents <= range.maxValue
    );
    
    if (!applicableRange) {
      // Default calculation if no range found (2% of value with minimum $5)
      const calculatedCost = Math.max(Math.round(valueInCents * 0.02), 500); // 2% minimum $5
      return res.json({
        cost: calculatedCost,
        valueInCents,
        calculationMethod: 'default',
        percentage: 2.0
      });
    }
    
    res.json({
      cost: applicableRange.insuranceCost,
      valueInCents,
      rangeId: applicableRange.id,
      minValue: applicableRange.minValue,
      maxValue: applicableRange.maxValue
    });
    
  } catch (error) {
    console.error('Error calculating insurance cost:', error);
    res.status(500).json({ message: 'Failed to calculate insurance cost' });
  }
}