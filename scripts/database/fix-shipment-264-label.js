/**
 * Fix shipment 264 PNG label by downloading from ShipEntegra URL and storing in database
 */
import fetch from 'node-fetch';
import { db } from './server/db/index.js';

async function fixShipment264Label() {
  try {
    console.log('🔧 Fixing shipment 264 PNG label...');
    
    const labelUrl = 'https://files.shipentegra.com/labels/dhlecommerce/CR3H_1750460900_ea793b2266.png';
    
    // Download the PNG label
    console.log('📥 Downloading PNG label from:', labelUrl);
    const response = await fetch(labelUrl);
    
    if (!response.ok) {
      throw new Error(`Failed to download label: ${response.status} ${response.statusText}`);
    }
    
    // Convert to base64
    const buffer = await response.buffer();
    const base64Data = buffer.toString('base64');
    
    console.log(`✅ Downloaded PNG label: ${buffer.length} bytes, ${base64Data.length} base64 characters`);
    
    // Update shipment 264 in database
    const updateQuery = `
      UPDATE shipments 
      SET carrier_label_pdf = $1,
          carrier_label_url = $2
      WHERE id = 264
    `;
    
    await db.query(updateQuery, [base64Data, labelUrl]);
    
    console.log('✅ Updated shipment 264 with PNG label data');
    
    // Verify the update
    const verifyQuery = 'SELECT id, carrier_label_url, LENGTH(carrier_label_pdf) as label_length FROM shipments WHERE id = 264';
    const result = await db.query(verifyQuery);
    
    if (result.rows.length > 0) {
      const shipment = result.rows[0];
      console.log('✅ Verification:', {
        shipmentId: shipment.id,
        carrierLabelUrl: shipment.carrier_label_url,
        labelDataLength: shipment.label_length
      });
    }
    
    console.log('🎉 Shipment 264 PNG label fix completed successfully!');
    
  } catch (error) {
    console.error('❌ Error fixing shipment 264 label:', error);
    throw error;
  }
}

// Run the fix
fixShipment264Label()
  .then(() => {
    console.log('Script completed successfully');
    process.exit(0);
  })
  .catch(error => {
    console.error('Script failed:', error);
    process.exit(1);
  });