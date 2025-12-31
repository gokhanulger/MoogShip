import fetch from "node-fetch";

const ARAMEX_BASE_URL = "https://ws.aramex.net/ShippingAPI.V2";
const ARAMEX_RATE_API_URL = `${ARAMEX_BASE_URL}/RateCalculator/Service_1_0.svc/json/CalculateRate`;
const ARAMEX_SHIPPING_API_URL = `${ARAMEX_BASE_URL}/Shipping/Service_1_0.svc/json/CreateShipments`;

// Aramex API credentials from user's working sample
const ARAMEX_ACCOUNT_NUMBER = "72500408";
const ARAMEX_ACCOUNT_PIN = "803507";
const ARAMEX_ACCOUNT_ENTITY = "IST";
const ARAMEX_ACCOUNT_COUNTRY_CODE = "TR";
const ARAMEX_USERNAME = "oguzhan@moogship.com";
const ARAMEX_PASSWORD = "Moogship1423!";

// Aramex API Interfaces
export interface AramexClientInfo {
  UserName: string;
  Password: string;
  Version: string;
  AccountNumber: string;
  AccountPin: string;
  AccountEntity: string;
  AccountCountryCode: string;
}

export interface AramexAddress {
  Line1: string;
  Line2: string;
  Line3: string;
  City: string;
  PostCode: string;
  CountryCode: string;
}

export interface AramexShipmentDetails {
  PaymentType: string;
  ProductGroup: string;
  ProductType: string;
  ActualWeight: {
    Unit: string;
    Value: number;
  };
  ChargeableWeight: {
    Unit: string;
    Value: number;
  };
  NumberOfPieces: number;
  DescriptionOfGoods: string;
  GoodsOriginCountry: string;
  Dimensions: {
    Length: number;
    Width: number;
    Height: number;
    Unit: string;
  };
  PaymentOptions: string;
}

export interface AramexRateRequest {
  ClientInfo: AramexClientInfo;
  Transaction: any;
  OriginAddress: AramexAddress;
  DestinationAddress: AramexAddress;
  ShipmentDetails: AramexShipmentDetails;
  PreferredCurrencyCode?: string;
}

// Enhanced rate calculation function with multiple service options
export async function calculateAramexRates({
  originAddress,
  destinationAddress,
  weightKg,
  numberOfPieces = 1,
  dimensions = { length: 10, width: 10, height: 5 },
}: {
  originAddress: {
    city: string;
    countryCode: string;
    postalCode?: string;
    address?: string;
  };
  destinationAddress: {
    city: string;
    countryCode: string;
    postalCode?: string;
    address?: string;
  };
  weightKg: number;
  numberOfPieces?: number;
  dimensions?: { length: number; width: number; height: number };
}) {
  console.log(`🔶 ARAMEX: calculateAramexRates function called with:`, {
    originAddress,
    destinationAddress,
    weightKg,
    numberOfPieces,
    dimensions,
  });

  // Define available Aramex service types - ONLY PPX (Priority Parcel Express)
  const serviceTypes = [
    { code: "PPX", name: "Aramex Priority Parcel Express", type: "EXPRESS" },
  ];

  const rates = [];

  // Check if this is a country where Aramex typically works well
  const aramexSupportedCountries = [
    "AE", "SA", "KW", "BH", "QA", "OM", "JO", "LB", "EG", "TR", "US", "GB", "DE", "FR"
  ];
  
  const isSupported = aramexSupportedCountries.includes(destinationAddress.countryCode);
  
  if (!isSupported) {
    console.log(`🔶 ARAMEX: Country ${destinationAddress.countryCode} not in primary Aramex coverage area`);
  }

  for (const service of serviceTypes) {
    try {
      const servicePayload: AramexRateRequest = {
        ClientInfo: {
          UserName: ARAMEX_USERNAME,
          Password: ARAMEX_PASSWORD,
          Version: "v1.0",
          AccountNumber: ARAMEX_ACCOUNT_NUMBER,
          AccountPin: ARAMEX_ACCOUNT_PIN,
          AccountEntity: ARAMEX_ACCOUNT_ENTITY,
          AccountCountryCode: "TR",
        },
        Transaction: {
          Reference1: "MoogShipRateRequest",
          Reference2: "",
          Reference3: "",
          Reference4: "",
          Reference5: "",
        },
        OriginAddress: {
          Line1: "Warehouse Istanbul",
          Line2: "",
          Line3: "",
          City: originAddress.city,
          PostCode: originAddress.postalCode || "34394",
          CountryCode: originAddress.countryCode,
        },
        DestinationAddress: {
          Line1: `Customer ${destinationAddress.city}`,
          Line2: "",
          Line3: "",
          City: destinationAddress.city,
          PostCode: destinationAddress.postalCode || "00000",
          CountryCode: destinationAddress.countryCode,
        },
        ShipmentDetails: {
          PaymentType: "P",
          ProductGroup: "EXP",
          ProductType: service.code,
          ActualWeight: {
            Unit: "KG",
            Value: weightKg,
          },
          ChargeableWeight: {
            Unit: "KG",
            Value: weightKg,
          },
          NumberOfPieces: numberOfPieces,
          DescriptionOfGoods: "Baby Accessories",
          GoodsOriginCountry: originAddress.countryCode,
          Dimensions: {
            Length: dimensions.length,
            Width: dimensions.width,
            Height: dimensions.height,
            Unit: "CM",
          },
          PaymentOptions: "",
        },
        PreferredCurrencyCode: "USD",
      };

      console.log(`🔶 ARAMEX: Calling ${service.name} (${service.code})`);

      const response = await fetch(ARAMEX_RATE_API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          "User-Agent": "MoogShip-Node-Client/1.0",
        },
        body: JSON.stringify(servicePayload),
      });

      if (response.ok) {
        const data = await response.json();

        console.log(
          `📄 ARAMEX: Full response for ${service.name} to ${destinationAddress.countryCode}:`,
          JSON.stringify(data, null, 2),
        );

        if (data.HasErrors) {
          console.log(
            `❌ ARAMEX: API Errors for ${service.name} to ${destinationAddress.countryCode}:`,
            data.Notifications,
          );
          
          const hasAccountError = data.Notifications?.some(
            (n) => n.Code === "ERR60" || n.Code === "ERR82",
          );
          if (hasAccountError) {
            console.log(
              `❌ ARAMEX: Skipping ${service.name} due to account configuration issue - no fallback pricing`,
            );
            continue;
          }
        } else if (data.TotalAmount) {
          console.log(
            `✅ ARAMEX: Rate for ${service.name} to ${destinationAddress.countryCode}: ${data.TotalAmount.Value} ${data.TotalAmount.CurrencyCode}`,
          );

          let finalAmount = data.TotalAmount.Value;
          let finalCurrency = data.TotalAmount.CurrencyCode;

          if (data.TotalAmount.CurrencyCode === "TRY") {
            console.log(
              `🔄 ARAMEX: Converting ${data.TotalAmount.Value} TRY to USD with 3% markup...`,
            );
            finalAmount = await convertTryToUsd(data.TotalAmount.Value);
            finalCurrency = "USD";
            console.log(
              `💱 ARAMEX: Converted ${data.TotalAmount.Value} TRY to ${finalAmount} USD (with 3% markup)`,
            );
          }

          rates.push({
            serviceCode: service.code,
            serviceName: service.name,
            serviceType: service.type,
            amount: finalAmount,
            currency: finalCurrency,
            estimatedDays: 2,
          });
        }
      } else {
        const errorText = await response.text();
        console.log(
          `❌ ARAMEX: HTTP Error for ${service.name} to ${destinationAddress.countryCode}: ${response.status} - ${errorText}`,
        );
      }
    } catch (error) {
      console.log(`❌ ARAMEX: Failed to get rate for ${service.name}:`, error);
      continue;
    }
  }

  return rates;
}

// Currency conversion helper function for TRY to USD
export async function convertTryToUsd(tryAmount: number): Promise<number> {
  try {
    // Try TCMB (Turkish Central Bank) for the most authoritative TRY rate
    try {
      const tcmbResponse = await fetch("https://www.tcmb.gov.tr/kurlar/today.xml");
      if (tcmbResponse.ok) {
        const xmlText = await tcmbResponse.text();
        const usdMatch = xmlText.match(
          /<Currency[^>]*CurrencyCode="USD"[^>]*>[\s\S]*?<BanknoteSelling>([^<]+)<\/BanknoteSelling>/,
        );
        if (usdMatch && usdMatch[1]) {
          const rate = parseFloat(usdMatch[1]);
          if (!isNaN(rate)) {
            const adjustedRate = rate * 1.006;
            const usdAmount = tryAmount / adjustedRate;
            const usdAmountWithMarkup = usdAmount * 1.03;
            console.log(
              `💱 ARAMEX: Converting ${tryAmount} TRY to ${usdAmountWithMarkup.toFixed(2)} USD (TCMB rate: ${adjustedRate}, +3% markup)`,
            );
            return parseFloat(usdAmountWithMarkup.toFixed(2));
          }
        }
      }
    } catch (tcmbError) {
      console.warn("TCMB API failed, trying fallback...");
    }

    // Final fallback rate if all APIs fail
    const fallbackRate = 40.0;
    const usdAmount = tryAmount / fallbackRate;
    const usdAmountWithMarkup = usdAmount * 1.03;
    console.log(
      `💱 ARAMEX: Using emergency fallback rate to convert ${tryAmount} TRY to ${usdAmountWithMarkup.toFixed(2)} USD (rate: ${fallbackRate}, +3% markup)`,
    );
    return parseFloat(usdAmountWithMarkup.toFixed(2));
  } catch (error) {
    console.error("❌ ARAMEX: Currency conversion failed:", error);
    return tryAmount;
  }
}

// Calculate chargeable weight (greater of actual weight and volumetric weight)
function calculateChargeableWeight(
  actualWeight: number,
  length: number,
  width: number,
  height: number
): number {
  // Aramex volumetric weight calculation: (L × W × H) / 5000 for international shipments
  const volumetricWeight = (length * width * height) / 5000;
  
  // Return the greater of actual weight and volumetric weight
  const chargeableWeight = Math.max(actualWeight, volumetricWeight);
  
  console.log(`📦 ARAMEX WEIGHT CALCULATION:
    - Actual Weight: ${actualWeight} kg
    - Dimensions: ${length} × ${width} × ${height} cm
    - Volumetric Weight: ${volumetricWeight.toFixed(2)} kg
    - Chargeable Weight: ${chargeableWeight.toFixed(2)} kg`);
  
  return Math.round(chargeableWeight * 100) / 100; // Round to 2 decimal places
}

// Create Aramex shipment function matching user's working sample exactly
// Process multiple Aramex shipments for admin purchase label workflow
export async function processAramexShipments(shipments: any[]) {
  console.log(`🚀 ARAMEX: Processing ${shipments.length} shipments for label purchase`);
  
  const results = {
    success: true,
    message: '',
    shipmentIds: [] as number[], // Use shipmentIds instead of successfulShipmentIds to match controller expectation
    successfulShipmentIds: [] as number[],
    failedShipmentIds: [] as number[],
    trackingNumbers: {} as Record<number, string>,
    carrierTrackingNumbers: {} as Record<number, string>,
    labelUrls: {} as Record<number, string>,
    labelPdfs: {} as Record<number, string>,
    carrierLabelUrls: {} as Record<number, string>,
    carrierLabelPdfs: {} as Record<number, string>,
    shipmentErrors: {} as Record<number, string>
  };

  for (const shipment of shipments) {
    try {
      console.log(`📮 ARAMEX: Processing shipment ${shipment.id} with service ${shipment.providerServiceCode || 'PPX'}`);
      
      // Extract service code from providerServiceCode (e.g., "aramex-ppx" -> "PPX")
      let serviceCode = "PPX"; // default
      if (shipment.providerServiceCode) {
        const serviceParts = shipment.providerServiceCode.toLowerCase().split('-');
        if (serviceParts.length > 1) {
          serviceCode = serviceParts[serviceParts.length - 1].toUpperCase();
        }
      }
      
      const aramexResult = await createAramexShipment({
        shipment,
        serviceCode
      });

      if (aramexResult.success && aramexResult.tracking_number) {
        results.shipmentIds.push(shipment.id); // Add to shipmentIds for controller compatibility
        results.successfulShipmentIds.push(shipment.id);
        results.carrierTrackingNumbers[shipment.id] = aramexResult.tracking_number;
        
        if (aramexResult.label_url) {
          results.carrierLabelUrls[shipment.id] = aramexResult.label_url;
        }
        
        if (aramexResult.label_pdf) {
          results.carrierLabelPdfs[shipment.id] = aramexResult.label_pdf;
          console.log(`📄 ARAMEX: Stored PDF for shipment ${shipment.id} (${aramexResult.label_pdf.length} characters)`);
        }
        
        console.log(`✅ ARAMEX: Successfully processed shipment ${shipment.id} - tracking: ${aramexResult.tracking_number}`);
      } else {
        results.failedShipmentIds.push(shipment.id);
        results.shipmentErrors[shipment.id] = aramexResult.error || 'Unknown Aramex API error';
        console.error(`❌ ARAMEX: Failed to process shipment ${shipment.id}: ${results.shipmentErrors[shipment.id]}`);
      }
    } catch (error: any) {
      results.failedShipmentIds.push(shipment.id);
      results.shipmentErrors[shipment.id] = error.message || 'Aramex processing error';
      console.error(`❌ ARAMEX: Error processing shipment ${shipment.id}:`, error);
    }
  }

  results.success = results.shipmentIds.length > 0;
  results.message = `Processed ${results.shipmentIds.length}/${shipments.length} Aramex shipments successfully`;
  
  console.log(`📊 ARAMEX: Batch complete - ${results.shipmentIds.length} successful, ${results.failedShipmentIds.length} failed`);
  console.log(`🔍 ARAMEX FINAL DEBUG: Returning results with carrierLabelPdfs containing ${Object.keys(results.carrierLabelPdfs).length} entries`);
  console.log(`🔍 ARAMEX FINAL DEBUG: carrierLabelPdfs keys: ${Object.keys(results.carrierLabelPdfs)}`);
  console.log(`🔍 ARAMEX FINAL DEBUG: carrierTrackingNumbers keys: ${Object.keys(results.carrierTrackingNumbers)}`);
  return results;
}

export async function createAramexShipment({
  shipment,
  serviceCode = "PPX",
}: {
  shipment: any;
  serviceCode?: string;
}) {
  try {
    console.log(
      `🚀 ARAMEX: Creating shipment for ${shipment.id} with service ${serviceCode}`,
    );

    // Function to convert date to Aramex format - EXACT match from user sample
    const toAramexDateFormat = (date: Date) => {
      return `/Date(${date.getTime()})/`;
    };

    const now = new Date();

    // Build payload exactly matching user's successful structure
    const payload = {
      ClientInfo: {
        UserName: ARAMEX_USERNAME,
        Password: ARAMEX_PASSWORD,
        Version: "v1.0",
        AccountNumber: ARAMEX_ACCOUNT_NUMBER,
        AccountPin: ARAMEX_ACCOUNT_PIN,
        AccountEntity: ARAMEX_ACCOUNT_ENTITY,
        AccountCountryCode: ARAMEX_ACCOUNT_COUNTRY_CODE
      },
      Transaction: {
        Reference1: `SH-${String(shipment.id).padStart(6, '0')}`,
        Reference2: "",
        Reference3: "",
        Reference4: "",
        Reference5: ""
      },
      Shipments: [
        {
          Reference1: `Order#${shipment.id}`,
          Shipper: {
            Reference1: "",
            Reference2: "",
            AccountNumber: ARAMEX_ACCOUNT_NUMBER,
            PartyAddress: {
              Line1: shipment.senderAddress || "Maltepe Mah. Ciftehavuzlar Cad.",
              Line2: shipment.senderAddress2 || "",
              Line3: "",
              City: shipment.senderCity || "Istanbul",
              PostCode: shipment.senderPostalCode || "34010",
              CountryCode: shipment.senderCountryCode || "TR"
            },
            Contact: {
              Department: "",
              PersonName: shipment.senderName || "Sender",
              CompanyName: shipment.senderCompany || "MoogShip",
              PhoneNumber1: shipment.senderPhone || "+90 543 346 46 55",
              PhoneNumber2: "",
              CellPhone: shipment.senderPhone || "+90 543 346 46 55",
              EmailAddress: shipment.senderEmail || "export@mekpaz.com",
              Type: "C"
            }
          },
          Consignee: {
            Reference1: "",
            Reference2: "",
            AccountNumber: "",
            PartyAddress: {
              Line1: shipment.receiverAddress || "Customer Address",
              Line2: shipment.receiverAddress2 || "",
              Line3: "",
              City: shipment.receiverCity || "Dubai",
              PostCode: shipment.receiverPostalCode || "00000",
              CountryCode: shipment.receiverCountryCode || "AE"
            },
            Contact: {
              Department: "",
              PersonName: shipment.receiverName || "Customer",
              CompanyName: shipment.receiverCompany || "",
              PhoneNumber1: shipment.receiverPhone || "+971556863700",
              PhoneNumber2: "",
              CellPhone: shipment.receiverPhone || "+971556863700",
              EmailAddress: shipment.receiverEmail || shipment.senderEmail || "info@moogship.com",
              Type: "C"
            }
          },
          ShippingDateTime: toAramexDateFormat(now),
          DueDate: toAramexDateFormat(now),
          PickupLocation: "Warehouse",
          Details: {
            Dimensions: {
              Length: shipment.packageLength || "",
              Width: shipment.packageWidth || "",
              Height: shipment.packageHeight || "",
              Unit: "CM"
            },
            ActualWeight: {
              Unit: "KG",
              Value: shipment.packageWeight || ""
            },
            ChargeableWeight: {
              Unit: "KG",
              Value: calculateChargeableWeight(
                shipment.packageWeight || 0,
                shipment.packageLength || 0,
                shipment.packageWidth || 0,
                shipment.packageHeight || 0
              )
            },
            ProductGroup: "EXP",
            ProductType: serviceCode,
            PaymentType: "P",
            PaymentOptions: "",
            Services: "",
            NumberOfPieces: shipment.pieceCount || 1,
            DescriptionOfGoods: shipment.packageContents || "Package",
            GoodsOriginCountry: shipment.senderCountryCode || "TR",
            Items: [
              {
                PackageType: "Box",
                Quantity: 1,
                Weight: {
                  Unit: "KG",
                  Value: Math.max(1, Math.floor(shipment.packageWeight || 1))
                },
                Comments: `Contains ${shipment.packageContents || "items"}`,
                Reference: shipment.senderCompany || "MoogShip"
              }
            ]
          }
        }
      ],
      LabelInfo: {
        ReportID: 9201,
        ReportType: "URL"
      }
    };

    console.log("📦 ARAMEX: Payload structure:", JSON.stringify(payload, null, 2));

    const response = await fetch(ARAMEX_SHIPPING_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'User-Agent': 'MoogShip-Aramex-Client/1.0'
      },
      body: JSON.stringify(payload)
    });

    console.log(`📡 ARAMEX: Response status: ${response.status}`);

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ ARAMEX: HTTP Error ${response.status}:`, errorText);
      return {
        success: false,
        error: `Aramex API HTTP error: ${response.status} - ${errorText}`,
        tracking_number: null,
        label_url: null,
        label_pdf: null
      };
    }

    const result = await response.json();
    console.log("✅ ARAMEX: API Response:", JSON.stringify(result, null, 2));

    if (result.HasErrors) {
      console.error("❌ ARAMEX: API returned errors:", result.Notifications);
      return {
        success: false,
        error: `Aramex API error: ${JSON.stringify(result.Notifications)}`,
        tracking_number: null,
        label_url: null,
        label_pdf: null
      };
    }

    // Extract tracking number and label URL from successful response
    if (result.Shipments && result.Shipments.length > 0) {
      const shipmentResult = result.Shipments[0];
      
      console.log("🔍 ARAMEX: shipmentResult structure:", JSON.stringify(shipmentResult, null, 2));
      console.log("🔍 ARAMEX: ShipmentLabel exists:", !!shipmentResult.ShipmentLabel);
      console.log("🔍 ARAMEX: LabelURL:", shipmentResult.ShipmentLabel?.LabelURL);
      
      // Try to download PDF from label URL if provided
      let labelPdfBase64 = null;
      const labelUrl = shipmentResult.ShipmentLabel?.LabelURL;
      if (labelUrl) {
        try {
          console.log(`📄 ARAMEX: Downloading PDF from: ${labelUrl}`);
          const labelResponse = await fetch(labelUrl);
          if (labelResponse.ok) {
            const labelBuffer = await labelResponse.arrayBuffer();
            labelPdfBase64 = Buffer.from(labelBuffer).toString("base64");
            console.log(`📄 ARAMEX: Successfully downloaded PDF, size: ${labelPdfBase64.length} characters`);
          } else {
            console.warn(`❌ ARAMEX: PDF download failed with status: ${labelResponse.status}`);
          }
        } catch (downloadError) {
          console.error("❌ ARAMEX: Failed to download label PDF:", downloadError);
        }
      } else {
        console.warn("❌ ARAMEX: No label URL found in response");
      }
      
      return {
        success: true,
        tracking_number: shipmentResult.ID,
        label_url: labelUrl,
        label_pdf: labelPdfBase64,
        aramex_response: result
      };
    } else {
      return {
        success: false,
        error: "No shipment data in Aramex response",
        tracking_number: null,
        label_url: null,
        label_pdf: null
      };
    }

  } catch (error: any) {
    console.error("❌ ARAMEX: Shipment creation failed:", error);
    return {
      success: false,
      error: error.message || "Unknown Aramex API error",
      tracking_number: null,
      label_url: null,
      label_pdf: null
    };
  }
}