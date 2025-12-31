/**
 * Simple test to verify Aramex purchase label functionality
 */
const fetch = require('node-fetch');

// Mock the environment
process.env.ARAMEX_USERNAME = 'testingapi@aramex.com';
process.env.ARAMEX_PASSWORD = 'R123456789$r';
process.env.ARAMEX_ACCOUNT_NUMBER = '20016';
process.env.ARAMEX_ACCOUNT_PIN = '221126';

async function testAramexPurchaseLabel() {
  console.log('🔄 Testing Aramex Purchase Label API...');
  
  try {
    // Test direct API call to Aramex
    const response = await fetch('https://ws.aramex.net/ShippingAPI.V2/Service_1_0.svc/json/CreateShipments', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({
        ClientInfo: {
          UserName: process.env.ARAMEX_USERNAME,
          Password: process.env.ARAMEX_PASSWORD,
          Version: "v1.0",
          AccountNumber: process.env.ARAMEX_ACCOUNT_NUMBER,
          AccountPin: process.env.ARAMEX_ACCOUNT_PIN,
          AccountEntity: "AUH",
          AccountCountryCode: "AE"
        },
        Transaction: {
          Reference1: "TEST123",
          Reference2: "MoogShip Test",
          Reference3: "Admin Purchase Test"
        },
        Shipments: [{
          Reference1: "TEST123",
          Reference2: "MoogShip Test",
          Reference3: "Admin Purchase Test",
          Shipper: {
            PartyAddress: {
              Line1: "Test Address 1",
              City: "Dubai",
              PostCode: "12345",
              CountryCode: "AE"
            },
            Contact: {
              PersonName: "Test Shipper",
              PhoneNumber1: "+971501234567",
              EmailAddress: "test@example.com"
            }
          },
          Consignee: {
            PartyAddress: {
              Line1: "123 Test Street",
              City: "New York",
              PostCode: "10001",
              CountryCode: "US"
            },
            Contact: {
              PersonName: "Test Receiver",
              PhoneNumber1: "+1234567890",
              EmailAddress: "receiver@example.com"
            }
          },
          ShippingDateTime: "/Date(1705507200000)/",
          Details: {
            PaymentType: "P",
            ProductGroup: "EXP",
            ProductType: "PPX",
            ActualWeight: { Value: 1.0, Unit: "KG" },
            NumberOfPieces: 1,
            DescriptionOfGoods: "Test Package",
            GoodsOriginCountry: "AE",
            Items: [{
              PackageType: "Box",
              Quantity: 1,
              Weight: { Value: 1.0, Unit: "KG" },
              Comments: "Test Item"
            }]
          }
        }],
        LabelInfo: {
          ReportID: 9201,
          ReportType: "URL"
        }
      })
    });

    const data = await response.json();
    console.log('📋 Aramex API Response:', JSON.stringify(data, null, 2));
    
    if (data && data.Shipments && data.Shipments.length > 0) {
      const shipment = data.Shipments[0];
      if (shipment.ID) {
        console.log('✅ SUCCESS: Created Aramex shipment with ID:', shipment.ID);
        if (shipment.ShipmentLabel && shipment.ShipmentLabel.LabelURL) {
          console.log('✅ SUCCESS: Generated label URL:', shipment.ShipmentLabel.LabelURL);
        }
      } else {
        console.log('❌ FAILED: No shipment ID returned');
      }
    } else {
      console.log('❌ FAILED: No shipments in response');
    }
    
  } catch (error) {
    console.error('❌ Test failed with error:', error.message);
  }
}

// Run the test
testAramexPurchaseLabel();