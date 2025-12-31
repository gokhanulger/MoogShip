/**
 * Test etiket_olustur API call for barkod 00346968865459
 */

const AFS_API_URL = 'https://panel.afstransport.com/apiv2.php';
const AFS_API_KEY = process.env.AFS_TRANSPORT_API_KEY || process.env.AFS_API_KEY || 'fmdnh47u6zgcy';

async function testEtiketOlustur() {
  console.log('🏷️ Testing etiket_olustur API call...');
  console.log('🔑 Using API key:', AFS_API_KEY ? AFS_API_KEY.substring(0, 8) + '...' : 'None');
  
  const barkod = '00346968865459';
  
  try {
    // Create form data for etiket_olustur
    const formData = new URLSearchParams();
    formData.append('islem', 'etiket_olustur');
    formData.append('barkod', barkod);
    formData.append('key', AFS_API_KEY);
    
    console.log('📦 Making etiket_olustur API call with barkod:', barkod);
    console.log('📤 Request payload:', formData.toString());
    
    const response = await fetch(AFS_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: formData
    });
    
    console.log('📥 Response status:', response.status);
    console.log('📥 Response headers:', Object.fromEntries(response.headers.entries()));
    
    // Try to get response text even if status is not ok
    const responseText = await response.text();
    console.log('📄 Response body:', responseText);
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}, body: ${responseText}`);
    }
    
    const result = await response.json();
    console.log('✅ AFS etiket_olustur response:', JSON.stringify(result, null, 2));
    
    if (result.hata === false && result.waybill_pdf) {
      console.log('🔗 PDF URL received:', result.waybill_pdf);
      
      // Test downloading the PDF
      console.log('📥 Testing PDF download...');
      const pdfResponse = await fetch(result.waybill_pdf);
      
      if (pdfResponse.ok) {
        const pdfBuffer = await pdfResponse.arrayBuffer();
        const pdfBase64 = Buffer.from(pdfBuffer).toString('base64');
        
        console.log('✅ PDF downloaded successfully');
        console.log('📄 PDF size:', pdfBuffer.byteLength, 'bytes');
        console.log('📄 Base64 length:', pdfBase64.length, 'characters');
        console.log('📄 First 100 chars of base64:', pdfBase64.substring(0, 100));
        
        return {
          success: true,
          waybill_pdf_url: result.waybill_pdf,
          pdf_base64: pdfBase64,
          pdf_size: pdfBuffer.byteLength
        };
      } else {
        console.error('❌ Failed to download PDF:', pdfResponse.status, pdfResponse.statusText);
        return {
          success: false,
          error: `Failed to download PDF: ${pdfResponse.status}`
        };
      }
    } else {
      console.error('❌ etiket_olustur failed:', result.mesaj);
      return {
        success: false,
        error: result.mesaj || 'etiket_olustur failed'
      };
    }
    
  } catch (error) {
    console.error('❌ Error in etiket_olustur test:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

// Run the test
testEtiketOlustur().then(result => {
  console.log('\n🏁 Final result:', result.success ? 'SUCCESS' : 'FAILED');
  if (!result.success) {
    console.log('Error:', result.error);
  }
}).catch(console.error);