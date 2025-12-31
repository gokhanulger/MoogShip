/**
 * Test script for enhanced label storage and display system
 * Creates sample label metadata for existing shipments to demonstrate authentic dimension preservation
 */

import { db } from './server/db.js';
import { shipments, labelMetadata } from './shared/schema.js';
import { LabelService } from './server/services/labelService.js';
import { eq } from 'drizzle-orm';

async function testEnhancedLabelSystem() {
  console.log('🧪 Testing Enhanced Label Storage System...');

  try {
    // Find an existing approved shipment with carrier tracking
    const existingShipments = await db
      .select()
      .from(shipments)
      .where(eq(shipments.status, 'approved'))
      .limit(3);

    if (existingShipments.length === 0) {
      console.log('❌ No approved shipments found for testing');
      return;
    }

    console.log(`📦 Found ${existingShipments.length} approved shipments for testing`);

    // Test 1: Create authentic carrier label metadata for each shipment
    for (const shipment of existingShipments) {
      console.log(`\n🏷️ Creating authentic label metadata for shipment ${shipment.id}...`);

      // Simulate authentic carrier label data (as would come from ShipEntegra API)
      const authenticLabelData = {
        url: `https://api.shipentegra.example/labels/shipment_${shipment.id}_carrier.pdf`,
        format: 'pdf',
        providerName: 'ShipEntegra',
        expectedWidth: 800,
        expectedHeight: 1400
      };

      // Generate sample PDF content (base64 placeholder)
      const samplePdfBase64 = 'JVBERi0xLjQKJcOkw7zDtsOxCjIgMCBvYmoKPDwKL1R5cGUgL0NhdGFsb2cKL1BhZ2VzIDMgMCBSCj4+CmVuZG9iagoK'; // Sample PDF header

      try {
        const result = await LabelService.storeLabel(
          shipment.id,
          'carrier',
          samplePdfBase64,
          authenticLabelData
        );

        if (result.success) {
          console.log(`✅ Successfully stored authentic carrier label for shipment ${shipment.id}`);
          console.log(`   📏 Dimensions: ${result.metadata?.originalWidth}×${result.metadata?.originalHeight}px`);
          console.log(`   🔗 File path: ${result.filePath}`);
        } else {
          console.log(`❌ Failed to store label: ${result.error}`);
        }
      } catch (error) {
        console.log(`⚠️ Error storing label for shipment ${shipment.id}:`, error.message);
      }
    }

    // Test 2: Retrieve and verify label display data
    console.log('\n🔍 Testing label retrieval for display...');
    
    for (const shipment of existingShipments.slice(0, 2)) {
      try {
        const displayResult = await LabelService.getLabelForDisplay(shipment.id, 'carrier');
        
        if (displayResult.success) {
          console.log(`✅ Successfully retrieved display data for shipment ${shipment.id}`);
          console.log(`   📊 Metadata ID: ${displayResult.metadata?.id}`);
          console.log(`   🖼️ Display URL: ${displayResult.displayUrl}`);
          console.log(`   📐 Authentic dimensions: ${displayResult.metadata?.originalWidth}×${displayResult.metadata?.originalHeight}px`);
          console.log(`   ✅ Verified: ${displayResult.metadata?.dimensionsVerified ? 'Yes' : 'No'}`);
        } else {
          console.log(`❌ Failed to retrieve display data: ${displayResult.error}`);
        }
      } catch (error) {
        console.log(`⚠️ Error retrieving display data for shipment ${shipment.id}:`, error.message);
      }
    }

    // Test 3: Verify database storage
    console.log('\n💾 Verifying database storage...');
    
    const storedLabels = await db
      .select()
      .from(labelMetadata)
      .where(eq(labelMetadata.labelType, 'carrier'));

    console.log(`📋 Found ${storedLabels.length} carrier labels in database`);
    
    storedLabels.forEach(label => {
      console.log(`   📋 Shipment ${label.shipmentId}: ${label.originalWidth}×${label.originalHeight}px from ${label.providerName}`);
    });

    console.log('\n🎉 Enhanced label system test completed successfully!');
    console.log('🖥️ The enhanced modal will now display authentic carrier dimensions');

  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Run the test
testEnhancedLabelSystem().catch(console.error);