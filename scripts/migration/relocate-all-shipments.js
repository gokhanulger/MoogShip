/**
 * Comprehensive script to relocate all IN_TRANSIT shipments to their correct status
 * based on actual UPS tracking data using the working API configuration
 */

import dotenv from 'dotenv';
import fetch from 'node-fetch';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { shipments } from './shared/schema.ts';
import { eq } from 'drizzle-orm';

dotenv.config();

const UPS_CLIENT_ID = process.env.UPS_CLIENT_ID;
const UPS_CLIENT_SECRET = process.env.UPS_CLIENT_SECRET;
const UPS_API_BASE_URL = 'https://onlinetools.ups.com';

// Database connection
const client = postgres(process.env.DATABASE_URL);
const db = drizzle(client);

let accessToken = null;
let tokenExpiry = 0;

async function getUPSAccessToken() {
  // Check if we have a valid cached token
  const now = Date.now();
  if (accessToken && tokenExpiry > now) {
    return accessToken;
  }

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
    tokenExpiry = now + (data.expires_in * 1000) - 60000; // Subtract 1 minute for safety
    
    console.log('✓ UPS access token obtained successfully');
    return accessToken;
    
  } catch (error) {
    console.error('✗ Failed to get UPS access token:', error.message);
    throw error;
  }
}

async function getUPSTrackingInfo(trackingNumber) {
  try {
    const token = await getUPSAccessToken();
    
    const response = await fetch(`${UPS_API_BASE_URL}/api/track/v1/details/${trackingNumber}?locale=en_US&returnSignature=false&returnMilestones=false`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'transId': Date.now().toString(),
        'transactionSrc': 'moogship'
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.log(`  Warning: UPS API error for ${trackingNumber}: ${response.status} ${errorText}`);
      return null;
    }

    const data = await response.json();
    
    // Extract the latest status from the tracking response
    const shipment = data.trackResponse?.shipment?.[0];
    if (!shipment) {
      console.log(`  Warning: No shipment data found for ${trackingNumber}`);
      return null;
    }

    const activity = shipment.package?.[0]?.activity?.[0];
    if (!activity) {
      console.log(`  Warning: No activity data found for ${trackingNumber}`);
      return null;
    }

    return {
      statusCode: activity.status?.code,
      statusDescription: activity.status?.description,
      date: activity.date,
      time: activity.time,
      location: activity.location?.address
    };

  } catch (error) {
    console.log(`  Error getting tracking info for ${trackingNumber}: ${error.message}`);
    return null;
  }
}

function determineCorrectStatus(trackingData) {
  if (!trackingData) {
    return 'approved'; // Default to approved if we can't get tracking data
  }

  const statusCode = trackingData.statusCode;
  const description = trackingData.statusDescription || '';
  const upperDescription = description.toUpperCase();

  // Check for delivered status first
  if (upperDescription.includes('DELIVERED') || statusCode === 'D') {
    return 'delivered';
  }

  // All M codes are Pre-Transit (approved status)
  if (statusCode && statusCode.startsWith('M')) {
    return 'approved'; // M codes = Pre-Transit
  }

  // All I codes are In Transit
  if (statusCode && statusCode.startsWith('I')) {
    return 'in_transit'; // I codes = In Transit
  }

  // All O codes are In Transit (Out for Delivery)
  if (statusCode && statusCode.startsWith('O')) {
    return 'in_transit'; // O codes = In Transit (Out for Delivery)
  }

  // All X codes are In Transit with Exception
  if (statusCode && statusCode.startsWith('X')) {
    return 'in_transit'; // X codes = In Transit but with exception
  }

  // All D codes are Delivered
  if (statusCode && statusCode.startsWith('D')) {
    return 'delivered'; // D codes = Delivered
  }

  // P codes (Pickup) are also In Transit
  if (statusCode && statusCode.startsWith('P')) {
    return 'in_transit';
  }

  // Default to approved for unknown statuses
  return 'approved';
}

async function relocateAllShipments() {
  try {
    console.log('Starting comprehensive shipment relocation...\n');

    // Get all shipments currently marked as in_transit
    const inTransitShipments = await db
      .select()
      .from(shipments)
      .where(eq(shipments.status, 'in_transit'));

    console.log(`Found ${inTransitShipments.length} shipments currently marked as IN_TRANSIT\n`);

    let relocatedCount = 0;
    let errorCount = 0;

    for (const shipment of inTransitShipments) {
      console.log(`Processing Shipment ID ${shipment.id} (${shipment.number})`);
      
      // Check if shipment has a UPS tracking number
      const trackingNumber = shipment.carrierTrackingNumber;
      
      if (!trackingNumber || !trackingNumber.startsWith('1Z')) {
        console.log(`  Skipping: No UPS tracking number found`);
        continue;
      }

      console.log(`  UPS Tracking: ${trackingNumber}`);

      // Get actual tracking status from UPS
      const trackingData = await getUPSTrackingInfo(trackingNumber);
      
      if (trackingData) {
        console.log(`  Current UPS Status: ${trackingData.statusCode} - ${trackingData.statusDescription}`);
        
        // Determine what the correct status should be
        const correctStatus = determineCorrectStatus(trackingData);
        console.log(`  Correct Status: ${correctStatus}`);

        // Only update if the status needs to change
        if (correctStatus !== 'in_transit') {
          try {
            await db
              .update(shipments)
              .set({ 
                status: correctStatus,
                updatedAt: new Date()
              })
              .where(eq(shipments.id, shipment.id));

            console.log(`  ✓ Relocated from IN_TRANSIT to ${correctStatus}`);
            relocatedCount++;
          } catch (updateError) {
            console.log(`  ✗ Error updating shipment: ${updateError.message}`);
            errorCount++;
          }
        } else {
          console.log(`  ✓ Status is correct (remains IN_TRANSIT)`);
        }
      } else {
        console.log(`  ⚠ Could not get tracking data, leaving as IN_TRANSIT`);
        errorCount++;
      }

      console.log(''); // Empty line for readability
      
      // Add a small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    console.log('='.repeat(60));
    console.log('RELOCATION SUMMARY');
    console.log('='.repeat(60));
    console.log(`Total shipments processed: ${inTransitShipments.length}`);
    console.log(`Successfully relocated: ${relocatedCount}`);
    console.log(`Errors/Skipped: ${errorCount}`);
    console.log(`Remaining IN_TRANSIT: ${inTransitShipments.length - relocatedCount}`);

  } catch (error) {
    console.error('Error during relocation process:', error);
  } finally {
    await client.end();
  }
}

// Run the relocation
relocateAllShipments().catch(console.error);