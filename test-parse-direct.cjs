// Test parsing directly with compiled code
const fs = require('fs');

// Read the saved HTML file
const htmlContent = fs.readFileSync('logs/etsy_ORDER_CONFIRMATION_3829789244_2025-10-21T23-52-13-053Z.html', 'utf8');
const textContent = fs.readFileSync('logs/etsy_ORDER_CONFIRMATION_3829789244_2025-10-21T23-52-13-053Z.txt', 'utf8');

console.log('\n================================================================================');
console.log('TESTING HTML PARSING PATTERNS');
console.log('================================================================================\n');

// Test avatar-media-block extraction
const avatarBlockRegex = /<div\s+class=['"]avatar-media-block['"][\s\S]*?<\/table>\s*<\/div>/gi;
const avatarBlocks = htmlContent.match(avatarBlockRegex) || [];

console.log('Found', avatarBlocks.length, 'avatar-media-block sections\n');

avatarBlocks.forEach((block, idx) => {
  console.log(`\n📦 PROCESSING BLOCK ${idx + 1}:`);
  console.log('='.repeat(80));
  
  // Extract product image
  let imageUrl = '';
  const imgMatch = block.match(/src\s*=\s*['"]([^'"]+etsystatic[^'"]+il_75x75[^'"]+)['"]/i);
  if (imgMatch) {
    imageUrl = imgMatch[1];
    console.log('✅ Image URL found:', imageUrl.substring(0, 80) + '...');
  } else {
    console.log('❌ No image found');
  }
  
  // Extract product title (first link text)
  let title = '';
  const titleMatch = block.match(/<a[^>]*>([^<]+)<\/a>/i);
  if (titleMatch) {
    title = titleMatch[1].trim();
    console.log('✅ Product Title:', title);
  } else {
    console.log('❌ No title found');
  }
  
  // Extract personalization details
  const personalizationMatches = block.match(/(?:Bracelet|Personalization):\s*([^<\n]+)/gi) || [];
  if (personalizationMatches.length > 0) {
    console.log('✅ Personalization:');
    personalizationMatches.forEach(p => {
      console.log('   - ' + p.trim());
    });
  } else {
    console.log('⚠️  No personalization found');
  }
  
  // Extract quantity
  const qtyMatch = block.match(/Quantity:\s*(\d+)/i);
  if (qtyMatch) {
    console.log('✅ Quantity:', qtyMatch[1]);
  } else {
    console.log('❌ No quantity found');
  }
  
  // Extract price
  const priceMatch = block.match(/(?:Price|Item\s+price):\s*\$?([0-9,]+(?:\.\d{2})?)/i);
  if (priceMatch) {
    console.log('✅ Price: $' + priceMatch[1]);
  } else {
    console.log('❌ No price found');
  }
  
  console.log('\n' + '='.repeat(80));
});

// Also try to extract order totals from text
console.log('\n\nORDER TOTALS FROM TEXT:');
console.log('='.repeat(80));

const orderNumMatch = textContent.match(/Order\s+(?:#|number:?\s*)(\d+)/i);
if (orderNumMatch) {
  console.log('Order Number:', orderNumMatch[1]);
}

const totalMatch = textContent.match(/(?:Order\s+)?Total[:\s]+\$?([0-9,]+(?:\.\d{2})?)/i);
if (totalMatch) {
  console.log('Order Total: $' + totalMatch[1]);
}

const shippingMatch = textContent.match(/Shipping[:\s]+\$?([0-9,]+(?:\.\d{2})?)/i);
if (shippingMatch) {
  console.log('Shipping: $' + shippingMatch[1]);
}