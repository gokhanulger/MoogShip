// Test script for shipment email notifications
import { sendEmail } from './server/email.ts';
import { sendNewShipmentNotification, sendShipmentApprovalEmail } from './server/notification-emails.ts';

// Mock test data
const mockUser = {
  id: 9999,
  username: "testuser",
  name: "Test User",
  email: "info@moogship.com", // Using info@moogship.com for testing so it stays within the system
  companyName: "Test Company",
  phone: "1234567890",
  role: "user"
};

const mockShipment = {
  id: 9999,
  userId: 9999,
  status: "approved",
  senderName: "Test Sender",
  senderAddress: "123 Sender St",
  senderCity: "Sender City",
  senderPostalCode: "12345",
  senderCountry: "TR",
  receiverName: "Test Recipient",
  receiverAddress: "456 Receiver Rd",
  receiverCity: "Receiver City",
  receiverPostalCode: "67890",
  receiverCountry: "US",
  packageWeight: 2.5,
  packageLength: 30,
  packageWidth: 20,
  packageHeight: 10,
  serviceLevel: "express",
  trackingNumber: "MOOGTEST123456",
  basePrice: 2500, // $25.00 in cents
  fuelCharge: 500, // $5.00 in cents
  totalPrice: 3000, // $30.00 in cents
  currency: "USD",
  estimatedDeliveryDays: 5,
  labelUrl: "https://app.moogship.com/labels/test-label.pdf",
  createdAt: new Date()
};

async function runTests() {
  console.log("Starting email notification tests...");
  
  // Test 1: Admin notification for new pending shipment
  console.log("\n1. Testing admin notification for new shipment...");
  const pendingShipment = { ...mockShipment, status: "pending" };
  const adminNotificationResult = await sendNewShipmentNotification(pendingShipment, mockUser);
  console.log("  Result:", adminNotificationResult.success ? "Success" : "Failed", 
    adminNotificationResult.error ? `(Error: ${adminNotificationResult.error})` : "");
  
  // Test 2: User notification for approved shipment
  console.log("\n2. Testing user approval notification...");
  const approvedShipment = { ...mockShipment, status: "approved" };
  const userApprovalResult = await sendShipmentApprovalEmail(approvedShipment, mockUser);
  console.log("  Result:", userApprovalResult.success ? "Success" : "Failed", 
    userApprovalResult.error ? `(Error: ${userApprovalResult.error})` : "");
  
  console.log("\nTests completed. Check your inbox and logs for the results.");
}

// Run the tests
runTests().catch(err => {
  console.error("Error running tests:", err);
});

// Export main function for potential import elsewhere
export { runTests };