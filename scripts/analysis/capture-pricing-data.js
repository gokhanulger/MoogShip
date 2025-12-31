/**
 * Capture actual pricing data for 5.59 kg to USA using the running server
 */

const https = require('https');

function makeRequest(options, postData) {
  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          data: data
        });
      });
    });

    req.on('error', (e) => {
      reject(e);
    });

    if (postData) {
      req.write(postData);
    }
    req.end();
  });
}

async function capturePricingData() {
  console.log('=== CAPTURING 5.59 KG PRICING DATA TO USA ===\n');

  const hostname = '64a16594-abd1-49b2-9383-39620759d013-00-12hpoujf36yq8.worf.replit.dev';
  const sessionCookie = 'connect.sid=s%3ABFBeb1eNNIG0fd1363fqnQMBBSCmutqU.NCBG%2BcF1HVfgI1Tgv6%2BobB4oe%2FgUKY%2FPqOOBgPrNmIQ';

  const postData = JSON.stringify({
    length: 30,
    width: 30,
    height: 30,
    weight: 5.59,
    country: 'US'
  });

  const options = {
    hostname: hostname,
    port: 443,
    path: '/api/calculate-price',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(postData),
      'Cookie': sessionCookie
    }
  };

  try {
    console.log('Making request to:', `https://${hostname}/api/calculate-price`);
    console.log('Package: 30x30x30cm, 5.59kg, to USA\n');

    const response = await makeRequest(options, postData);
    
    console.log('Response Status:', response.statusCode);
    console.log('\n=== FULL API RESPONSE ===');
    
    let parsedData;
    try {
      parsedData = JSON.parse(response.data);
      console.log(JSON.stringify(parsedData, null, 2));
    } catch (e) {
      console.log('Raw response:', response.data);
      return;
    }

    if (parsedData.success && parsedData.options) {
      console.log('\n=== MOOGSHIP SERVICE BREAKDOWN ===');
      parsedData.options.forEach((option, index) => {
        console.log(`${index + 1}. ${option.displayName}`);
        console.log(`   - Service Name: ${option.serviceName}`);
        console.log(`   - Service Type: ${option.serviceType}`);
        console.log(`   - Provider Code: ${option.providerServiceCode || 'N/A'}`);
        console.log(`   - Total Price: $${(option.totalPrice / 100).toFixed(2)}`);
        console.log(`   - Cargo Price: $${(option.cargoPrice / 100).toFixed(2)}`);
        console.log(`   - Fuel Cost: $${(option.fuelCost / 100).toFixed(2)}`);
        console.log(`   - Delivery: ${option.deliveryTime}`);
        console.log(`   - Description: ${option.description}`);
        console.log();
      });

      console.log('=== PRICE RANKING BY TOTAL COST ===');
      const sortedOptions = [...parsedData.options].sort((a, b) => a.totalPrice - b.totalPrice);
      sortedOptions.forEach((option, index) => {
        console.log(`${index + 1}. ${option.displayName} - $${(option.totalPrice / 100).toFixed(2)} (${option.providerServiceCode || option.serviceType})`);
      });

      console.log('\n=== SERVICE CODE MAPPING ===');
      console.log('This shows what gets stored in database selectedService field:');
      sortedOptions.forEach((option, index) => {
        console.log(`${index + 1}. Price: $${(option.totalPrice / 100).toFixed(2)} → Service Code: "${option.providerServiceCode || option.serviceType}" → Display: "${option.displayName}"`);
      });
    }

  } catch (error) {
    console.error('Error making request:', error.message);
  }
}

capturePricingData();