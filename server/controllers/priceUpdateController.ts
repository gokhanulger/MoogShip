import { Request, Response } from 'express';
import { pool, db } from '../db';
import { shipments } from '@shared/schema';
import { eq } from 'drizzle-orm';

/**
 * Directly update price-related fields in the database for a shipment
 * This is a specialized controller that only updates price fields
 * to ensure they are properly saved in the database
 */
export const updateShipmentPrices = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const shipmentId = parseInt(id);
    const priceData = req.body;
    
    console.log(`DIRECT PRICE UPDATE for shipment ID ${shipmentId}`);
    console.log("Price data to be saved:", JSON.stringify(priceData, null, 2));
    
    // Validate that required price fields are present
    if (priceData.basePrice === undefined || 
        priceData.fuelCharge === undefined || 
        priceData.totalPrice === undefined) {
      return res.status(400).json({ 
        message: 'Missing required price fields (basePrice, fuelCharge, totalPrice)' 
      });
    }
    
    // Convert all price-related fields to numbers to ensure they are stored correctly
    const basePrice = Number(priceData.basePrice);
    const fuelCharge = Number(priceData.fuelCharge);
    const totalPrice = Number(priceData.totalPrice);
    const originalBasePrice = priceData.originalBasePrice !== undefined ? Number(priceData.originalBasePrice) : basePrice;
    const originalFuelCharge = priceData.originalFuelCharge !== undefined ? Number(priceData.originalFuelCharge) : fuelCharge;
    const originalTotalPrice = priceData.originalTotalPrice !== undefined ? Number(priceData.originalTotalPrice) : totalPrice;
    const appliedMultiplier = priceData.appliedMultiplier !== undefined ? Number(priceData.appliedMultiplier) : 1;
    const packageWeight = priceData.packageWeight !== undefined ? Number(priceData.packageWeight) : null;
    
    // Verify all conversions succeeded
    if (isNaN(basePrice) || isNaN(fuelCharge) || isNaN(totalPrice) || 
        isNaN(originalBasePrice) || isNaN(originalFuelCharge) || isNaN(originalTotalPrice) || 
        isNaN(appliedMultiplier) || (packageWeight !== null && isNaN(packageWeight))) {
      return res.status(400).json({ 
        message: 'Invalid price data - could not convert to numbers' 
      });
    }
    
    // Skip ORM and use direct SQL for guaranteed update
    try {
      // First attempt with direct SQL for maximum reliability
      const result = await pool.query(`
        UPDATE shipments 
        SET 
          base_price = $1, 
          fuel_charge = $2, 
          total_price = $3, 
          original_base_price = $4, 
          original_fuel_charge = $5, 
          original_total_price = $6, 
          applied_multiplier = $7,
          package_weight = COALESCE($8, package_weight),
          updated_at = NOW()
        WHERE id = $9
        RETURNING *
      `, [
        basePrice,
        fuelCharge,
        totalPrice,
        originalBasePrice,
        originalFuelCharge,
        originalTotalPrice,
        appliedMultiplier,
        packageWeight, // Will be null if not provided
        shipmentId
      ]);
      
      if (result.rowCount === 0) {
        return res.status(404).json({ message: 'Shipment not found' });
      }
      
      console.log("DIRECT PRICE UPDATE successful, row data:", result.rows[0]);
      
      // Also update via Drizzle ORM for consistency with the rest of the application
      await db.update(shipments)
        .set({
          basePrice,
          fuelCharge,
          totalPrice,
          originalBasePrice,
          originalFuelCharge,
          originalTotalPrice,
          appliedMultiplier,
          ...(packageWeight !== null ? { packageWeight } : {}),
          updatedAt: new Date()
        })
        .where(eq(shipments.id, shipmentId));
      
      // Fetch the updated shipment to return to the client
      const updatedShipment = await db.query.shipments.findFirst({
        where: eq(shipments.id, shipmentId)
      });
      
      return res.status(200).json({
        message: 'Price fields updated successfully',
        shipment: updatedShipment
      });
    } catch (sqlError) {
      console.error("DIRECT PRICE UPDATE - SQL error:", sqlError);
      return res.status(500).json({ 
        message: 'Database error updating price fields',
        error: sqlError.message
      });
    }
  } catch (error) {
    console.error('Error in updateShipmentPrices:', error);
    return res.status(500).json({ 
      message: 'Server error processing price update',
      error: error.message
    });
  }
};