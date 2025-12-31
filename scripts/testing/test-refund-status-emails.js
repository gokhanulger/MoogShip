/**
 * Test script to verify refund status update email notifications
 * This will test both approval and rejection email scenarios
 */

import { storage } from './server/storage.js';
import { sendRefundStatusUpdateNotification } from './server/refund-email.js';

async function testRefundStatusEmails() {
  try {
    console.log('🧪 Testing refund status update email notifications...');
    
    // Get a test user and refund request
    const testUserId = 2; // gulger user
    const user = await storage.getUser(testUserId);
    
    if (!user) {
      console.error('❌ Test user not found');
      return;
    }
    
    console.log(`✅ Found test user: ${user.name} (${user.email})`);
    
    // Get the latest refund request for this user
    const allRefundRequests = await storage.getAllRefundRequests();
    const userRefundRequests = allRefundRequests.filter(r => r.userId === testUserId);
    
    if (userRefundRequests.length === 0) {
      console.error('❌ No refund requests found for test user');
      return;
    }
    
    const testRefundRequest = userRefundRequests[userRefundRequests.length - 1]; // Get latest
    console.log(`✅ Using refund request #${testRefundRequest.id}`);
    
    // Get shipments for the refund request
    const shipmentIds = JSON.parse(testRefundRequest.shipmentIds);
    const shipments = await storage.getShipmentsByIds(shipmentIds);
    
    console.log(`✅ Found ${shipments.length} shipments for refund request`);
    
    // Test approval email
    console.log('\n📧 Testing APPROVAL email notification...');
    const approvalEmailSent = await sendRefundStatusUpdateNotification(
      user,
      testRefundRequest,
      shipments,
      'approved',
      'Your refund has been approved and will be processed within 5-7 business days.'
    );
    
    if (approvalEmailSent) {
      console.log('✅ Approval emails sent successfully (English & Turkish)');
    } else {
      console.error('❌ Failed to send approval emails');
    }
    
    // Wait a moment before sending rejection email
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Test rejection email
    console.log('\n📧 Testing REJECTION email notification...');
    const rejectionEmailSent = await sendRefundStatusUpdateNotification(
      user,
      testRefundRequest,
      shipments,
      'rejected',
      'Your refund request has been rejected due to policy violations. Please contact support for more information.'
    );
    
    if (rejectionEmailSent) {
      console.log('✅ Rejection emails sent successfully (English & Turkish)');
    } else {
      console.error('❌ Failed to send rejection emails');
    }
    
    console.log('\n🎉 Email notification test completed!');
    console.log(`📬 Check ${user.email} for the test emails`);
    
  } catch (error) {
    console.error('❌ Error during email notification test:', error);
  }
}

// Run the test
testRefundStatusEmails().catch(console.error);