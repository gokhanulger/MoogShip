/**
 * Regenerate label for shipment MOG252159000195 
 * This will trigger the current label generation system to create a new label
 */

import pg from 'pg';
import fetch from 'node-fetch';

const { Pool } = pg;

// Database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function regenerateLabel195() {
  try {
    console.log("🏷️ Starting label regeneration for shipment MOG252159000195");
    
    // Get the shipment data first
    const shipmentQuery = `
      SELECT 
        id, user_id, tracking_number, carrier_tracking_number,
        sender_name, sender_address1, sender_city, sender_postal_code,
        receiver_name, receiver_address, receiver_city, receiver_state, receiver_postal_code, receiver_country,
        package_contents, package_weight, package_length, package_width, package_height,
        selected_service, service_level, provider_service_code,
        customs_value, customs_item_count, gtip, ioss_number,
        status, label_error, created_at
      FROM shipments 
      WHERE id = 195
    `;
    
    const shipmentResult = await pool.query(shipmentQuery);
    
    if (shipmentResult.rows.length === 0) {
      console.log("❌ Shipment 195 not found");
      return;
    }
    
    const shipment = shipmentResult.rows[0];
    console.log("📦 Found shipment:", shipment.tracking_number);
    console.log("   Current status:", shipment.status);
    console.log("   Current service:", shipment.selected_service);
    console.log("   Provider code:", shipment.provider_service_code);
    console.log("   Current carrier tracking:", shipment.carrier_tracking_number);
    
    // Make API call to regenerate the label
    const labelUrl = `http://localhost:5173/api/shipments/${shipment.id}/label`;
    
    console.log("🚀 Calling label generation API:", labelUrl);
    
    const response = await fetch(labelUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Label-Regeneration-Script'
      }
    });
    
    console.log("📋 API Response status:", response.status);
    console.log("📋 API Response headers:", Object.fromEntries(response.headers.entries()));
    
    if (response.ok) {
      const contentType = response.headers.get('content-type');
      
      if (contentType && contentType.includes('application/pdf')) {
        console.log("✅ Successfully generated PDF label");
        console.log("📄 Content-Type:", contentType);
        console.log("📏 Content-Length:", response.headers.get('content-length'));
        
        // Get updated shipment data to see changes
        const updatedResult = await pool.query(shipmentQuery);
        const updatedShipment = updatedResult.rows[0];
        
        console.log("📦 Updated shipment data:");
        console.log("   Status:", updatedShipment.status);
        console.log("   Label URL:", updatedShipment.label_url ? 'Set' : 'Not set');
        console.log("   Label PDF:", updatedShipment.label_pdf ? 'Set' : 'Not set');
        console.log("   Carrier tracking:", updatedShipment.carrier_tracking_number);
        console.log("   Label error:", updatedShipment.label_error || 'None');
        
      } else {
        const responseText = await response.text();
        console.log("❌ Unexpected response type:", contentType);
        console.log("📄 Response body:", responseText);
      }
    } else {
      const errorText = await response.text();
      console.log("❌ Label generation failed");
      console.log("📄 Error response:", errorText);
    }
    
  } catch (error) {
    console.error("❌ Error regenerating label:", error);
  } finally {
    await pool.end();
  }
}

// Run the regeneration
regenerateLabel195().catch(console.error);