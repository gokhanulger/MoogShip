/**
 * Test UPS endpoint configuration specifically
 */

import { db } from './server/db.ts';
import { shipments } from './shared/schema.ts';
import { eq } from 'drizzle-orm';

async function testUpsEndpointDebug() {
  console.log("🔧 Testing UPS Endpoint Configuration Debug");
  console.log("=" .repeat(60));
  
  try {
    // Find an existing UPS shipment to test with
    const upsShipments = await db
      .select()
      .from(shipments)
      .where(eq(shipments.selectedService, 'shipentegra-ups-ekspress'))
      .limit(1);
    
    if (upsShipments.length === 0) {
      console.log("❌ No UPS shipments found with selectedService = 'shipentegra-ups-ekspress'");
      console.log("Creating a test shipment...");
      
      // Create a test UPS shipment
      const [testShipment] = await db
        .insert(shipments)
        .values({
          userId: 2, // Assuming admin user
          senderName: "Debug Test Sender",
          senderAddress1: "123 Debug St",
          senderCity: "Istanbul",
          senderPostalCode: "34000",
          senderEmail: "debug@test.com",
          senderPhone: "+90 555 123 4567",
          receiverName: "Debug Test Receiver",
          receiverAddress: "456 Debug Ave",
          receiverCity: "New York",
          receiverState: "NY",
          receiverCountry: "United States",
          receiverPostalCode: "10001",
          receiverPhone: "+1 555 987 6543",
          packageWeight: 2.5,
          packageLength: 20,
          packageWidth: 15,
          packageHeight: 10,
          packageContents: "Debug Test Product",
          customsValue: 10000,
          selectedService: "shipentegra-ups-ekspress",
          providerServiceCode: "shipentegra-ups-ekspress",
          status: "approved",
          trackingNumber: `DBG${Date.now()}`
        })
        .returning();
      
      console.log(`✅ Created test UPS shipment #${testShipment.id}`);
      
      // Now try to send this shipment to trigger the SERVICE_MAPPING lookup
      console.log("\n🚀 Triggering label generation to test SERVICE_MAPPING...");
      
      const response = await fetch('http://localhost:5000/api/shipments/send-to-shipentegra', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cookie': 'connect.sid=s%3AXBqoppySy0vmFVRXnKJ-NphtnnX1SS8-.9qxdZ8%2BSGxdGSKRiUNmjEWNr1NxWCd6w1gLjJbdyWd0' // Admin session
        },
        body: JSON.stringify({
          shipmentIds: [testShipment.id]
        })
      });
      
      console.log(`📊 Response Status: ${response.status}`);
      
      if (response.ok) {
        const responseData = await response.json();
        console.log("✅ Label generation triggered - Check server logs for SERVICE_MAPPING debug output");
        console.log("Response data:", JSON.stringify(responseData, null, 2));
      } else {
        const errorText = await response.text();
        console.log("❌ Failed to trigger label generation");
        console.log("Error:", errorText);
      }
      
    } else {
      const shipment = upsShipments[0];
      console.log(`✅ Found existing UPS shipment #${shipment.id}`);
      console.log(`📋 Service: ${shipment.selectedService}`);
      console.log(`📋 Provider Code: ${shipment.providerServiceCode}`);
      console.log(`📋 Status: ${shipment.status}`);
      
      if (shipment.status !== 'approved') {
        console.log("⚠️  Shipment is not in approved status, updating...");
        await db
          .update(shipments)
          .set({ status: 'approved' })
          .where(eq(shipments.id, shipment.id));
        console.log("✅ Updated shipment to approved status");
      }
      
      // Trigger label generation for this shipment
      console.log("\n🚀 Triggering label generation to test SERVICE_MAPPING...");
      
      const response = await fetch('http://localhost:5000/api/shipments/send-to-shipentegra', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cookie': 'connect.sid=s%3AXBqoppySy0vmFVRXnKJ-NphtnnX1SS8-.9qxdZ8%2BSGxdGSKRiUNmjEWNr1NxWCd6w1gLjJbdyWd0' // Admin session
        },
        body: JSON.stringify({
          shipmentIds: [shipment.id]
        })
      });
      
      console.log(`📊 Response Status: ${response.status}`);
      
      if (response.ok) {
        const responseData = await response.json();
        console.log("✅ Label generation triggered - Check server logs for SERVICE_MAPPING debug output");
        console.log("Response data:", JSON.stringify(responseData, null, 2));
      } else {
        const errorText = await response.text();
        console.log("❌ Failed to trigger label generation");
        console.log("Error:", errorText);
      }
    }
    
  } catch (error) {
    console.error("❌ Error in UPS endpoint debug test:", error);
  } finally {
    process.exit(0);
  }
}

testUpsEndpointDebug();