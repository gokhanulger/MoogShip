/**
 * Recalculate pricing for shipment #SH-000503 with full output
 */

const https = require('https');
const { Pool } = require('pg');

async function recalculateShipment503Pricing() {
  console.log('📊 Recalculating pricing for shipment #SH-000503...\n');
  
  try {
    // Get user pricing multiplier for user ID 2
    const pool = new Pool({
      connectionString: process.env.DATABASE_URL
    });
    
    const userResult = await pool.query('SELECT price_multiplier FROM users WHERE id = 2');
    const userMultiplier = userResult.rows[0]?.price_multiplier || 1.12;
    console.log(`👤 User pricing multiplier: ${userMultiplier}x`);
    
    await pool.end();
    
    // Shipment details from database
    const shipmentData = {
      destination: 'DE',
      weight: 1.28,
      length: 25,
      width: 20,
      height: 8,
      service: 'afs-1',
      customsValue: 18.00, // 1800 cents = $18.00
      contents: 'Reading Book'
    };
    
    console.log('📦 Shipment Details:');
    console.log(`   Destination: ${shipmentData.destination}`);
    console.log(`   Weight: ${shipmentData.weight} kg`);
    console.log(`   Dimensions: ${shipmentData.length}x${shipmentData.width}x${shipmentData.height} cm`);
    console.log(`   Selected Service: ${shipmentData.service}`);
    console.log(`   Customs Value: $${shipmentData.customsValue}`);
    console.log(`   Contents: ${shipmentData.contents}\n`);
    
    // Calculate volumetric weight
    const volumetricWeight = (shipmentData.length * shipmentData.width * shipmentData.height) / 5000;
    const billableWeight = Math.max(shipmentData.weight, volumetricWeight);
    
    console.log('⚖️ Weight Calculations:');
    console.log(`   Actual Weight: ${shipmentData.weight} kg`);
    console.log(`   Volumetric Weight: ${volumetricWeight.toFixed(3)} kg`);
    console.log(`   Billable Weight: ${billableWeight} kg\n`);
    
    // Make pricing API call
    const pricingPayload = JSON.stringify({
      destination: shipmentData.destination,
      weight: shipmentData.weight,
      length: shipmentData.length,
      width: shipmentData.width,
      height: shipmentData.height
    });
    
    const options = {
      hostname: 'localhost',
      port: 3000,
      path: '/api/price',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(pricingPayload),
        'Cookie': 'connect.sid=s%3AWu26x3im593GzvBKRM0XhzQB5gpSiOHa.YU7gvqCIJ7mPGgUYsZdgR2iaDjDkUCj5uSYOWV8lx7s'
      }
    };
    
    console.log('🚀 Making pricing API call...');
    
    const response = await new Promise((resolve, reject) => {
      const req = https.request(options, (res) => {
        let data = '';
        
        res.on('data', (chunk) => {
          data += chunk;
        });
        
        res.on('end', () => {
          try {
            const parsedData = JSON.parse(data);
            resolve(parsedData);
          } catch (e) {
            reject(new Error(`Failed to parse response: ${data}`));
          }
        });
      });
      
      req.on('error', (error) => {
        reject(error);
      });
      
      req.write(pricingPayload);
      req.end();
    });
    
    console.log('\n💰 Complete Pricing Response:');
    console.log(JSON.stringify(response, null, 2));
    
    // Find the AFS-1 service option
    const afs1Option = response.options?.find(opt => 
      opt.providerServiceCode === 'afs-1' || 
      opt.serviceCode === 'afs-1' || 
      opt.displayName?.includes('GLS Express')
    );
    
    if (afs1Option) {
      console.log('\n🎯 Selected Service (AFS-1) Details:');
      console.log(`   Display Name: ${afs1Option.displayName}`);
      console.log(`   Service Code: ${afs1Option.providerServiceCode || afs1Option.serviceCode}`);
      console.log(`   Base Price: $${(afs1Option.basePrice / 100).toFixed(2)}`);
      console.log(`   Fuel Charge: $${(afs1Option.fuelCharge / 100).toFixed(2)}`);
      console.log(`   Total Price: $${(afs1Option.totalPrice / 100).toFixed(2)}`);
      console.log(`   Original Price: $${(afs1Option.originalTotalPrice / 100).toFixed(2)}`);
      console.log(`   Applied Multiplier: ${afs1Option.appliedMultiplier}x`);
      
      // Compare with stored values
      console.log('\n📊 Comparison with Stored Values:');
      console.log(`   Database Total: $12.83 vs Calculated: $${(afs1Option.totalPrice / 100).toFixed(2)}`);
      console.log(`   Database Original: $10.26 vs Calculated: $${(afs1Option.originalTotalPrice / 100).toFixed(2)}`);
      console.log(`   Database Base: $11.29 vs Calculated: $${(afs1Option.basePrice / 100).toFixed(2)}`);
      console.log(`   Database Fuel: $1.54 vs Calculated: $${(afs1Option.fuelCharge / 100).toFixed(2)}`);
    } else {
      console.log('\n⚠️ AFS-1 service not found in response options');
      console.log('Available services:');
      response.options?.forEach(opt => {
        console.log(`   - ${opt.displayName} (${opt.providerServiceCode || opt.serviceCode})`);
      });
    }
    
  } catch (error) {
    console.error('\n💥 Error recalculating pricing:', error.message);
    console.error('Stack trace:', error.stack);
  }
}

recalculateShipment503Pricing();
