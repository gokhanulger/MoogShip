/**
 * Test creating a new bulk shipment to verify package creation fix
 */
import { createShipment } from './server/controllers/shipmentController.js';

// Mock request and response objects
const mockReq = {
  user: { id: 2, name: 'GOKHAN ULGER' },
  body: {
    bulkShipments: [
      {
        senderName: 'Test Sender',
        senderAddress: 'Test Address',
        senderCity: 'Test City',
        senderPostalCode: '12345',
        senderPhone: '1234567890',
        senderEmail: 'test@example.com',
        receiverName: 'Test Receiver',
        receiverAddress: '123 Test St',
        receiverCity: 'Test City',
        receiverState: 'NY',
        receiverCountry: 'United States',
        receiverPostalCode: '54321',
        receiverPhone: '0987654321',
        receiverEmail: 'receiver@example.com',
        packageLength: 20,
        packageWidth: 15,
        packageHeight: 10,
        packageWeight: 2.5,
        packageContents: 'Test Item',
        pieceCount: 1,
        basePrice: 1500,
        fuelCharge: 200,
        totalPrice: 1700,
        selectedService: 'shipentegra-eco',
        shippingProvider: 'shipentegra'
      }
    ]
  }
};

const mockRes = {
  status: (code) => ({ json: (data) => console.log(`Status ${code}:`, data) }),
  json: (data) => console.log('Response:', data)
};

async function testNewBulkShipment() {
  console.log('🧪 Testing new bulk shipment creation with package fix...\n');
  
  try {
    // Import and use the actual bulk shipment creation
    const { createBulkShipments } = await import('./server/controllers/shipmentController.js');
    
    console.log('📤 Creating test bulk shipment...');
    
    // Call the controller function
    await createBulkShipments(mockReq, mockRes);
    
    console.log('\n✅ Bulk shipment creation completed!');
    
  } catch (error) {
    console.error('❌ Error testing bulk shipment:', error);
  }
}

testNewBulkShipment();