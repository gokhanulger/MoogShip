/**
 * Test the updated bilingual refund email system
 */

const { sendRefundStatusUpdateNotification } = require('./server/refund-email');

async function testBilingualRefundEmail() {
  console.log('Testing bilingual refund email system...');
  
  // Mock user data
  const user = {
    id: 2,
    name: 'GOKHAN ULGER',
    email: 'gokhan@moogco.com'
  };
  
  // Mock refund request
  const refundRequest = {
    id: 14,
    userId: 2,
    reason: 'Wrong item received',
    requestedAmount: 5000, // $50.00
    processedAmount: 4500, // $45.00 (approved amount)
    status: 'approved'
  };
  
  // Mock shipments
  const shipments = [
    {
      id: 123,
      trackingNumber: 'MOG250605000123',
      carrierTrackingNumber: '1Z5EY7350495933149',
      receiverName: 'Test Receiver',
      receiverCity: 'New York',
      receiverCountry: 'United States',
      totalPrice: 2500 // $25.00
    },
    {
      id: 124,
      trackingNumber: 'MOG250605000124',
      carrierTrackingNumber: '1Z5EY7350495933150',
      receiverName: 'Another Receiver',
      receiverCity: 'Los Angeles',
      receiverCountry: 'United States',
      totalPrice: 2500 // $25.00
    }
  ];
  
  try {
    console.log('Sending test refund approval email...');
    const approvalResult = await sendRefundStatusUpdateNotification(
      user,
      refundRequest,
      shipments,
      'approved',
      'Refund approved after review. Thank you for your patience.'
    );
    
    if (approvalResult) {
      console.log('✅ Bilingual refund approval email sent successfully');
    } else {
      console.log('❌ Failed to send bilingual refund approval email');
    }
    
    // Test rejection email
    console.log('\nSending test refund rejection email...');
    const rejectionRequest = { ...refundRequest, status: 'rejected' };
    const rejectionResult = await sendRefundStatusUpdateNotification(
      user,
      rejectionRequest,
      shipments,
      'rejected',
      'Unable to approve refund as shipment was delivered successfully.'
    );
    
    if (rejectionResult) {
      console.log('✅ Bilingual refund rejection email sent successfully');
    } else {
      console.log('❌ Failed to send bilingual refund rejection email');
    }
    
  } catch (error) {
    console.error('Error testing bilingual refund emails:', error);
  }
}

// Run the test
testBilingualRefundEmail();