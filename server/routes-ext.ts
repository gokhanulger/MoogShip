import express from "express";
import { pool } from "./db";

// Create a separate router for our direct database operations
const router = express.Router();

// Custom session-based authentication middleware
const checkSession = (req, res, next) => {
  // Check if the user session exists and has user data
  if (req.session && req.session.passport && req.session.passport.user) {
    // User is authenticated
    return next();
  }
  return res.status(401).json({ 
    message: 'Authentication required',
    success: false
  });
};

// Direct SQL price update endpoint
router.post("/sql-update-prices", checkSession, async (req, res) => {
  try {
    const { 
      shipmentId, 
      basePrice, 
      fuelCharge, 
      totalPrice,
      originalBasePrice,
      originalFuelCharge,
      originalTotalPrice,
      appliedMultiplier,
      packageWeight
    } = req.body;
    
    console.log(`DIRECT SQL PRICE UPDATE for shipment ID ${shipmentId}`);
    console.log("Price data:", JSON.stringify(req.body, null, 2));
    
    // Convert and validate all numeric values
    const basePriceNum = Number(basePrice);
    const fuelChargeNum = Number(fuelCharge);
    const totalPriceNum = Number(totalPrice);
    const originalBasePriceNum = Number(originalBasePrice);
    const originalFuelChargeNum = Number(originalFuelCharge);
    const originalTotalPriceNum = Number(originalTotalPrice);
    const appliedMultiplierNum = Number(appliedMultiplier);
    const packageWeightNum = packageWeight ? Number(packageWeight) : null;
    
    // Validate the values
    if (isNaN(basePriceNum) || isNaN(fuelChargeNum) || isNaN(totalPriceNum) ||
        isNaN(originalBasePriceNum) || isNaN(originalFuelChargeNum) || isNaN(originalTotalPriceNum) ||
        isNaN(appliedMultiplierNum) || (packageWeightNum !== null && isNaN(packageWeightNum))) {
      console.error("Invalid numeric values in price update request:", {
        basePrice, fuelCharge, totalPrice,
        originalBasePrice, originalFuelCharge, originalTotalPrice,
        appliedMultiplier, packageWeight
      });
      
      return res.status(400).json({
        success: false,
        message: "Invalid numeric values in price data"
      });
    }
    
    // Get existing shipment data to check for balance adjustment needs
    const existingShipmentResult = await pool.query(`
      SELECT id, user_id, status, total_price 
      FROM shipments 
      WHERE id = $1
    `, [shipmentId]);
    
    if (existingShipmentResult.rowCount === 0) {
      return res.status(404).json({
        success: false,
        message: "Shipment not found"
      });
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
      const priceDifference = totalPriceNum - oldTotalPrice;
      
      console.log(`💰 ROUTES-EXT PRICE UPDATE - BALANCE ADJUSTMENT CHECK:`, {
        shipmentId,
        status: existingShipment.status,
        oldPrice: oldTotalPrice,
        newPrice: totalPriceNum,
        difference: priceDifference,
        userId: existingShipment.user_id
      });
      
      // Only adjust balance if there's a meaningful price difference (more than 1 cent)
      if (Math.abs(priceDifference) > 1) {
        try {
          // Import storage for balance operations
          const { storage } = await import('./storage');
          
          // Update user balance - negative for price increase, positive for price decrease
          const balanceChangeAmount = -priceDifference; // Negative because we're charging more or refunding less
          
          const updatedUser = await storage.updateUserBalance(existingShipment.user_id, balanceChangeAmount);
          
          if (updatedUser) {
            // Create transaction record for transparency - note: routes-ext doesn't have access to detailed field changes
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
            
            console.log(`✅ ROUTES-EXT PRICE UPDATE - BALANCE ADJUSTED: User ${existingShipment.user_id} balance changed by $${(balanceChangeAmount/100).toFixed(2)}`);
            console.log(`💳 ROUTES-EXT PRICE UPDATE - TRANSACTION CREATED: ${transactionDescription}`);
          } else {
            console.error(`❌ ROUTES-EXT PRICE UPDATE - BALANCE ADJUSTMENT FAILED: Could not update balance for user ${existingShipment.user_id}`);
          }
        } catch (balanceError) {
          console.error('❌ ROUTES-EXT PRICE UPDATE - BALANCE ADJUSTMENT ERROR:', balanceError);
          // Continue with price update even if balance adjustment fails
        }
      } else {
        console.log(`💰 ROUTES-EXT PRICE UPDATE - NO BALANCE ADJUSTMENT: Price difference is negligible (${priceDifference} cents)`);
      }
    } else {
      console.log(`💰 ROUTES-EXT PRICE UPDATE - NO BALANCE ADJUSTMENT: Shipment not approved`, {
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
      basePriceNum,
      fuelChargeNum,
      totalPriceNum,
      originalBasePriceNum,
      originalFuelChargeNum,
      originalTotalPriceNum,
      appliedMultiplierNum,
      packageWeightNum,
      shipmentId
    ]);
    
    // Check if update was successful
    if (result.rowCount === 0) {
      console.error(`Shipment not found for ID ${shipmentId}`);
      return res.status(404).json({
        success: false,
        message: "Shipment not found"
      });
    }
    
    console.log("DIRECT SQL PRICE UPDATE successful");
    console.log("Updated values:", {
      basePrice: result.rows[0].base_price,
      fuelCharge: result.rows[0].fuel_charge,
      totalPrice: result.rows[0].total_price,
      originalBasePrice: result.rows[0].original_base_price,
      originalFuelCharge: result.rows[0].original_fuel_charge,
      originalTotalPrice: result.rows[0].original_total_price
    });
    
    // Double-verify the update with a separate query
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
    
    console.log("VERIFICATION query result:", verification.rows[0]);
    
    return res.status(200).json({
      success: true,
      message: "Price updated successfully",
      shipment: result.rows[0],
      balanceAdjustmentMade,
      balanceAdjustmentAmount,
      balanceAdjustmentMessage: balanceAdjustmentMade 
        ? `User balance adjusted by $${(balanceAdjustmentAmount/100).toFixed(2)} due to price change`
        : undefined
    });
  } catch (error) {
    console.error("Error in direct SQL price update:", error);
    return res.status(500).json({
      success: false,
      message: "Database error during price update",
      error: error.message
    });
  }
});

export default router;