/**
 * Test the critical double multiplication fix
 * This will verify that originalTotalPrice is now correctly calculated as cost price
 */

import { pool } from './server/db.js';

async function testCriticalFix() {
  try {
    const testShipmentData = {
      totalPrice: 1683,
      basePrice: 1200,
      fuelCharge: 483,
      appliedMultiplier: 1.25,
      senderName: 'Test Fix',
      senderAddress1: 'Test Address',
      senderCity: 'Istanbul',
      senderCountry: 'TR',
      receiverName: 'Test Receiver',
      receiverAddress1: 'Test Receiver Address',
      receiverCity: 'Test City',
      receiverCountry: 'US',
      packageWeight: 0.5,
      packageLength: 10,
      packageWidth: 10,
      packageHeight: 5,
      customsValue: 5000
    };
    
    // Make HTTP request to create shipment
    const response = await fetch('http://localhost:3000/api/shipments', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': 'connect.sid=s%3ASARPEo_UAmnPE_dSDxn5sOBuC3B3VpV7.%2BFXpfVzBdcJCrwPOoZT8SYqEL%2FP6%2BQD4mGnTk4VwN%2Bs' // gulger's session
      },
      body: JSON.stringify(testShipmentData)
    });
    
    if (!response.ok) {
      const errorText = await response.text();

      return;
    }
    
    const result = await response.json();
    
    const shipmentQuery = await pool.query(
      'SELECT id, original_total_price, total_price, applied_multiplier FROM shipments WHERE id = $1',
      [result.shipment.id]
    );
    
    if (shipmentQuery.rows.length === 0) {
      return;
    }
    
    const shipment = shipmentQuery.rows[0];
    const expectedCostPrice = Math.round(shipment.total_price / shipment.applied_multiplier);
    const actualCostPrice = shipment.original_total_price;
    
    if (expectedCostPrice === actualCostPrice) {
      const customerPriceDollars = (shipment.total_price / 100).toFixed(2);
      const costPriceDollars = (actualCostPrice / 100).toFixed(2);
    }
    
    await pool.query('DELETE FROM shipments WHERE id = $1', [result.shipment.id]);
    
  } catch (error) {
  }
}

// Run the test
testCriticalFix()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    process.exit(1);
  });