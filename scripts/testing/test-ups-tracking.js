/**
 * Test UPS tracking API with the specific tracking numbers
 */

import dotenv from 'dotenv';
dotenv.config();

const UPS_CLIENT_ID = process.env.UPS_CLIENT_ID;
const UPS_CLIENT_SECRET = process.env.UPS_CLIENT_SECRET;
const UPS_API_BASE_URL = 'https://onlinetools.ups.com';

let accessToken = null;

async function getUPSAccessToken() {
  try {
    const response = await fetch(`${UPS_API_BASE_URL}/security/v1/oauth/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${Buffer.from(`${UPS_CLIENT_ID}:${UPS_CLIENT_SECRET}`).toString('base64')}`,
        'x-merchant-id': UPS_CLIENT_ID
      },
      body: 'grant_type=client_credentials'
    });

    if (!response.ok) {
      throw new Error(`UPS token request failed: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    accessToken = data.access_token;
    console.log('✓ UPS access token obtained successfully');
    return accessToken;
  } catch (error) {
    console.error('✗ Failed to get UPS access token:', error.message);
    throw error;
  }
}

async function testTrackingNumber(trackingNumber) {
  try {
    const token = await getUPSAccessToken();
    
    console.log(`\nTesting tracking number: ${trackingNumber}`);
    
    const response = await fetch(`${UPS_API_BASE_URL}/api/track/v1/details/${trackingNumber}?locale=en_US&returnSignature=false&returnMilestones=false`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'transId': '12345',
        'transactionSrc': 'testing'
      }
    });

    console.log(`Response status: ${response.status}`);

    if (!response.ok) {
      const errorText = await response.text();
      console.log(`Error response: ${errorText}`);
      return null;
    }

    const data = await response.json();
    
    if (data?.trackResponse?.shipment?.[0]?.package?.[0]?.activity) {
      const activities = data.trackResponse.shipment[0].package[0].activity;
      const latestActivity = activities[0];
      
      console.log(`Latest status: ${latestActivity.status?.code} - ${latestActivity.status?.description}`);
      console.log(`Location: ${latestActivity.location?.address?.city}, ${latestActivity.location?.address?.countryCode}`);
      console.log(`Date: ${latestActivity.date} ${latestActivity.time}`);
      
      return {
        statusCode: latestActivity.status?.code,
        statusDescription: latestActivity.status?.description,
        location: latestActivity.location?.address
      };
    } else {
      console.log('No tracking activities found');
      return null;
    }
  } catch (error) {
    console.error(`Error testing ${trackingNumber}:`, error.message);
    return null;
  }
}

async function testAllTrackingNumbers() {
  const trackingNumbers = [
    '1Z5EY7350494103958',
    '1Z5EY7350493214161', 
    '1Z5EY7350497766362',
    '1Z5EY7350496960046',
    '1Z5EY7350491563529',
    '1Z5EY7350491545307'
  ];

  console.log('Testing UPS tracking API with provided tracking numbers...');
  
  for (const trackingNumber of trackingNumbers) {
    await testTrackingNumber(trackingNumber);
    // Small delay between requests
    await new Promise(resolve => setTimeout(resolve, 500));
  }
}

testAllTrackingNumbers().catch(console.error);