/**
 * Test the refund email functionality with updated Turkish content
 */

const fetch = require('node-fetch');

async function testRefundRequest() {
  try {
    // First, let's get the current user's shipments to select some for refund
    const shipmentsResponse = await fetch('http://localhost:5000/api/shipments', {
      method: 'GET',
      headers: {
        'Cookie': 'connect.sid=s%3AHx83Ivzaf8mHEziOGPNcuX_NsUvmkKMO.2QcQdlZdwNUcqUf%2FNdB%2BiwZlkdRlklvbwp0%2BXdshxZ4' // Using the session from logs
      }
    });
    
    if (!shipmentsResponse.ok) {
      console.log('Failed to get shipments:', shipmentsResponse.status);
      return;
    }
    
    const shipments = await shipmentsResponse.json();
    console.log('Available shipments:', shipments.length);
    
    // Filter for approved or delivered shipments that can be refunded
    const eligibleShipments = shipments.filter(s => 
      ['approved', 'delivered', 'in_transit'].includes(s.status)
    ).slice(0, 2); // Take first 2 eligible shipments
    
    if (eligibleShipments.length === 0) {
      console.log('No eligible shipments found for refund');
      return;
    }
    
    console.log('Using shipments for refund test:', eligibleShipments.map(s => ({
      id: s.id,
      trackingNumber: s.trackingNumber,
      carrierTrackingNumber: s.carrierTrackingNumber,
      status: s.status,
      totalPrice: s.totalPrice
    })));
    
    // Create refund request
    const refundData = {
      shipmentIds: eligibleShipments.map(s => s.id),
      reason: 'Test refund request - package damaged during transit'
    };
    
    console.log('Creating refund request with data:', refundData);
    
    const refundResponse = await fetch('http://localhost:5000/api/refund-requests', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': 'connect.sid=s%3AHx83Ivzaf8mHEziOGPNcuX_NsUvmkKMO.2QcQdlZdwNUcqUf%2FNdB%2BiwZlkdRlklvbwp0%2BXdshxZ4'
      },
      body: JSON.stringify(refundData)
    });
    
    const result = await refundResponse.text();
    console.log('Refund request response status:', refundResponse.status);
    console.log('Refund request response:', result);
    
    if (refundResponse.ok) {
      console.log('✓ Refund request created successfully');
      console.log('✓ Email should have been sent to: info@moogship.com, sercan@moogship.com, gokhan@moogco.com, oguzhan@moogco.com');
      console.log('✓ Email content should be in Turkish with carrier tracking numbers');
    } else {
      console.log('✗ Failed to create refund request');
    }
    
  } catch (error) {
    console.error('Test error:', error.message);
  }
}

testRefundRequest();