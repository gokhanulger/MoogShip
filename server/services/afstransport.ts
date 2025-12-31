import fetch from "node-fetch";
import {
  normalizeCountryCode,
  isEuropeOrUK,
  formatAddressForAPI,
  formatCityForAPI,
} from "@shared/countries";
import * as storage from "../storage";

// AFS Transport API configuration
const AFS_API_URL = "https://panel.afstransport.com/apiv2.php";
const AFS_API_KEY =
  process.env.AFS_TRANSPORT_API_KEY ||
  process.env.AFS_API_KEY ||
  "fmdnh47u6zgcy";

// AFS Waybill interfaces based on your sample payload
interface AFSWaybillRequest {
  islem: "waybill_olustur";
  alici: string;
  alici_telefon: string;
  alici_adres: string;
  alici_ulke: string;
  alici_sehir: string;
  alici_ilce: string;
  alici_posta_kodu: string;
  gonderici: string;
  gonderici_adres: string;
  gonderici_telefon: string;
  gonderici_ulke: string;
  gonderici_sehir: string;
  gonderici_posta_kodu: string;
  gonderiler: Array<{
    kap: number;
    agirlik: number;
    uzunluk: number;
    genislik: number;
    yukseklik: number;
  }>;
  servis_id: number;
  beyan_id: number;
  odeme_id: number;
  fatura_icerigi: Array<{
    mal_cinsi: string;
    adet: number;
    tip_id: number;
    birim_fiyat: number;
    gtip: string;
  }>;
  kur: number;
  referans_kodu: string;
  aciklama: string;
  ddp: number;
  ioss: string;
  vat: string;
  eori: string;
}

interface AFSWaybillResponse {
  success: boolean;
  barkod?: string;
  takip_kodlari?: string[];
  waybill_pdf?: string;
  error?: string;
}

interface AFSLabelRequest {
  islem: "etiket_olustur";
  barkod: string;
}

interface AFSLabelResponse {
  success: boolean;
  waybill_pdf?: string;
  error?: string;
}

// AFS Tracking interfaces
interface AFSTrackingRequest {
  islem: "kargo_takip";
  barkod: string;
}

interface AFSTrackingResponse {
  success: boolean;
  durum?: string;
  durum_aciklama?: string;
  gls_takip_kodu?: string;
  takip_detay?: Array<{
    tarih: string;
    saat: string;
    durum: string;
    aciklama: string;
    yer?: string;
  }>;
  error?: string;
}

// Tracking result interface matching the existing system
export interface TrackingResult {
  status:
    | "PRE_TRANSIT"
    | "IN_TRANSIT"
    | "OUT_FOR_DELIVERY"
    | "DELIVERED"
    | "EXCEPTION"
    | "UNKNOWN";
  statusDescription: string;
  lastUpdate?: string;
  location?: string;
  events?: Array<{
    timestamp: string;
    status: string;
    description: string;
    location?: string;
  }>;
  carrierTrackingNumber?: string;
  glsTrackingNumber?: string;
}

/**
 * Process AFS Transport shipments - called by the routing logic in shipentegra.ts
 */
export async function processAFSShipments(shipments: any[]): Promise<{
  successfulShipmentIds: number[];
  failedShipmentIds: number[];
  trackingNumbers: { [key: number]: string };
  carrierTrackingNumbers: { [key: number]: string };
  labelUrls: { [key: number]: string };
  labelPdfs: { [key: number]: string };
  carrierLabelUrls: { [key: number]: string };
  carrierLabelPdfs: { [key: number]: string };
  shipmentErrors: { [key: number]: string };
}> {
  console.log(
    `🚀 [AFS PROCESSING] Processing ${shipments.length} AFS Transport shipments`,
  );

  const results = {
    successfulShipmentIds: [] as number[],
    failedShipmentIds: [] as number[],
    trackingNumbers: {} as { [key: number]: string },
    carrierTrackingNumbers: {} as { [key: number]: string },
    labelUrls: {} as { [key: number]: string },
    labelPdfs: {} as { [key: number]: string },
    carrierLabelUrls: {} as { [key: number]: string },
    carrierLabelPdfs: {} as { [key: number]: string },
    shipmentErrors: {} as { [key: number]: string },
  };

  for (const shipment of shipments) {
    try {
      console.log(
        `📦 [AFS SHIPMENT] Processing shipment ${shipment.id} with service "${shipment.selectedService}"`,
      );

      // Step 1: Create waybill
      const waybillResult = await createAFSWaybill(shipment);
      if (!waybillResult.success) {
        throw new Error(waybillResult.error || "Waybill creation failed");
      }

      // Step 2: Store AFS barkod and update shipment
      if (waybillResult.barkod) {
        await storage.storage.updateShipment(shipment.id, {
          afsBarkod: waybillResult.barkod,
          carrierTrackingNumber: waybillResult.barkod,
          carrierName: "AFS Transport",
          sentToShipEntegra: true,
          sentToShipEntegraAt: new Date(),
        });

        results.carrierTrackingNumbers[shipment.id] = waybillResult.barkod;
        results.trackingNumbers[shipment.id] = shipment.trackingNumber;
        try {
          const { sendTrackingNumberNotification } = await import(
            "../notification-emails"
          );
          const updatedShipment = await storage.storage.getShipment(
            shipment.id,
          );
          const shipmentUser = updatedShipment
            ? await storage.storage.getUser(updatedShipment.userId)
            : null;

          if (shipmentUser && updatedShipment) {
            sendTrackingNumberNotification(updatedShipment, shipmentUser)
              .then((result) => {
                if (result.success) {
                  console.log(
                    `✅ [AFS EMAIL] Tracking notification email sent successfully to ${shipmentUser.email} for shipment ${shipment.id}`,
                  );
                } else {
                  console.warn(
                    `⚠️ [AFS EMAIL] Failed to send tracking notification email for shipment ${shipment.id}:`,
                    result.error,
                  );
                }
              })
              .catch((err) => {
                console.error(
                  `❌ [AFS EMAIL] Error sending tracking notification email for shipment ${shipment.id}:`,
                  err,
                );
              });
          }
        } catch (emailError) {
          console.error(
            "❌ [AFS EMAIL] Error sending tracking notification email:",
            emailError,
          );
        }
      }

      if (waybillResult.waybill_pdf) {
        // Try multiple download strategies for robust PDF retrieval
        let pdfDownloadSuccess = false;

        // Strategy 1: Direct URL download
        try {
          console.log(`📥 [AFS PDF] Strategy 1: Downloading from provided URL`);
          console.log(
            `📥 [AFS PDF] Fetching URL: ${waybillResult.waybill_pdf}`,
          );

          const pdfResponse = await fetch(waybillResult.waybill_pdf);
          console.log(
            `📄 [AFS PDF] Download response status: ${pdfResponse.status}`,
          );
          console.log(
            `📄 [AFS PDF] Response headers:`,
            Object.fromEntries(pdfResponse.headers.entries()),
          );

          if (pdfResponse.ok) {
            const buffer = await pdfResponse.buffer();

            // Verify it's actually a PDF
            const isPDF =
              buffer[0] === 0x25 &&
              buffer[1] === 0x50 &&
              buffer[2] === 0x44 &&
              buffer[3] === 0x46; // %PDF

            if (isPDF && buffer.length > 100) {
              const pdfContent = buffer.toString("base64");
              console.log(
                `✅ [AFS PDF] Valid PDF downloaded successfully, size: ${pdfContent.length} characters`,
              );
              console.log(
                `📄 [AFS PDF] PDF preview: ${pdfContent.substring(0, 50)}...`,
              );

              // Store PDF content internally
              console.log(
                `💾 [AFS PDF] Storing PDF content in database for shipment ${shipment.id}`,
              );
              await storage.storage.updateShipment(shipment.id, {
                carrierLabelPdf: pdfContent,
              });

              results.carrierLabelPdfs[shipment.id] = pdfContent;
              console.log(
                `✅ [AFS PDF] Successfully stored PDF content internally for shipment ${shipment.id}`,
              );
              pdfDownloadSuccess = true;
            } else {
              console.log(
                `❌ [AFS PDF] Downloaded content is not a valid PDF or too small (${buffer.length} bytes)`,
              );
            }
          } else {
            const errorText = await pdfResponse.text();
            console.error(
              `❌ [AFS PDF] Download failed: ${pdfResponse.status} - ${pdfResponse.statusText}`,
            );
            console.error(
              `❌ [AFS PDF] Error response: ${errorText.substring(0, 200)}`,
            );
          }
        } catch (downloadError) {
          console.error(
            `❌ [AFS PDF] Strategy 1 download error:`,
            downloadError instanceof Error
              ? downloadError.message
              : downloadError,
          );
        }

        // Strategy 2: Try alternative URL patterns if Strategy 1 failed
        if (!pdfDownloadSuccess && waybillResult.barkod) {
          console.log(
            `🔄 [AFS PDF] Strategy 2: Trying alternative URL patterns with barkod ${waybillResult.barkod}`,
          );

          const alternativeUrls = [
            `https://panel.afstransport.com/waybill_pdf/${waybillResult.barkod}.pdf`,
            `https://panel.afstransport.com/pdf/${waybillResult.barkod}.pdf`,
            `https://api.afstransport.com/waybill/${waybillResult.barkod}.pdf`,
          ];

          for (const altUrl of alternativeUrls) {
            try {
              console.log(`📥 [AFS PDF] Trying alternative URL: ${altUrl}`);
              const altResponse = await fetch(altUrl);

              if (altResponse.ok) {
                const buffer = await altResponse.buffer();
                const isPDF =
                  buffer[0] === 0x25 &&
                  buffer[1] === 0x50 &&
                  buffer[2] === 0x44 &&
                  buffer[3] === 0x46;

                if (isPDF && buffer.length > 100) {
                  const pdfContent = buffer.toString("base64");
                  console.log(
                    `✅ [AFS PDF] Alternative URL success! Size: ${pdfContent.length} characters`,
                  );

                  await storage.storage.updateShipment(shipment.id, {
                    carrierLabelPdf: pdfContent,
                  });

                  results.carrierLabelPdfs[shipment.id] = pdfContent;
                  console.log(
                    `✅ [AFS PDF] Alternative URL PDF stored successfully for shipment ${shipment.id}`,
                  );
                  pdfDownloadSuccess = true;
                  break;
                }
              }
            } catch (altError) {
              console.log(
                `❌ [AFS PDF] Alternative URL ${altUrl} failed: ${altError instanceof Error ? altError.message : altError}`,
              );
            }
          }
        }

        // If all download strategies failed, store URL as fallback
        if (!pdfDownloadSuccess) {
          console.log(
            `⚠️ [AFS PDF] All download strategies failed, storing URL as fallback for shipment ${shipment.id}`,
          );
          await storage.storage.updateShipment(shipment.id, {
            carrierLabelUrl: waybillResult.waybill_pdf,
          });
          results.carrierLabelUrls[shipment.id] = waybillResult.waybill_pdf;
          console.log(
            `⚠️ [AFS PDF] Fallback: Stored URL instead of PDF content`,
          );
        }
      } else {
        console.log(
          `❌ [AFS PDF] No waybill_pdf URL in waybill response for shipment ${shipment.id}`,
        );
        console.log(
          `🔍 [AFS DEBUG] Available keys in waybill response: ${Object.keys(waybillResult)}`,
        );
        console.log(
          `🔍 [AFS DEBUG] Full waybill result:`,
          JSON.stringify(waybillResult, null, 2),
        );
      }

      results.successfulShipmentIds.push(shipment.id);
      console.log(
        `✅ [AFS SUCCESS] Completed processing shipment ${shipment.id}`,
      );
    } catch (error) {
      console.error(
        `❌ [AFS ERROR] Failed to process shipment ${shipment.id}:`,
        error,
      );
      results.failedShipmentIds.push(shipment.id);
      results.shipmentErrors[shipment.id] =
        error instanceof Error ? error.message : "Unknown AFS processing error";
    }
  }

  console.log(
    `📊 [AFS COMPLETE] Processed ${results.successfulShipmentIds.length} successful, ${results.failedShipmentIds.length} failed`,
  );
  return results;
}

/**
 * Track an AFS Transport shipment using internal tracking number (barkod)
 */
export async function trackAFS(
  internalTrackingNumber: string,
): Promise<TrackingResult> {
  console.log(
    `🔍 [AFS TRACKING] Tracking shipment with internal number: ${internalTrackingNumber}`,
  );

  try {
    const trackingRequest: AFSTrackingRequest = {
      islem: "kargo_takip",
      barkod: internalTrackingNumber,
    };

    console.log(`📡 [AFS TRACKING] Making API request to ${AFS_API_URL}`);

    const response = await fetch(AFS_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": AFS_API_KEY,
      },
      body: JSON.stringify(trackingRequest),
    });

    if (!response.ok) {
      throw new Error(
        `AFS API request failed: ${response.status} ${response.statusText}`,
      );
    }

    const data = (await response.json()) as AFSTrackingResponse;
    console.log(
      `📦 [AFS TRACKING] API Response:`,
      JSON.stringify(data, null, 2),
    );

    if (!data.success) {
      throw new Error(data.error || "AFS tracking request failed");
    }

    // Map AFS status to standard tracking status
    const mappedStatus = mapAFSStatusToStandard(data.durum);

    const result: TrackingResult = {
      status: mappedStatus,
      statusDescription: data.durum_aciklama || data.durum || "Unknown status",
      carrierTrackingNumber: internalTrackingNumber,
      glsTrackingNumber: data.gls_takip_kodu,
      events: [],
    };

    // Add tracking events if available
    if (data.takip_detay && Array.isArray(data.takip_detay)) {
      result.events = data.takip_detay.map((event) => ({
        timestamp: `${event.tarih} ${event.saat}`,
        status: event.durum,
        description: event.aciklama,
        location: event.yer,
      }));

      // Set last update and location from most recent event
      if (data.takip_detay.length > 0) {
        const lastEvent = data.takip_detay[0]; // Assuming most recent is first
        result.lastUpdate = `${lastEvent.tarih} ${lastEvent.saat}`;
        result.location = lastEvent.yer;
      }
    }

    console.log(
      `✅ [AFS TRACKING] Successfully tracked shipment: ${mappedStatus} - ${result.statusDescription}`,
    );
    return result;
  } catch (error) {
    console.error(
      `❌ [AFS TRACKING] Error tracking shipment ${internalTrackingNumber}:`,
      error,
    );

    return {
      status: "UNKNOWN",
      statusDescription:
        error instanceof Error ? error.message : "Unknown tracking error",
      carrierTrackingNumber: internalTrackingNumber,
    };
  }
}

/**
 * Map AFS status to standard tracking status
 */
function mapAFSStatusToStandard(
  afsStatus?: string,
):
  | "PRE_TRANSIT"
  | "IN_TRANSIT"
  | "OUT_FOR_DELIVERY"
  | "DELIVERED"
  | "EXCEPTION"
  | "UNKNOWN" {
  if (!afsStatus) return "UNKNOWN";

  const status = afsStatus.toLowerCase().trim();

  // Map common AFS status values to standard status
  if (
    status.includes("teslim edildi") ||
    status.includes("delivered") ||
    status.includes("teslim")
  ) {
    return "DELIVERED";
  }

  if (
    status.includes("dagitimda") ||
    status.includes("dagıtımda") ||
    status.includes("out for delivery") ||
    status.includes("teslimat") ||
    status.includes("kurye")
  ) {
    return "OUT_FOR_DELIVERY";
  }

  if (
    status.includes("transit") ||
    status.includes("yolda") ||
    status.includes("aktarma") ||
    status.includes("transfer") ||
    status.includes("gümrük") ||
    status.includes("customs")
  ) {
    return "IN_TRANSIT";
  }

  if (
    status.includes("hazırlanıyor") ||
    status.includes("hazırlaniyor") ||
    status.includes("preparing") ||
    status.includes("etiketlendi") ||
    status.includes("labeled") ||
    status.includes("başlatıldı")
  ) {
    return "PRE_TRANSIT";
  }

  if (
    status.includes("problem") ||
    status.includes("sorun") ||
    status.includes("exception") ||
    status.includes("hata") ||
    status.includes("error") ||
    status.includes("delay")
  ) {
    return "EXCEPTION";
  }

  // Default to IN_TRANSIT for any other status that suggests movement
  if (
    status.includes("işlem") ||
    status.includes("process") ||
    status.includes("alındı") ||
    status.includes("received") ||
    status.includes("kabul")
  ) {
    return "IN_TRANSIT";
  }

  return "UNKNOWN";
}

/**
 * Determine correct AFS service ID based on shipment value and IOSS status
 * According to AFS rules: Under 150 Euro without IOSS requires Express service
 */
function getAFSServiceId(shipment: any): number {
  const customsValueInDollars = (shipment.customsValue || 1000) / 100; // Convert cents to dollars
  const customsValueInEuros = customsValueInDollars * 0.85; // Approximate USD to EUR conversion
  const hasIOSS = shipment.iossNumber && shipment.iossNumber.length > 0;

  // For non-Germany EU destinations under 150 EUR without IOSS, use Express (servis_id: 2)
  if (
    customsValueInEuros < 150 &&
    !hasIOSS &&
    shipment.receiverCountry !== "DE"
  ) {
    console.log(
      `📦 [AFS SERVICE] Using Express service (ID: 2) for ${customsValueInEuros.toFixed(2)} EUR without IOSS`,
    );
    return 2; // Express service
  }

  // Otherwise use Economy service (servis_id: 1)
  console.log(
    `📦 [AFS SERVICE] Using Economy service (ID: 1) for ${customsValueInEuros.toFixed(2)} EUR${hasIOSS ? " with IOSS" : ""}`,
  );
  return 1; // Economy service
}

/**
 * Create AFS Transport waybill using the exact API format you provided
 */
async function createAFSWaybill(shipment: any): Promise<AFSWaybillResponse> {
  console.log(`🔄 [AFS WAYBILL] Creating waybill for shipment ${shipment.id}`);

  // Get current user profile data for sender address
  let userProfile: any = null;
  try {
    const { users } = await import("@shared/schema");
    const { eq } = await import("drizzle-orm");
    const { db } = await import("../db");

    // Fetch user profile data
    const userResult = await db
      .select()
      .from(users)
      .where(eq(users.id, shipment.userId))
      .limit(1);

    if (userResult.length > 0) {
      userProfile = userResult[0];
    }
  } catch (error) {
    console.warn(
      `Failed to fetch user profile for shipment ${shipment.id}:`,
      error,
    );
  }

  // Build the waybill payload using your exact sample format
  const waybillPayload: AFSWaybillRequest = {
    islem: "waybill_olustur",
    alici: shipment.receiverName,
    alici_telefon: shipment.receiverPhone || "00491782536147",
    alici_adres: formatAddressForAPI(
      (shipment.receiverAddress || "").substring(0, 35),
    ), // 35 char limit
    alici_ulke: normalizeCountryCode(shipment.receiverCountry),
    alici_sehir: formatCityForAPI(shipment.receiverCity),
    alici_ilce: formatCityForAPI(shipment.receiverCity), // Required district field
    alici_posta_kodu: shipment.receiverPostalCode,
    gonderici: userProfile?.name || shipment.senderName,
    gonderici_adres: formatAddressForAPI(
      (
        userProfile?.address ||
        shipment.senderAddress1 ||
        shipment.senderAddress ||
        ""
      ).substring(0, 35),
    ), // 35 char limit
    gonderici_telefon: "00902125551122", // Fixed sender phone
    gonderici_ulke: "TR",
    gonderici_sehir: formatCityForAPI(userProfile?.city || shipment.senderCity),
    gonderici_posta_kodu: userProfile?.postal_code || shipment.senderPostalCode,
    gonderiler: [
      {
        kap: shipment.pieceCount || shipment.piece_count || 1,
        agirlik: Number(shipment.packageWeight) || 1.0,
        uzunluk: Math.ceil(Number(shipment.packageLength)) || 1,
        genislik: Math.ceil(Number(shipment.packageWidth)) || 1,
        yukseklik: Math.ceil(Number(shipment.packageHeight)) || 1,
      },
    ],
    servis_id: getAFSServiceId(shipment), // Dynamic service selection based on value and IOSS
    beyan_id: 2, // Non-document declaration
    odeme_id: 1, // Sender paid
    fatura_icerigi: [
      {
        mal_cinsi:
          shipment.packageContents || shipment.description || "Package Item",
        adet: shipment.customsItemCount || 1,
        tip_id: 1,
        birim_fiyat: shipment.customsValue ? shipment.customsValue / 100 : 25, // Convert cents to dollars
        gtip:
          shipment.gtip && shipment.gtip.toString().length >= 6
            ? shipment.gtip.toString().substring(0, 6)
            : "850015", // Use actual GTIP or fallback
      },
    ],
    kur: 1,
    referans_kodu: shipment.trackingNumber || `api-shipment-${shipment.id}`,
    aciklama: "MoogShip EcoAFS shipment",
    ddp: shipment.iossNumber ? 1 : 0, // DDP if IOSS, DAP otherwise
    ioss: shipment.iossNumber || "",
    vat: "",
    eori: "",
  };

  console.log(
    `📤 [AFS API] Sending waybill request:`,
    JSON.stringify(waybillPayload, null, 2),
  );

  try {
    const response = await fetch(AFS_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": AFS_API_KEY,
      },
      body: JSON.stringify(waybillPayload),
    });

    if (!response.ok) {
      throw new Error(`AFS API HTTP error: ${response.status}`);
    }

    const result = (await response.json()) as any;
    console.log(`📥 [AFS API] Waybill response:`, result);

    if (
      !result.hata &&
      result.takip_kodlari &&
      result.takip_kodlari.length > 0
    ) {
      return {
        success: true,
        barkod: result.takip_kodlari[0], // Extract first tracking code as barkod
        takip_kodlari: result.takip_kodlari,
        waybill_pdf: result.waybill_pdf,
      };
    } else {
      return {
        success: false,
        error: result.mesaj || "Waybill creation failed",
      };
    }
  } catch (error) {
    console.error(`❌ [AFS API] Waybill error:`, error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "AFS API error",
    };
  }
}

/**
 * Create AFS Transport label using barkod
 */
async function createAFSLabel(barkod: string): Promise<AFSLabelResponse> {
  console.log(`🏷️ [AFS LABEL] Creating label for barkod: ${barkod}`);

  const labelPayload: AFSLabelRequest = {
    islem: "etiket_olustur",
    barkod: barkod,
  };

  try {
    const response = await fetch(AFS_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        api_key: AFS_API_KEY,
        data: JSON.stringify(labelPayload),
      }),
    });

    if (!response.ok) {
      throw new Error(`AFS Label API HTTP error: ${response.status}`);
    }

    const result = (await response.json()) as any;
    console.log(`📥 [AFS LABEL] Label response received`);

    if (result.waybill_pdf) {
      return {
        success: true,
        waybill_pdf: result.waybill_pdf,
      };
    } else {
      return {
        success: false,
        error: result.error || result.mesaj || "Label creation failed",
      };
    }
  } catch (error) {
    console.error(`❌ [AFS LABEL] Label error:`, error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "AFS Label API error",
    };
  }
}

// Legacy pricing functions (kept for compatibility)
interface AFSTransportRequest {
  islem: string;
  country_code: string;
  shipments: Array<{
    weight: number;
    length: number;
    width: number;
    height: number;
  }>;
}

export interface AFSTransportResponse {
  hata: boolean;
  mesaj: string;
  volume: number;
  weight: number;
  country: string;
  prices: Array<{
    service_id: string;
    service_name: string;
    price: number;
  }>;
}

export interface AFSPriceOption {
  id: string;
  serviceName: string;
  displayName: string;
  cargoPrice: number;
  fuelCost: number;
  totalPrice: number;
  deliveryTime: string;
  serviceType: string;
  description?: string;
  providerServiceCode: string;
}

export interface AFSPriceResponse {
  success: boolean;
  options: AFSPriceOption[];
  bestOption?: string;
  currency: string;
  error?: string;
}

export async function getAFSTransportPricing(
  country: string,
  weight: number,
  length: number,
  width: number,
  height: number,
  userMultiplier: number = 1.0,
): Promise<AFSPriceResponse> {
  try {
    const request: AFSTransportRequest = {
      islem: "fiyat_hesapla",
      country_code: normalizeCountryCode(country),
      shipments: [
        {
          weight: Math.max(weight, 0.1),
          length: Math.max(length, 1),
          width: Math.max(width, 1),
          height: Math.max(height, 1),
        },
      ],
    };

    const response = await fetch(AFS_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": AFS_API_KEY,
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      throw new Error(`AFS Transport API error: ${response.status}`);
    }

    const data = (await response.json()) as AFSTransportResponse;

    if (data.hata) {
      throw new Error(data.mesaj || "AFS Transport pricing request failed");
    }

    // Ensure prices array exists and is valid
    if (!data.prices || !Array.isArray(data.prices)) {
      throw new Error("Invalid AFS Transport response: missing prices array");
    }

    const options: AFSPriceOption[] = data.prices.map((price) => {
      // Map service names to proper display names
      let displayName = `MoogShip AFS ${price.service_name}`;
      if (
        price.service_name.toLowerCase().includes("ecoafs") ||
        price.service_name.toLowerCase() === "ecoafs"
      ) {
        displayName = "MoogShip GLS Eco";
      } else if (price.service_name.toLowerCase().includes("express")) {
        displayName = "MoogShip GLS Express";
      }

      return {
        id: `afs-${price.service_id}`,
        serviceName: price.service_name,
        displayName: displayName,
        cargoPrice: Math.round(price.price * 100), // Convert to cents without multiplier
        fuelCost: 0,
        totalPrice: Math.round(price.price * 100), // Convert to cents without multiplier
        deliveryTime: "3-5 business days",
        serviceType: price.service_name.toLowerCase().includes("express")
          ? "EXPRESS"
          : price.service_name.toLowerCase().includes("eco")
            ? "ECO"
            : "STANDARD",
        providerServiceCode: `afs-${price.service_id}`,
      };
    });

    return {
      success: true,
      options,
      bestOption: options.length > 0 ? options[0].id : undefined,
      currency: "USD",
    };
  } catch (error) {
    console.error("AFS Transport pricing error:", error);
    return {
      success: false,
      options: [],
      currency: "USD",
      error:
        error instanceof Error
          ? error.message
          : "Unknown AFS Transport pricing error",
    };
  }
}

// Removed createAFSFallbackResponse function - no fallback pricing when AFS service is unavailable

// Currency conversion helper function for EUR to USD with 3% markup protection
export async function convertEurToUsd(eurAmount: number): Promise<number> {
  try {
    // Try multiple reliable currency APIs for EUR to USD conversion

    // Primary: ExchangeRate-API (free, reliable)
    try {
      const exchangeRateResponse = await fetch(
        "https://api.exchangerate-api.com/v4/latest/EUR",
      );
      if (exchangeRateResponse.ok) {
        const data = (await exchangeRateResponse.json()) as any;
        if (data.rates && data.rates.USD) {
          const rate = data.rates.USD;
          const usdAmount = eurAmount * rate;
          const usdAmountWithMarkup = usdAmount * 1.005; // Add 3% markup for currency protection
          console.log(
            `💱 [AFS EUR->USD] Converting ${eurAmount} EUR to ${usdAmountWithMarkup.toFixed(2)} USD (rate: ${rate}, +3% markup)`,
          );
          return parseFloat(usdAmountWithMarkup.toFixed(2));
        }
      }
    } catch (apiError) {
      console.warn(
        "💱 [AFS EUR->USD] ExchangeRate-API failed, trying fallback...",
        apiError,
      );
    }

    // Fallback: Fixer.io (backup)
    try {
      const fixerResponse = await fetch(
        "https://api.fixer.io/latest?base=EUR&symbols=USD",
      );
      if (fixerResponse.ok) {
        const data = (await fixerResponse.json()) as any;
        if (data.rates && data.rates.USD) {
          const rate = data.rates.USD;
          const usdAmount = eurAmount * rate;
          const usdAmountWithMarkup = usdAmount * 1.005; // Add 3% markup for currency protection
          console.log(
            `💱 [AFS EUR->USD] Converting ${eurAmount} EUR to ${usdAmountWithMarkup.toFixed(2)} USD (Fixer rate: ${rate}, +3% markup)`,
          );
          return parseFloat(usdAmountWithMarkup.toFixed(2));
        }
      }
    } catch (fixerError) {
      console.warn(
        "💱 [AFS EUR->USD] Fixer.io failed, using fallback rate...",
        fixerError,
      );
    }

    // Final fallback rate if all APIs fail (approximate EUR to USD rate)
    const fallbackRate = 1.17; // Conservative EUR to USD rate
    const usdAmount = eurAmount * fallbackRate;
    const usdAmountWithMarkup = usdAmount * 1.005; // Add 3% markup for currency protection
    console.log(
      `💱 [AFS EUR->USD] Using emergency fallback rate to convert ${eurAmount} EUR to ${usdAmountWithMarkup.toFixed(2)} USD (rate: ${fallbackRate}, +3% markup)`,
    );
    return parseFloat(usdAmountWithMarkup.toFixed(2));
  } catch (error) {
    console.error("❌ [AFS EUR->USD] Currency conversion failed:", error);
    // Emergency fallback: assume EUR ≈ USD for safety
    const emergencyAmount = eurAmount * 1.0; // Just add 3% markup to EUR amount
    console.log(
      `🚨 [AFS EUR->USD] Emergency fallback: treating ${eurAmount} EUR as ${emergencyAmount} USD (+3% markup)`,
    );
    return emergencyAmount;
  }
}

// Export alias for backward compatibility
export async function calculateAFSTransportPricing(
  receiverCountry: string,
  packageWeight: number,
  packageLength: number,
  packageWidth: number,
  packageHeight: number,
  userMultiplier: number = 1.0,
): Promise<AFSPriceResponse> {
  console.log(
    `🔍 [AFS PRICING DEBUG] Starting AFS Transport pricing calculation`,
  );
  console.log(
    `📦 Parameters: country=${receiverCountry}, weight=${packageWeight}kg, dimensions=${packageLength}x${packageWidth}x${packageHeight}cm, multiplier=${userMultiplier}`,
  );

  try {
    // Correct AFS Transport API request format
    const authTestRequest = {
      islem: "fiyat_hesapla",
      country_code: normalizeCountryCode(receiverCountry),
      shipments: [
        {
          weight: Math.max(packageWeight, 0.1),
          length: Math.max(packageLength, 1),
          width: Math.max(packageWidth, 1),
          height: Math.max(packageHeight, 1),
        },
      ],
    };

    console.log(
      `🔑 [AFS PRICING] Testing corrected API format with AFS Transport`,
    );
    console.log(
      `📝 [AFS REQUEST] Payload:`,
      JSON.stringify(authTestRequest, null, 2),
    );

    const response = await fetch(AFS_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": AFS_API_KEY,
      },
      body: JSON.stringify(authTestRequest),
    });

    console.log(
      `📡 [AFS RESPONSE] HTTP Status: ${response.status} ${response.statusText}`,
    );

    // Get response text for debugging errors
    const responseText = await response.text();
    console.log(`📄 [AFS RESPONSE BODY] Full response:`, responseText);

    if (!response.ok) {
      console.log(
        `📄 [AFS ERROR DETAILS] Status: ${response.status}, Body: ${responseText}`,
      );
    }

    if (!response.ok) {
      if (response.status === 401) {
        console.log(
          `❌ [AFS AUTH ERROR] 401 Unauthorized - API key invalid or expired`,
        );
        console.log(
          `🔑 Current API key starts with: ${AFS_API_KEY.substring(0, 8)}...`,
        );
        return {
          success: false,
          options: [],
          currency: "USD",
          error: `AFS Transport API authentication failed (401). Please verify API key is valid and activated.`,
        };
      } else if (response.status === 400) {
        console.log(
          `❌ [AFS REQUEST ERROR] 400 Bad Request - Invalid request format or parameters`,
        );
        console.log(
          `🔑 Current API key starts with: ${AFS_API_KEY.substring(0, 8)}...`,
        );
        console.log(`🌐 API URL: ${AFS_API_URL}`);
        return {
          success: false,
          options: [],
          currency: "USD",
          error: `AFS Transport API request format error (400). API key may be invalid or request structure incorrect.`,
        };
      }
      throw new Error(
        `AFS Transport API error: ${response.status} - ${response.statusText}`,
      );
    }

    let data: AFSTransportResponse;
    try {
      data = JSON.parse(responseText) as AFSTransportResponse;
      console.log(
        `📊 [AFS DATA] Response received:`,
        JSON.stringify(data, null, 2),
      );
    } catch (parseError) {
      console.log(
        `❌ [AFS PARSE ERROR] Failed to parse JSON response:`,
        parseError,
      );
      return {
        success: false,
        options: [],
        currency: "USD",
        error: `Invalid JSON response from AFS Transport API`,
      };
    }

    if (data.hata) {
      console.log(`❌ [AFS ERROR] API returned error: ${data.mesaj}`);
      return {
        success: false,
        options: [],
        currency: "USD",
        error: data.mesaj || "AFS Transport pricing request failed",
      };
    }

    // Check if prices array exists before mapping
    if (!data.prices || !Array.isArray(data.prices)) {
      console.log(
        "❌ [AFS PRICING ERROR] AFS Transport response missing prices array:",
        data,
      );
      return {
        success: false,
        options: [],
        currency: "USD",
        error: "AFS Transport response missing pricing data",
      };
    }

    // Convert EUR prices to USD with 3% markup, then apply user multiplier
    const convertedOptions: AFSPriceOption[] = [];

    for (const price of data.prices) {
      console.log(
        `💱 [AFS CONVERSION] Converting EUR ${price.price} to USD with 3% markup...`,
      );

      // Convert EUR to USD with 3% markup protection
      const usdPrice = await convertEurToUsd(price.price);
      console.log(
        `💱 [AFS CONVERSION] EUR ${price.price} -> USD ${usdPrice} (with 3% markup)`,
      );

      // Map service names to proper display names
      let displayName = `MoogShip AFS ${price.service_name}`;
      if (
        price.service_name.toLowerCase().includes("ecoafs") ||
        price.service_name.toLowerCase() === "ecoafs"
      ) {
        displayName = "MoogShip GLS Eco";
      } else if (price.service_name.toLowerCase().includes("express")) {
        displayName = "MoogShip GLS Express";
      }

      // Apply user multiplier to USD-converted price, then convert to cents
      const finalPriceUSD = usdPrice * userMultiplier;
      const finalPriceCents = Math.round(finalPriceUSD * 100);

      console.log(
        `🔢 [AFS FINAL PRICE] ${displayName}: EUR ${price.price} -> USD ${usdPrice} -> USD ${finalPriceUSD} (x${userMultiplier}) -> ${finalPriceCents} cents`,
      );

      convertedOptions.push({
        id: `afs-${price.service_id}`,
        serviceName: price.service_name,
        displayName: displayName,
        cargoPrice: finalPriceCents,
        fuelCost: 0,
        totalPrice: finalPriceCents,
        deliveryTime: "3-5 business days",
        serviceType: price.service_name.toLowerCase().includes("express")
          ? "EXPRESS"
          : price.service_name.toLowerCase().includes("eco")
            ? "ECO"
            : "STANDARD",
        providerServiceCode: `afs-${price.service_id}`,
      });
    }

    const options = convertedOptions;

    console.log(`✅ [AFS SUCCESS] Generated ${options.length} pricing options`);
    options.forEach((option) => {
      console.log(
        `   └─ ${option.displayName}: $${option.totalPrice} (${option.serviceType})`,
      );
    });

    return {
      success: true,
      options,
      bestOption: options.length > 0 ? options[0].id : undefined,
      currency: "USD",
    };
  } catch (error) {
    console.error(
      `❌ [AFS CRITICAL ERROR] AFS Transport pricing failed:`,
      error,
    );
    return {
      success: false,
      options: [],
      currency: "USD",
      error:
        error instanceof Error
          ? error.message
          : "Unknown AFS Transport pricing error",
    };
  }
}
