#!/usr/bin/env node

import { storage } from './server/storage.ts';
import { generateShippingLabel } from './server/services/labelGenerator.ts';

async function testBulkUploadCompanyFix() {
  console.log('🔍 Testing bulk upload company name prioritization fix...');
  
  try {
    // Get user data to verify what should be prioritized
    const user = await storage.getUserById(2);
    if (!user) {
      console.log('❌ User 2 not found');
      return;
    }
    
    console.log('👤 User data verification:');
    console.log(`  - User ID: ${user.id}`);
    console.log(`  - Company Name: "${user.companyName}"`);
    console.log(`  - User Name: "${user.name}"`);
    
    // Test recent bulk upload shipment
    console.log('\n📦 Testing recent bulk upload shipment:');
    const recentShipments = await storage.getShipmentsByUserId(2, 5); // Get 5 most recent
    
    if (recentShipments.length === 0) {
      console.log('❌ No shipments found for user 2');
      return;
    }
    
    const latestShipment = recentShipments[0];
    console.log(`  - Latest shipment ID: ${latestShipment.id}`);
    console.log(`  - Sender Name in DB: "${latestShipment.senderName}"`);
    
    // Get complete shipment with user data (like bulk upload now does)
    const completeShipment = await storage.getShipment(latestShipment.id);
    if (!completeShipment) {
      console.log('❌ Could not retrieve complete shipment');
      return;
    }
    
    console.log('\n✅ Complete shipment data retrieved:');
    console.log(`  - Shipment user data: ${completeShipment.user ? 'Available' : 'Missing'}`);
    if (completeShipment.user) {
      console.log(`  - User company: "${completeShipment.user.companyName}"`);
      console.log(`  - User name: "${completeShipment.user.name}"`);
    }
    
    // Test the sender name priority logic that should be used
    console.log('\n🎯 Testing sender name priority logic (should match single shipment logic):');
    const defaultSenderName = "MOOGSHIP TURKIYE";
    
    // Priority logic: user.companyName → user.name → shipment.senderName → default
    let selectedSenderName = completeShipment.user?.companyName || 
                             completeShipment.user?.name || 
                             completeShipment.senderName || 
                             defaultSenderName;
    
    console.log(`  Priority 1 - Company: "${completeShipment.user?.companyName || 'Not available'}"`);
    console.log(`  Priority 2 - User name: "${completeShipment.user?.name || 'Not available'}"`);
    console.log(`  Priority 3 - Shipment sender: "${completeShipment.senderName || 'Not available'}"`);
    console.log(`  Priority 4 - Default: "${defaultSenderName}"`);
    console.log(`  🎯 WOULD SELECT: "${selectedSenderName}"`);
    
    // Check if bulk upload is now using company name
    const isUsingCompanyName = completeShipment.senderName === user.companyName;
    console.log(`\n📊 Analysis:`);
    console.log(`  - Database sender name: "${completeShipment.senderName}"`);
    console.log(`  - User company name: "${user.companyName}"`);
    console.log(`  - Is using company name: ${isUsingCompanyName ? '✅ YES' : '❌ NO'}`);
    
    if (isUsingCompanyName) {
      console.log('\n✅ SUCCESS: Bulk upload is now correctly using company name!');
      console.log('  Both bulk upload and single shipment creation now use the same logic');
    } else {
      console.log('\n⚠️ Issue detected: Bulk upload may still be using old logic');
      console.log('  Expected sender name to be company name for consistency');
    }
    
    // Test label generation with complete shipment data
    console.log('\n🏷️ Testing label generation with updated data flow...');
    try {
      const labelResult = await generateShippingLabel(completeShipment);
      console.log('✅ Label generation successful with complete shipment data');
      console.log(`  - Label contains user data: ${completeShipment.user ? 'YES' : 'NO'}`);
    } catch (labelError) {
      console.log('❌ Label generation failed:', labelError.message);
    }
    
  } catch (error) {
    console.error('❌ Error in bulk upload test:', error);
  }
}

// Run the test
testBulkUploadCompanyFix();