#!/usr/bin/env node

import { storage } from './server/storage.ts';

async function testSingleShipmentUserData() {
  console.log('🔍 Testing single shipment user data retrieval...');
  
  try {
    // Test with a known shipment ID that should have user data
    const shipmentId = 579; // Latest shipment from user gulger
    
    console.log(`\n📦 Testing shipment ${shipmentId}:`);
    const shipment = await storage.getShipment(shipmentId);
    
    if (!shipment) {
      console.log(`❌ Shipment ${shipmentId} not found`);
      return;
    }
    
    console.log('✅ Shipment retrieved successfully');
    console.log('📋 User data included:');
    console.log('  - User ID:', shipment.user?.id);
    console.log('  - User Name:', shipment.user?.name);
    console.log('  - Company Name:', shipment.user?.companyName);
    console.log('  - Email:', shipment.user?.email);
    
    console.log('\n📋 Shipment sender data:');
    console.log('  - Sender Name:', shipment.senderName);
    console.log('  - Sender Address:', shipment.senderAddress);
    console.log('  - Sender City:', shipment.senderCity);
    
    // Test the sender name priority logic
    console.log('\n🎯 Testing sender name priority logic:');
    const defaultSenderName = "MOOGSHIP TURKIYE";
    let rawSenderName = shipment.user?.companyName || shipment.user?.name || shipment.senderName || defaultSenderName;
    
    console.log('📝 Priority order test:');
    console.log(`  1. Company name: "${shipment.user?.companyName || 'Not available'}"`);
    console.log(`  2. User name: "${shipment.user?.name || 'Not available'}"`);
    console.log(`  3. Shipment sender: "${shipment.senderName || 'Not available'}"`);
    console.log(`  4. Default fallback: "${defaultSenderName}"`);
    console.log(`  🎯 SELECTED: "${rawSenderName}"`);
    
    // Simulate the PDF-safe conversion
    function makePdfSafe(text) {
      if (!text) return '';
      
      return text
        .replace(/Ş/g, 'S').replace(/ş/g, 's')
        .replace(/İ/g, 'I').replace(/ı/g, 'i')
        .replace(/Ğ/g, 'G').replace(/ğ/g, 'g')
        .replace(/Ü/g, 'U').replace(/ü/g, 'u')
        .replace(/Ç/g, 'C').replace(/ç/g, 'c')
        .replace(/Ö/g, 'O').replace(/ö/g, 'o')
        .replace(/[^\x20-\x7E]/g, '') // Remove non-ASCII characters
        .trim();
    }
    
    const pdfSafeSenderName = makePdfSafe(rawSenderName);
    console.log(`  📄 PDF-safe version: "${pdfSafeSenderName}"`);
    
    if (shipment.user?.companyName) {
      console.log('\n✅ SUCCESS: User company name will be prioritized in label generation');
      console.log(`   Company "${shipment.user.companyName}" will appear as "${makePdfSafe(shipment.user.companyName)}" on labels`);
    } else if (shipment.user?.name) {
      console.log('\n✅ SUCCESS: User name will be used (no company name available)');
      console.log(`   User "${shipment.user.name}" will appear as "${makePdfSafe(shipment.user.name)}" on labels`);
    } else {
      console.log('\n⚠️ WARNING: No user data available, will fallback to shipment sender name');
    }
    
  } catch (error) {
    console.error('❌ Error testing single shipment user data:', error);
  }
}

// Run the test
testSingleShipmentUserData();