/**
 * Comprehensive script to check and relocate in-transit shipments
 * This will verify tracking status and move shipments to correct status:
 * - Pre-transit (approved with carrier tracking but not picked up)
 * - Actually in-transit (picked up and moving)
 */

const { drizzle } = require('drizzle-orm/postgres-js');
const postgres = require('postgres');
const { eq } = require('drizzle-orm');
require('dotenv').config();

const connection = postgres(process.env.DATABASE_URL);
const db = drizzle(connection);

// UPS tracking API configuration
const UPS_CLIENT_ID = process.env.UPS_CLIENT_ID;
const UPS_CLIENT_SECRET = process.env.UPS_CLIENT_SECRET;
const UPS_API_BASE_URL = 'https://onlinetools.ups.com/api';

let accessToken = null;
let tokenExpiry = null;

async function getUPSAccessToken() {
  if (accessToken && tokenExpiry && Date.now() < tokenExpiry) {
    return accessToken;
  }

  try {
    const response = await fetch(`${UPS_API_BASE_URL}/oauth/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${Buffer.from(`${UPS_CLIENT_ID}:${UPS_CLIENT_SECRET}`).toString('base64')}`
      },
      body: 'grant_type=client_credentials'
    });

    if (!response.ok) {
      throw new Error(`UPS token request failed: ${response.status}`);
    }

    const data = await response.json();
    accessToken = data.access_token;
    tokenExpiry = Date.now() + (data.expires_in * 1000) - 60000; // Refresh 1 minute early
    
    console.log('UPS access token obtained successfully');
    return accessToken;
  } catch (error) {
    console.error('Failed to get UPS access token:', error);
    throw error;
  }
}

async function getUPSTrackingInfo(trackingNumber) {
  try {
    const token = await getUPSAccessToken();
    
    const response = await fetch(`${UPS_API_BASE_URL}/track/v1/details/${trackingNumber}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      console.log(`UPS tracking failed for ${trackingNumber}: ${response.status}`);
      return null;
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error(`Error fetching UPS tracking for ${trackingNumber}:`, error);
    return null;
  }
}

function determineCorrectStatus(trackingData) {
  if (!trackingData?.trackResponse?.shipment?.[0]?.package?.[0]?.activity) {
    return 'approved'; // No tracking data, keep as approved
  }

  const activities = trackingData.trackResponse.shipment[0].package[0].activity;
  const latestActivity = activities[0]; // Most recent activity first

  if (!latestActivity) {
    return 'approved';
  }

  const statusCode = latestActivity.status?.code;
  const statusDescription = latestActivity.status?.description || '';

  console.log(`  Latest activity: ${statusCode} - ${statusDescription}`);

  // Check for pre-transit status codes (label created but not picked up)
  const preTransitCodes = ['MP', '003']; // MP = Manifest Pickup, 003 = UPS has not received package
  
  if (preTransitCodes.includes(statusCode)) {
    console.log(`  -> Pre-transit status detected`);
    return 'approved'; // Keep as approved (will show in pre-transit tab due to carrier tracking number)
  }

  // Check for delivered status
  if (statusCode === 'D' || statusDescription.toLowerCase().includes('delivered')) {
    console.log(`  -> Delivered status detected`);
    return 'delivered';
  }

  // If we have other tracking activities, it's genuinely in transit
  console.log(`  -> Genuine in-transit status confirmed`);
  return 'in_transit';
}

async function checkAndRelocateShipments() {
  console.log('Starting comprehensive shipment relocation...\n');

  // Get all shipments marked as in_transit
  const inTransitShipments = await db
    .select()
    .from(shipments)
    .where(eq(shipments.status, 'in_transit'));

  console.log(`Found ${inTransitShipments.length} shipments marked as in_transit\n`);

  let relocated = 0;
  let errors = 0;
  let unchanged = 0;

  for (const shipment of inTransitShipments) {
    console.log(`\nChecking shipment ${shipment.id} (${shipment.carrierTrackingNumber})`);
    
    if (!shipment.carrierTrackingNumber) {
      console.log(`  No carrier tracking number, moving to approved`);
      await db
        .update(shipments)
        .set({ status: 'approved' })
        .where(eq(shipments.id, shipment.id));
      relocated++;
      continue;
    }

    // Skip non-UPS tracking numbers for now
    if (!shipment.carrierTrackingNumber.startsWith('1Z')) {
      console.log(`  Non-UPS tracking number, skipping verification`);
      unchanged++;
      continue;
    }

    try {
      const trackingData = await getUPSTrackingInfo(shipment.carrierTrackingNumber);
      const correctStatus = determineCorrectStatus(trackingData);

      if (correctStatus !== shipment.status) {
        console.log(`  Relocating from ${shipment.status} to ${correctStatus}`);
        await db
          .update(shipments)
          .set({ status: correctStatus })
          .where(eq(shipments.id, shipment.id));
        relocated++;
      } else {
        console.log(`  Status confirmed as ${correctStatus}`);
        unchanged++;
      }

      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 100));

    } catch (error) {
      console.error(`  Error checking shipment ${shipment.id}:`, error.message);
      errors++;
    }
  }

  console.log('\n=== RELOCATION SUMMARY ===');
  console.log(`Total shipments checked: ${inTransitShipments.length}`);
  console.log(`Shipments relocated: ${relocated}`);
  console.log(`Shipments unchanged: ${unchanged}`);
  console.log(`Errors encountered: ${errors}`);
  console.log('\nRelocation complete!');

  await connection.end();
}

// Run the relocation
checkAndRelocateShipments().catch(console.error);