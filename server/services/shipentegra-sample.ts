import fetch from "node-fetch";
import { db } from "../db";
import { normalizeCountryCode, normalizeStateCode } from "@shared/countries";

// Disable TypeScript strict checking for this implementation file
// @ts-nocheck

// Response interfaces
interface ShipentegraOrderResponse {
  status: string;
  data: {
    orderId: string;
    se_tracking_number?: string;
  };
  message?: string;
}

interface ShipentegraLabelResponse {
  status: string;
  data: {
    label: string;
    courier: string;
    trackingNumber: string;
  };
  message?: string;
}

// EU country codes for IOSS validation
const EU_COUNTRY_CODES = [
  'AT', 'BE', 'BG', 'HR', 'CY', 'CZ', 'DK', 'EE', 'FI', 'FR',
  'DE', 'GR', 'HU', 'IE', 'IT', 'LV', 'LT', 'LU', 'MT', 'NL',
  'PL', 'PT', 'RO', 'SK', 'SI', 'ES', 'SE'
];

function isEUCountry(countryCode: string): boolean {
  if (!countryCode) return false;
  return EU_COUNTRY_CODES.includes(countryCode.toUpperCase());
}

// Cache for access token
let cachedAccessToken: {
  token: string;
  expiresAt: number;
} | null = null;

/**
 * Get access token using the sample format
 */
async function getShipentegraAccessToken(): Promise<string | null> {
  try {
    // Check cached token
    if (cachedAccessToken && cachedAccessToken.expiresAt > Date.now()) {
      return cachedAccessToken.token;
    }

    const CLIENT_ID = process.env.SHIPENTEGRA_CLIENT_ID;
    const CLIENT_SECRET = process.env.SHIPENTEGRA_CLIENT_SECRET;

    if (!CLIENT_ID || !CLIENT_SECRET) {
      console.error("Missing ShipEntegra API credentials");
      return null;
    }

    const response = await fetch("https://publicapi.shipentegra.com/v1/auth/token", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        clientId: CLIENT_ID,
        clientSecret: CLIENT_SECRET,
      }),
    });

    if (!response.ok) {
      console.error(`Token request failed: ${response.status}`);
      return null;
    }

    const data = await response.json() as any;
    
    if (data.status === "success" && data.data?.accessToken) {
      cachedAccessToken = {
        token: data.data.accessToken,
        expiresAt: Date.now() + (data.data.expiresIn || 3600) * 1000,
      };
      return data.data.accessToken;
    }

    return null;
  } catch (error) {
    console.error("Error getting access token:", error);
    return null;
  }
}

/**
 * Create order and generate label using the exact sample format
 */
export async function createShipentegraOrderAndLabelSample(
  shipment: any,
): Promise<{
  success: boolean;
  message: string;
  orderId?: string;
  trackingNumber?: string;
  labelUrl?: string;
  labelPdf?: string | null;
  error?: string;
}> {
  try {
    console.log(`Starting sample format order creation for shipment ${shipment.id}`);

    // Get access token
    const accessToken = await getShipentegraAccessToken();
    if (!accessToken) {
      return {
        success: false,
        message: "Failed to authenticate with ShipEntegra API",
      };
    }

    // ===== STEP 1: CREATE ORDER =====
    const orderNumber = `MG${shipment.id}${Date.now()}`;
    console.log(`Creating order: ${orderNumber}`);

    // Get package items with proper typing
    let packageItems: any[] = [];
    try {
      const { packageItems: packageItemsTable } = await import("@shared/schema");
      const { eq } = await import("drizzle-orm");
      
      packageItems = await db
        .select()
        .from(packageItemsTable)
        .where(eq(packageItemsTable.shipmentId, shipment.id));
    } catch (error) {
      console.warn(`Error retrieving package items: ${error}`);
    }

    // Build order payload exactly like sample with proper typing
    const orderPayload: any = {
      number: orderNumber,
      packageQuantity: 1,
      reference1: orderNumber,
      description: shipment.packageContents || "Package contents description",
      currency: "USD",
      weight: Math.ceil(Number(shipment.packageWeight) || 2),
      width: Math.ceil(Number(shipment.packageWidth) || 20),
      height: Math.ceil(Number(shipment.packageHeight) || 15),
      length: Math.ceil(Number(shipment.packageLength) || 30),
      shipFrom: {
        name: "MoogShip Turkey",
        address1: shipment.senderAddress1 || shipment.senderAddress || "Sender address line 1",
        city: shipment.senderCity || "Istanbul",
        zipCode: shipment.senderPostalCode || "34000",
        phone: "905407447911",
        email: "info@moogship.com"
      },
      shippingAddress: {
        name: shipment.receiverName,
        address: shipment.receiverAddress || "123 Main Street",
        city: shipment.receiverCity,
        country: normalizeCountryCode(shipment.receiverCountry) || "US",
        state: normalizeStateCode(normalizeCountryCode(shipment.receiverCountry), shipment.receiverState) || "NY",
        postalCode: shipment.receiverPostalCode || "10001",
        phone: shipment.receiverPhone || "+14252987618",
        email: shipment.receiverEmail || "customer@example.com"
      },
      items: [] as any[]
    };

    // Add IOSS number for EU shipments
    const countryCode = normalizeCountryCode(shipment.receiverCountry);
    if (isEUCountry(countryCode) && shipment.iossNumber) {
      orderPayload.iossNumber = shipment.iossNumber;
    }

    // Add items exactly like sample
    if (packageItems && packageItems.length > 0) {
      for (const item of packageItems) {
        let gtipCode = 940510;
        
        if (item.hsCode || item.gtin) {
          try {
            const cleanCode = (item.hsCode || item.gtin).toString().replace(/\D/g, '');
            if (cleanCode) {
              gtipCode = parseInt(cleanCode, 10);
            }
          } catch (error) {
            // Use default
          }
        }
        
        orderPayload.items.push({
          name: item.name || "Product Name",
          quantity: item.quantity || 2,
          unitPrice: item.price ? (item.price / 100) : 25.50,
          sku: item.sku || `SKU-${item.id}`,
          gtip: gtipCode
        });
      }
    } else {
      orderPayload.items.push({
        name: "Product Name",
        quantity: 2,
        unitPrice: 25.50,
        sku: `SKU-12345`,
        gtip: 940510
      });
    }

    console.log("Order payload:", JSON.stringify(orderPayload, null, 2));

    // Create order
    const orderResponse = await fetch("https://publicapi.shipentegra.com/v1/orders/manual", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify(orderPayload),
    });

    if (!orderResponse.ok) {
      const errorText = await orderResponse.text();
      console.error(`Order creation failed: ${orderResponse.status} - ${errorText}`);
      return {
        success: false,
        message: `Order creation failed: ${orderResponse.status}`,
      };
    }

    const orderData = (await orderResponse.json()) as ShipentegraOrderResponse;
    console.log("Order response:", JSON.stringify(orderData));

    if (orderData.status !== "success" || !orderData.data.orderId) {
      return {
        success: false,
        message: `Order creation failed: ${orderData.message || "Unknown error"}`,
      };
    }

    // ===== STEP 2: GENERATE LABEL =====
    console.log(`Generating label for order: ${orderData.data.orderId}`);

    const labelPayload: any = {
      orderId: orderData.data.orderId,
      specialService: "shipentegra-ups-ekspress",
      verpackg: countryCode === "DE" ? 2 : -1,
      insurance: true,
      content: shipment.packageContents || "Package contents description",
      weight: Math.ceil(Number(shipment.packageWeight) || 2),
      currency: "USD",
      shipFrom: {
        name: "MoogShip Turkey",
        address1: shipment.senderAddress1 || shipment.senderAddress || "Sender address line 1",
        city: shipment.senderCity || "Istanbul",
        zipCode: shipment.senderPostalCode || "34000",
        phone: "905407447911",
        email: "info@moogship.com"
      },
      items: [] as any[]
    };

    // Add IOSS for EU
    if (isEUCountry(countryCode) && shipment.iossNumber) {
      labelPayload.iossNumber = shipment.iossNumber;
    }

    // Add items for label exactly like sample
    if (packageItems && packageItems.length > 0) {
      for (let index = 0; index < packageItems.length; index++) {
        const item = packageItems[index];
        let gtipCode = 940510;
        
        if (item.hsCode || item.gtin) {
          try {
            const cleanCode = (item.hsCode || item.gtin).toString().replace(/\D/g, '');
            if (cleanCode) {
              gtipCode = parseInt(cleanCode, 10);
            }
          } catch (error) {
            // Use default
          }
        }
        
        labelPayload.items.push({
          itemId: 120 + index,
          declaredPrice: item.price ? (item.price / 100) : 51.00,
          declaredQuantity: item.quantity || 2,
          gtip: gtipCode
        });
      }
    } else {
      labelPayload.items.push({
        itemId: 123,
        declaredPrice: 51.00,
        declaredQuantity: 2,
        gtip: 940510
      });
    }

    console.log("Label payload:", JSON.stringify(labelPayload, null, 2));

    // Generate label
    const labelResponse = await fetch("https://publicapi.shipentegra.com/v1/logistics/labels/shipentegra/ups", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify(labelPayload),
    });

    if (!labelResponse.ok) {
      const errorText = await labelResponse.text();
      console.error(`Label generation failed: ${labelResponse.status} - ${errorText}`);
      return {
        success: false,
        message: `Label generation failed: ${labelResponse.status}`,
      };
    }

    const labelData = (await labelResponse.json()) as ShipentegraLabelResponse;
    console.log("Label response:", JSON.stringify(labelData));

    if (labelData.status === "success" && labelData.data) {
      console.log(`🏷️ Label generated successfully: ${labelData.data.label}`);
      
      // Download and convert the label (GIF/PNG) to PDF format
      let labelPdfBase64 = null;
      
      if (labelData.data.label) {
        try {
          console.log(`🏷️ Downloading label from: ${labelData.data.label}`);
          
          // Download the label file
          const labelFileResponse = await fetch(labelData.data.label);
          if (labelFileResponse.ok) {
            const labelBuffer = await labelFileResponse.arrayBuffer();
            const labelBase64 = Buffer.from(labelBuffer).toString('base64');
            
            // Convert image to PDF using PDFKit
            const PDFDocument = require('pdfkit');
            const pdf = new PDFDocument({ 
              margin: 0,
              layout: 'portrait',
              size: [288, 432] // 4x6 inches at 72 DPI
            });
            
            const chunks: Buffer[] = [];
            pdf.on('data', (chunk: Buffer) => chunks.push(chunk));
            
            await new Promise<void>((resolve) => {
              pdf.on('end', () => resolve());
              
              // Add the image to PDF
              pdf.image(Buffer.from(labelBase64, 'base64'), 0, 0, {
                fit: [288, 432],
                align: 'center',
                valign: 'center'
              });
              
              pdf.end();
            });
            
            // Convert PDF to base64
            const pdfBuffer = Buffer.concat(chunks);
            labelPdfBase64 = pdfBuffer.toString('base64');
            
            console.log(`🏷️ Successfully converted label to PDF format`);
          } else {
            console.warn(`🏷️ Failed to download label file: ${labelFileResponse.status}`);
          }
        } catch (error) {
          console.error(`🏷️ Error converting label to PDF:`, error);
          // Continue without PDF conversion - we'll still have the URL
        }
      }
      
      return {
        success: true,
        message: "Label generated successfully",
        orderId: orderData.data.orderId,
        trackingNumber: labelData.data.trackingNumber,
        labelUrl: labelData.data.label,
        labelPdf: labelPdfBase64 || undefined // Convert null to undefined for TypeScript compatibility
      };
    } else {
      return {
        success: false,
        message: `Label generation failed: ${labelData.message || "Unknown error"}`,
        error: labelData.message || "Unknown error"
      };
    }

  } catch (error) {
    console.error("Error in sample implementation:", error);
    return {
      success: false,
      message: `Error: ${error instanceof Error ? error.message : "Unknown error"}`,
      error: error instanceof Error ? error.message : "Unknown error"
    };
  }
}