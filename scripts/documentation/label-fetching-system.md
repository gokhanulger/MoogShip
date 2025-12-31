# Complete Label Fetching and Upload System

## 1. Main Label Processing Function

```typescript
// File: server/services/shipentegra.ts

async function processCarrierSpecificLabel(
  orderId: string,
  shipment: ShipEntegraSubmitData,
  accessToken: string,
  carrierType: string = "UPS"
): Promise<{
  success: boolean;
  message: string;
  orderId?: string;
  trackingNumber?: string;
  labelUrl?: string;
  labelPdf?: string | null;
}> {
  console.log(`🚀 Starting ${carrierType} label generation for shipment:`, shipment.id);
  
  // Get service configuration for this carrier
  const serviceConfig = SERVICE_MAPPING[shipment.providerServiceCode || 'shipentegra-ups-ekspress'];
  if (!serviceConfig) {
    return {
      success: false,
      message: `No service configuration found for: ${shipment.providerServiceCode}`,
    };
  }

  // Prepare API payload
  const labelPayload = {
    orderId: orderId,
    ...shipment,
    specialService: serviceConfig.specialService,
  };

  console.log(`📦 ${carrierType} payload:`, JSON.stringify(labelPayload, null, 2));

  // Make API call to ShipEntegra
  const labelResponse = await fetch(serviceConfig.url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${accessToken}`,
    },
    body: JSON.stringify(labelPayload),
  });

  // Handle errors
  if (!labelResponse.ok) {
    let detailedErrorMessage = `${carrierType} label API error: ${labelResponse.status}`;
    
    try {
      const errorData = await labelResponse.json();
      if (errorData.data && errorData.data.message) {
        detailedErrorMessage = `${labelResponse.status} - ${errorData.data.message}`;
      } else if (errorData.message) {
        detailedErrorMessage = `${labelResponse.status} - ${errorData.message}`;
      }
    }
    
    console.error(`${carrierType} label error for shipment ${shipment.id}: ${detailedErrorMessage}`);
    
    // Update error in database
    try {
      const db = await import('../db');
      await db.pool.query(
        'UPDATE shipments SET label_error = $1 WHERE id = $2',
        [detailedErrorMessage, shipment.id]
      );
    } catch (dbError) {
      console.error("Failed to update label error message in database:", dbError);
    }
    
    return {
      success: false,
      message: detailedErrorMessage,
    };
  }

  // Process successful response
  const labelData = await labelResponse.json();
  console.log(`${carrierType} label response:`, JSON.stringify(labelData));

  if (labelData.status === "success" && labelData.data) {
    console.log(`Successfully generated ${carrierType} label for shipment ${shipment.id}`);
    
    // Smart document URL analysis
    const labelUrl = labelData.data.label;
    const invoiceUrl = labelData.data.invoice;
    const shipEntegraUrl = labelData.data.shipEntegraLabel;
    
    console.log(`📋 Label URL: ${labelUrl}`);
    console.log(`📄 Invoice URL: ${invoiceUrl || 'No invoice provided'}`);
    console.log(`📦 ShipEntegra Label URL: ${shipEntegraUrl || 'No ShipEntegra label provided'}`);
    
    // Intelligent document type detection
    const isLabelAnInvoice = labelUrl && (
      labelUrl.includes('invoice') || 
      labelUrl.includes('fatura') ||
      labelUrl.includes('CR3H_') ||
      labelUrl.includes('_invoice_')
    );
    
    const isInvoiceALabel = invoiceUrl && (
      invoiceUrl.includes('label') ||
      invoiceUrl.includes('etiket') ||
      (!invoiceUrl.includes('invoice') && !invoiceUrl.includes('fatura') && !invoiceUrl.includes('CR3H_'))
    );
    
    console.log(`🔍 URL Analysis:`);
    console.log(`   ├─ Label URL appears to be invoice: ${isLabelAnInvoice}`);
    console.log(`   ├─ Invoice URL appears to be label: ${isInvoiceALabel}`);
    
    // Determine correct shipping label URL
    let actualLabelUrl = labelUrl;
    
    if (isLabelAnInvoice && isInvoiceALabel) {
      console.log(`🔄 SWAPPING: Using invoice URL as shipping label (${invoiceUrl})`);
      actualLabelUrl = invoiceUrl;
    }
    
    // Prefer GIF labels over PDF invoices
    if (labelUrl && labelUrl.includes('.gif')) {
      console.log(`✅ CONFIRMED: Using GIF label as shipping label (${labelUrl})`);
      actualLabelUrl = labelUrl;
    }
    
    // Download and process the label
    let labelPdfBase64 = null;
    
    if (actualLabelUrl) {
      try {
        console.log(`📥 Downloading SHIPPING LABEL from: ${actualLabelUrl}`);
        
        const isGifLabel = actualLabelUrl.includes('.gif');
        
        if (isGifLabel) {
          console.log(`🔄 Converting GIF label to PDF format with enhanced dimension preservation`);
          const { downloadAndConvertToPdf } = await import('../utilities/imageConverter');
          labelPdfBase64 = await downloadAndConvertToPdf(actualLabelUrl);
          console.log(`✅ Successfully converted GIF label to PDF preserving original carrier dimensions (${labelPdfBase64.length} characters)`);
        } else {
          // Download PDF directly
          const labelResponse = await fetch(actualLabelUrl);
          if (labelResponse.ok) {
            const labelBuffer = await labelResponse.arrayBuffer();
            labelPdfBase64 = Buffer.from(labelBuffer).toString('base64');
            console.log(`✅ Successfully downloaded PDF label (${labelPdfBase64.length} characters)`);
          } else {
            console.warn(`⚠️ Failed to download shipping label: ${labelResponse.status}`);
          }
        }
      } catch (error) {
        console.error(`❌ Error downloading/converting shipping label:`, error);
      }
    }
    
    return {
      success: true,
      message: `${carrierType} label generated successfully`,
      orderId: orderId,
      trackingNumber: labelData.data.trackingNumber,
      labelUrl: actualLabelUrl,
      labelPdf: labelPdfBase64, // Base64 PDF data for database storage
    };
  } else {
    console.error(`Failed to generate ${carrierType} label:`, labelData.message || "Unknown error");
    return {
      success: false,
      message: labelData.message || `Unknown ${carrierType} label generation error`,
    };
  }
}
```

## 2. Enhanced GIF to PDF Converter

```typescript
// File: server/utilities/imageConverter.ts

import sharp from 'sharp';
import PDFDocument from 'pdfkit';

/**
 * Downloads image from URL and converts to PDF with enhanced dimension preservation
 */
export async function downloadAndConvertToPdf(imageUrl: string): Promise<string> {
  try {
    console.log(`🔄 Downloading image from: ${imageUrl}`);
    
    // Download the image
    const response = await fetch(imageUrl);
    if (!response.ok) {
      throw new Error(`Failed to download image: ${response.status} ${response.statusText}`);
    }
    
    const imageBuffer = Buffer.from(await response.arrayBuffer());
    console.log(`✅ Downloaded image (${imageBuffer.length} bytes)`);
    
    // Get image metadata to preserve original dimensions
    const metadata = await sharp(imageBuffer).metadata();
    const originalWidth = metadata.width || 800;
    const originalHeight = metadata.height || 1400;
    
    console.log(`📏 Original image dimensions: ${originalWidth}x${originalHeight}px`);
    
    // Convert to high-quality PNG to preserve quality
    const pngBuffer = await sharp(imageBuffer)
      .png({ quality: 100, compressionLevel: 0 })
      .toBuffer();
    
    console.log(`🔄 Converted to PNG (${pngBuffer.length} bytes)`);
    
    // Create PDF with exact original dimensions
    const doc = new PDFDocument({
      size: [originalWidth * 0.75, originalHeight * 0.75], // Convert pixels to points (1px = 0.75pt)
      margin: 0,
      autoFirstPage: false
    });
    
    // Add page with exact dimensions
    doc.addPage({
      size: [originalWidth * 0.75, originalHeight * 0.75],
      margin: 0
    });
    
    // Insert image at full size without scaling
    doc.image(pngBuffer, 0, 0, {
      width: originalWidth * 0.75,
      height: originalHeight * 0.75
    });
    
    // Finalize PDF
    doc.end();
    
    // Convert to base64
    const chunks: Buffer[] = [];
    doc.on('data', (chunk) => chunks.push(chunk));
    
    return new Promise((resolve, reject) => {
      doc.on('end', () => {
        const pdfBuffer = Buffer.concat(chunks);
        const base64String = pdfBuffer.toString('base64');
        console.log(`✅ Created PDF preserving original ${originalWidth}x${originalHeight}px dimensions (${base64String.length} characters)`);
        resolve(base64String);
      });
      
      doc.on('error', reject);
    });
    
  } catch (error) {
    console.error('❌ Error in downloadAndConvertToPdf:', error);
    throw error;
  }
}
```

## 3. Database Storage Integration

```typescript
// File: server/controllers/shipmentController.ts

// Store label data in database with dual storage
async function updateShipmentWithLabel(
  shipmentId: number,
  labelResult: any,
  storage: any
): Promise<void> {
  try {
    // Update shipment with label information
    await storage.updateShipment(shipmentId, {
      labelUrl: labelResult.labelUrl,
      labelPdf: labelResult.labelPdf, // Base64 PDF content
      trackingNumber: labelResult.trackingNumber,
      status: 'approved'
    });
    
    // Also save to file system for backup
    if (labelResult.labelPdf) {
      const labelPath = `uploads/labels/shipment-${shipmentId}-label.pdf`;
      const labelBuffer = Buffer.from(labelResult.labelPdf, 'base64');
      
      await fs.promises.writeFile(labelPath, labelBuffer);
      console.log(`💾 Saved label to file system: ${labelPath}`);
    }
    
    console.log(`✅ Successfully updated shipment ${shipmentId} with label data`);
  } catch (error) {
    console.error(`❌ Failed to update shipment ${shipmentId} with label:`, error);
    throw error;
  }
}
```

## 4. Complete Integration Flow

```typescript
// Main shipment processing function
export async function sendShipmentsToShipEntegra(
  shipmentIds: number[],
  accessToken: string,
  storage: any
): Promise<{ success: boolean; results: any[] }> {
  console.log(`🚀 Processing ${shipmentIds.length} shipments for label generation`);
  
  const results = [];
  
  for (const shipmentId of shipmentIds) {
    try {
      // Get shipment data
      const shipment = await storage.getShipmentById(shipmentId);
      if (!shipment) {
        console.error(`❌ Shipment ${shipmentId} not found`);
        continue;
      }
      
      // Generate unique order ID
      const orderId = Date.now().toString();
      
      // Convert shipment to ShipEntegra format
      const shipEntegraData = convertToShipEntegraFormat(shipment);
      
      // Determine processing method based on service type
      let labelResult;
      
      if (isCarrierSpecificService(shipment.providerServiceCode)) {
        // Use carrier-specific endpoint (UPS, DHL, FedEx)
        labelResult = await processCarrierSpecificLabel(
          orderId,
          shipEntegraData,
          accessToken,
          getCarrierType(shipment.providerServiceCode)
        );
      } else {
        // Use ECO processing
        labelResult = await processEcoLabel(
          orderId,
          shipEntegraData,
          accessToken
        );
      }
      
      if (labelResult.success) {
        // Update database with label data
        await updateShipmentWithLabel(shipmentId, labelResult, storage);
        
        console.log(`✅ Successfully processed shipment ${shipmentId}`);
        results.push({
          shipmentId,
          success: true,
          trackingNumber: labelResult.trackingNumber,
          labelUrl: labelResult.labelUrl
        });
      } else {
        console.error(`❌ Failed to process shipment ${shipmentId}: ${labelResult.message}`);
        results.push({
          shipmentId,
          success: false,
          error: labelResult.message
        });
      }
      
    } catch (error) {
      console.error(`❌ Error processing shipment ${shipmentId}:`, error);
      results.push({
        shipmentId,
        success: false,
        error: error.message
      });
    }
  }
  
  return {
    success: results.some(r => r.success),
    results
  };
}
```

## Key Features

1. **Smart Document Detection** - Automatically identifies shipping labels vs invoices
2. **Enhanced Dimension Preservation** - Maintains exact carrier label dimensions (800x1400px)
3. **Dual Storage System** - Stores in both database (base64) and file system
4. **Error Handling** - Comprehensive error tracking and database updates
5. **Format Support** - Handles both GIF and PDF formats seamlessly
6. **Authentic Carrier Labels** - Preserves original carrier specifications

This system ensures that all shipping labels are fetched from ShipEntegra API and properly stored in our system while maintaining their authentic appearance and dimensions.