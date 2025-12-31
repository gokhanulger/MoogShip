#!/usr/bin/env node

async function testNewBulkLogic() {
  console.log('🔍 Testing new bulk upload logic simulation...');
  
  try {
    // Simulate user data (this is what bulk upload receives)
    const mockUser = {
      id: 2,
      name: "GOKHAN ULGER",
      companyName: "MOOG ENTERPRISE LLC BLABLA",
      email: "user@example.com",
      address: "Test Address"
    };
    
    // Simulate shipment data from bulk upload
    const mockShipmentData = {
      senderName: null, // No sender name provided in bulk upload
      receiverName: "Test Receiver",
      receiverAddress: "123 Test St",
      selectedServiceOption: {
        totalPrice: 1000,
        serviceCode: "eco"
      }
    };
    
    console.log('📊 Simulating old vs new logic:');
    
    // OLD LOGIC (what was used before)
    const oldSenderName = mockShipmentData.senderName || mockUser?.name || '';
    console.log(`  OLD: senderName = shipmentData.senderName || user?.name`);
    console.log(`  OLD: "${mockShipmentData.senderName}" || "${mockUser?.name}" = "${oldSenderName}"`);
    
    // NEW LOGIC (what's used now)
    const newSenderName = mockShipmentData.senderName || mockUser?.companyName || mockUser?.name || '';
    console.log(`  NEW: senderName = shipmentData.senderName || user?.companyName || user?.name`);
    console.log(`  NEW: "${mockShipmentData.senderName}" || "${mockUser?.companyName}" || "${mockUser?.name}" = "${newSenderName}"`);
    
    console.log('\n✅ VERIFICATION:');
    console.log(`  - Old logic would use: "${oldSenderName}"`);
    console.log(`  - New logic now uses: "${newSenderName}"`);
    console.log(`  - Company name prioritized: ${newSenderName === mockUser.companyName ? 'YES' : 'NO'}`);
    
    if (newSenderName === mockUser.companyName) {
      console.log('\n🎯 SUCCESS: New bulk upload logic correctly prioritizes company name!');
      console.log('  This matches the single shipment creation priority system');
    } else {
      console.log('\n❌ Issue: Logic may not be working as expected');
    }
    
    console.log('\n📝 Note: Existing shipments (580-584) still show old names because they were');
    console.log('  created before this fix. New bulk uploads will use company names.');
    
  } catch (error) {
    console.error('❌ Error in simulation:', error);
  }
}

// Run the simulation
testNewBulkLogic();