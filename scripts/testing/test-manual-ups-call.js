/**
 * Test manual UPS API call to see the raw response
 */

import dotenv from 'dotenv';
dotenv.config();

async function testUPSCall() {
  const trackingNumber = '1Z5EY7350494742302';
  
  console.log(`Testing UPS API for tracking number: ${trackingNumber}`);
  console.log('='.repeat(60));
  
  try {
    // First get the access token
    console.log('Step 1: Getting UPS access token...');
    
    const tokenResponse = await fetch('https://onlinetools.ups.com/security/v1/oauth/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': 'Basic ' + Buffer.from(process.env.UPS_CLIENT_ID + ':' + process.env.UPS_CLIENT_SECRET).toString('base64')
      },
      body: 'grant_type=client_credentials'
    });
    
    if (!tokenResponse.ok) {
      throw new Error(`Token request failed: ${tokenResponse.status}`);
    }
    
    const tokenData = await tokenResponse.json();
    console.log('✓ Access token obtained');
    
    // Now make the tracking request
    console.log('Step 2: Making tracking request...');
    
    const trackingResponse = await fetch(`https://onlinetools.ups.com/api/track/v1/details/${trackingNumber}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${tokenData.access_token}`
      },
      body: JSON.stringify({
        inquiryNumber: trackingNumber,
        trackingOptions: "01",
        locale: "en_US"
      })
    });
    
    if (!trackingResponse.ok) {
      throw new Error(`Tracking request failed: ${trackingResponse.status}`);
    }
    
    const trackingData = await trackingResponse.json();
    
    console.log('✓ UPS API Response received');
    console.log('\nFull UPS API Response:');
    console.log(JSON.stringify(trackingData, null, 2));
    
    // Extract the current activity status
    const shipment = trackingData.trackResponse?.shipment?.[0];
    const activity = shipment?.package?.[0]?.activity?.[0];
    
    if (activity) {
      console.log('\nCurrent Activity Details:');
      console.log(`- Status Code: ${activity.status?.code}`);
      console.log(`- Status Type: ${activity.status?.type}`);
      console.log(`- Status Description: ${activity.status?.description}`);
      console.log(`- Status StatusCode: ${activity.status?.statusCode}`);
      console.log(`- Date: ${activity.date}`);
      console.log(`- Time: ${activity.time}`);
      
      if (activity.location?.address) {
        console.log(`- Location: ${activity.location.address.city}, ${activity.location.address.stateProvince}, ${activity.location.address.countryCode}`);
      }
    }
    
  } catch (error) {
    console.error('Error:', error.message);
    
    // Check if this is a UPS credentials issue
    if (error.message.includes('401') || error.message.includes('Token request failed')) {
      console.log('\n❌ UPS API credentials might be missing or invalid.');
      console.log('Please ensure UPS_CLIENT_ID and UPS_CLIENT_SECRET are properly set.');
    }
  }
}

testUPSCall();