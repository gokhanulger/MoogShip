/**
 * Test AFS Transport label creation (etiket_olustur) with specific tracking number
 */

const AFS_API_KEY = process.env.AFS_TRANSPORT_API_KEY || process.env.AFS_API_KEY || "fmdcpkmkk9tvu";

console.log('Testing AFS Transport label creation...');
console.log('API Key:', AFS_API_KEY ? AFS_API_KEY.substring(0, 5) + '...' : 'undefined');

async function testAFSLabelCreation() {
  const labelPayload = {
    "islem": "etiket_olustur",
    "barkod": "00343199440705"
  };

  console.log('\n🔗 Testing AFS Transport Label Creation...');
  console.log('URL: https://panel.afstransport.com/apiv2.php');
  console.log('Payload:', JSON.stringify(labelPayload, null, 2));
  
  try {
    const response = await fetch('https://panel.afstransport.com/apiv2.php', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': AFS_API_KEY,
      },
      body: JSON.stringify(labelPayload)
    });

    const responseText = await response.text();
    
    console.log('\n📥 AFS API Response:');
    console.log('Status:', response.status);
    console.log('Status Text:', response.statusText);
    console.log('Headers:', Object.fromEntries(response.headers.entries()));
    
    try {
      const jsonResponse = JSON.parse(responseText);
      console.log('\n📋 Parsed JSON Response:');
      console.log(JSON.stringify(jsonResponse, null, 2));
      
      if (jsonResponse.hata === false || jsonResponse.success) {
        console.log('\n✅ Label creation successful!');
        
        // Check for all possible PDF URL fields
        const urlFields = ['waybill_pdf', 'label_pdf', 'etiket_pdf', 'pdf_url', 'url', 'download_url', 'file_url'];
        let foundUrls = false;
        
        for (const field of urlFields) {
          if (jsonResponse[field]) {
            console.log(`📄 ${field.toUpperCase()}:`, jsonResponse[field]);
            foundUrls = true;
          }
        }
        
        if (!foundUrls) {
          console.log('⚠️ No PDF URLs found in response');
          console.log('🔍 Checking all response fields for URLs:');
          for (const [key, value] of Object.entries(jsonResponse)) {
            if (typeof value === 'string' && (value.includes('http') || value.includes('.pdf') || value.includes('api_viewer'))) {
              console.log(`📎 ${key}:`, value);
            }
          }
        }
        
        return jsonResponse;
      } else {
        console.log('\n❌ Label creation failed');
        console.log('Error message:', jsonResponse.mesaj || jsonResponse.error);
        return jsonResponse;
      }
    } catch (parseError) {
      console.log('\n📄 Raw Response (not JSON):');
      console.log(responseText);
      console.log('\nParse Error:', parseError.message);
      return { raw: responseText, parseError: parseError.message };
    }
  } catch (error) {
    console.error('\n💥 Network Error:', error.message);
    return { networkError: error.message };
  }
}

async function main() {
  const result = await testAFSLabelCreation();
  
  console.log('\n🎯 Final Result:');
  console.log(JSON.stringify(result, null, 2));
}

main().catch(console.error);