// Test the parser directly with saved HTML
const fs = require('fs');
const { parseEtsyOrderEmail } = require('./dist/server/etsy-email-parser.js');

// Read the saved HTML file
const htmlContent = fs.readFileSync('logs/etsy_ORDER_CONFIRMATION_3829789244_2025-10-21T23-52-13-053Z.html', 'utf8');

// Create a simulated email object
const testEmail = {
  uid: 'test-123',
  date: new Date('2025-10-17T19:41:26.000Z'),
  from: [{
    address: 'transaction@etsy.com',
    name: 'Etsy'
  }],
  subject: 'You made a sale on Etsy - Ship by Oct 21 - [$137.75, Order #3829789244]',
  html: htmlContent,
  text: fs.readFileSync('logs/etsy_ORDER_CONFIRMATION_3829789244_2025-10-21T23-52-13-053Z.txt', 'utf8')
};

console.log('\n================================================================================');
console.log('TESTING PARSER WITH ACTUAL EMAIL HTML');
console.log('================================================================================\n');

// Parse the email
parseEtsyOrderEmail(testEmail).then(order => {
  if (order) {
    console.log('\n✅ SUCCESSFULLY PARSED ORDER:\n');
    console.log('Order Number:', order.orderNumber);
    console.log('Customer Name:', order.customerName);
    console.log('Total Amount: $' + (order.orderTotal / 100).toFixed(2));
    console.log('Shipping Total: $' + (order.shippingTotal / 100).toFixed(2));
    console.log('\nITEMS FOUND:', order.items.length);
    console.log('================================================================================');
    
    order.items.forEach((item, idx) => {
      console.log(`\n📦 ITEM ${idx + 1}:`);
      console.log('   Title:', item.title);
      console.log('   Quantity:', item.quantity);
      console.log('   Price: $' + (item.price / 100).toFixed(2));
      console.log('   Has Image:', item.imageUrl ? 'YES' : 'NO');
      if (item.imageUrl) {
        console.log('   Image URL:', item.imageUrl.substring(0, 80) + '...');
      }
    });
    
    console.log('\n================================================================================\n');
    
    // Save parsed result for inspection
    fs.writeFileSync('logs/parsed_result.json', JSON.stringify(order, null, 2));
    console.log('✅ Full parsed result saved to: logs/parsed_result.json\n');
  } else {
    console.log('\n❌ Failed to parse order\n');
  }
}).catch(err => {
  console.error('\n❌ Error parsing email:', err.message);
  console.error(err.stack);
});