import { Request, Response } from 'express';
import { pool } from '../db';

/**
 * Direct database update for price-related fields
 * This bypasses the ORM and uses raw SQL for maximum reliability
 */
export const updatePriceDirectly = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const shipmentId = parseInt(id);
    const priceData = req.body;
    
    console.log(`DIRECT DB PRICE UPDATE for shipment ID ${shipmentId}`);
    console.log("Raw price data:", JSON.stringify(priceData, null, 2));
    
    // Convert all price values to numbers and validate
    const basePrice = Number(priceData.basePrice);
    const fuelCharge = Number(priceData.fuelCharge);  
    const totalPrice = Number(priceData.totalPrice);
    const originalBasePrice = priceData.originalBasePrice !== undefined ? Number(priceData.originalBasePrice) : basePrice;
    const originalFuelCharge = priceData.originalFuelCharge !== undefined ? Number(priceData.originalFuelCharge) : fuelCharge;
    const originalTotalPrice = priceData.originalTotalPrice !== undefined ? Number(priceData.originalTotalPrice) : totalPrice;
    const appliedMultiplier = priceData.appliedMultiplier !== undefined ? Number(priceData.appliedMultiplier) : 1;
    const packageWeight = priceData.packageWeight !== undefined ? Number(priceData.packageWeight) : null;
    
    // Validate all converted values are actual numbers
    if (isNaN(basePrice) || isNaN(fuelCharge) || isNaN(totalPrice) || 
        isNaN(originalBasePrice) || isNaN(originalFuelCharge) || isNaN(originalTotalPrice) || 
        isNaN(appliedMultiplier) || (packageWeight !== null && isNaN(packageWeight))) {
      return res.status(400).json({ 
        message: 'Invalid price data - could not convert to numbers',
        details: {
          basePrice, fuelCharge, totalPrice,
          originalBasePrice, originalFuelCharge, originalTotalPrice,
          appliedMultiplier, packageWeight
        }
      });
    }
    
    // Log the validated numeric values
    console.log("Validated price values:", {
      basePrice, fuelCharge, totalPrice,
      originalBasePrice, originalFuelCharge, originalTotalPrice,
      appliedMultiplier, packageWeight
    });
    
    // Get existing shipment data to check for balance adjustment needs
    const existingShipmentResult = await pool.query(`
      SELECT id, user_id, status, total_price 
      FROM shipments 
      WHERE id = $1
    `, [shipmentId]);
    
    if (existingShipmentResult.rowCount === 0) {
      return res.status(404).json({ message: 'Shipment not found' });
    }
    
    const existingShipment = existingShipmentResult.rows[0];
    
    // Check if we need to adjust user balance
    const isApprovedShipment = existingShipment.status === 'approved' || 
                             existingShipment.status === 'pre_transit' || 
                             existingShipment.status === 'in_transit' || 
                             existingShipment.status === 'delivered';
    
    let balanceAdjustmentMade = false;
    let balanceAdjustmentAmount = 0;
    
    if (isApprovedShipment) {
      const oldTotalPrice = existingShipment.total_price || 0;
      const priceDifference = totalPrice - oldTotalPrice;
      
      console.log(`💰 DIRECT PRICE UPDATE - BALANCE ADJUSTMENT CHECK:`, {
        shipmentId,
        status: existingShipment.status,
        oldPrice: oldTotalPrice,
        newPrice: totalPrice,
        difference: priceDifference,
        userId: existingShipment.user_id
      });
      
      // Only adjust balance if there's a meaningful price difference (more than 1 cent)
      if (Math.abs(priceDifference) > 1) {
        try {
          // Import storage for balance operations
          const { storage } = await import('../storage');
          
          // Update user balance - negative for price increase, positive for price decrease
          const balanceChangeAmount = -priceDifference; // Negative because we're charging more or refunding less
          
          const updatedUser = await storage.updateUserBalance(existingShipment.user_id, balanceChangeAmount);
          
          if (updatedUser) {
            // Create transaction record for transparency - note: we don't have detailed field changes in direct update
            const transactionDescription = priceDifference > 0 
              ? `Additional charge: Shipment #${shipmentId} price increased from $${(oldTotalPrice/100).toFixed(2)} to $${(totalPrice/100).toFixed(2)} (admin price adjustment)`
              : `Refund: Shipment #${shipmentId} price reduced from $${(oldTotalPrice/100).toFixed(2)} to $${(totalPrice/100).toFixed(2)} (admin price adjustment)`;
            
            await storage.createTransaction(
              existingShipment.user_id,
              balanceChangeAmount,
              transactionDescription,
              shipmentId
            );
            
            balanceAdjustmentMade = true;
            balanceAdjustmentAmount = balanceChangeAmount;
            
            console.log(`✅ DIRECT PRICE UPDATE - BALANCE ADJUSTED: User ${existingShipment.user_id} balance changed by $${(balanceChangeAmount/100).toFixed(2)}`);
            console.log(`💳 DIRECT PRICE UPDATE - TRANSACTION CREATED: ${transactionDescription}`);
          } else {
            console.error(`❌ DIRECT PRICE UPDATE - BALANCE ADJUSTMENT FAILED: Could not update balance for user ${existingShipment.user_id}`);
          }
        } catch (balanceError) {
          console.error('❌ DIRECT PRICE UPDATE - BALANCE ADJUSTMENT ERROR:', balanceError);
          // Continue with price update even if balance adjustment fails
        }
      } else {
        console.log(`💰 DIRECT PRICE UPDATE - NO BALANCE ADJUSTMENT: Price difference is negligible (${priceDifference} cents)`);
      }
    } else {
      console.log(`💰 DIRECT PRICE UPDATE - NO BALANCE ADJUSTMENT: Shipment not approved`, {
        status: existingShipment.status,
        isApproved: isApprovedShipment
      });
    }

    // Direct SQL update - maximum reliability
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
      packageWeight,
      shipmentId
    ]);
    
    if (result.rowCount === 0) {
      return res.status(404).json({ message: 'Shipment not found' });
    }
    
    // Verify the update was successful
    const verification = await pool.query(`
      SELECT 
        id, 
        base_price, 
        fuel_charge, 
        total_price, 
        original_base_price,
        original_fuel_charge,
        original_total_price,
        applied_multiplier,
        package_weight,
        updated_at
      FROM shipments
      WHERE id = $1
    `, [shipmentId]);
    
    console.log("DB update verification result:", verification.rows[0]);
    
    return res.status(200).json({
      message: 'Price updated successfully',
      shipment: result.rows[0],
      balanceAdjustmentMade,
      balanceAdjustmentAmount,
      balanceAdjustmentMessage: balanceAdjustmentMade 
        ? `User balance adjusted by $${(balanceAdjustmentAmount/100).toFixed(2)} due to price change`
        : undefined
    });
  } catch (error) {
    console.error('Error in direct price update:', error);
    return res.status(500).json({ 
      message: 'Database error during price update',
      error: error.message  
    });
  }
};