/**
 * Bizim Hesap API Integration Service
 * Creates invoices for shipments with 3rd party tracking numbers
 */

interface BizimHesapCustomer {
  CustomerId: string;
  Title: string;
  Address: string;
  TaxOffice?: string;
  TaxNo?: string;
  Email?: string;
  Phone?: string;
}

interface BizimHesapDetail {
  ProductId: string;
  ProductName: string;
  Note?: string;
  Barcode?: string;
  TaxRate: number;
  Quantity: number;
  UnitPrice: number;
  GrossPrice: number;
  Discount: string;
  Net: number;
  Tax: number;
  Total: number;
}

interface BizimHesapAmounts {
  Currency: string;
  Gross: number;
  Discount: number;
  Net: number;
  Tax: number;
  Total: number;
}

interface BizimHesapInvoice {
  FirmID: string;
  InvoiceNo?: string;
  InvoiceType: string; // 3: Sales, 5: Purchase
  Note?: string;
  Dates: {
    InvoiceDate: string;
    DeliveryDate?: string;
    DueDate: string;
  };
  customers: BizimHesapCustomer;
  Details: BizimHesapDetail[];
  Amounts: BizimHesapAmounts;
}

interface BizimHesapResponse {
  success: boolean;
  message?: string;
  invoiceId?: string;
  error?: string;
}

class BizimHesapService {
  private apiUrl = "https://bizimhesap.com/api/b2b/addinvoice";
  private firmId: string;

  constructor() {
    // Use environment variable if available, otherwise fall back to the sample firm ID
    this.firmId =
      process.env.BIZIMHESAP_FIRM_ID || "862FA8027BA841F59BF950D2A690FB95";

    if (!process.env.BIZIMHESAP_FIRM_ID) {
      console.warn("BIZIMHESAP_FIRM_ID not configured, using sample firm ID");
    }
  }

  /**
   * Create invoice for a shipment with 3rd party tracking
   */
  async createInvoiceForShipment(
    shipment: any,
    shipmentOwner: any,
  ): Promise<BizimHesapResponse> {
    try {
      if (!this.firmId) {
        throw new Error("Bizim Hesap Firm ID not configured");
      }

      // Only create invoices for shipments with 3rd party tracking numbers
      if (!shipment.carrierTrackingNumber) {
        return {
          success: false,
          error: "Shipment does not have 3rd party tracking number",
        };
      }

      // Calculate amounts based on shipment data (converting from cents to dollars)
      const totalPriceUSD = (shipment.totalPrice || 0) / 100;

      // Format customer address from shipment owner data
      const customerAddress = [
        shipmentOwner.address1,
        shipmentOwner.address2,
        shipmentOwner.city,
        shipmentOwner.postalCode,
        shipmentOwner.country,
      ]
        .filter(Boolean)
        .join(", ");

      // Create detailed notes including tracking information
      const noteLines = [
        "Gönderi Detayları / Shipment Details:",
        `Gönderi ID / Shipment ID: ${shipment.id}`,
        `Takip Numarası / Tracking Number: ${shipment.carrierTrackingNumber}`,
        `Kargo Şirketi / Carrier: ${shipment.carrierName || "N/A"}`,
        `Taşıyıcı Servis / Service Level: ${shipment.serviceLevel || "Standard"}`,
        "",
        "Alıcı Bilgileri / Receiver Information:",
        `${shipment.receiverName}`,
        `${shipment.receiverAddress}`,
        `${shipment.receiverCity}, ${shipment.receiverState || ""}, ${shipment.receiverCountry}`,
        "",
        "Teslimat Koşulları / Delivery Terms:",
        "Yurt dışı kargo hizmet bedeli",
      ];

      const invoiceData = {
         CustomerId: `MoogShip${shipmentOwner.id?.toString() || shipmentOwner.userId?.toString() || shipment.userId?.toString() || ""}`,
        firmId: this.firmId,
        invoiceNo: "",
        invoiceType: 3,
        note: noteLines.join("\n"),
        dates: {
          invoiceDate: new Date().toISOString(),
          dueDate: new Date().toISOString(),
        },
        customer: {
          title: shipmentOwner.companyName || shipmentOwner.name,
          address: customerAddress,
          taxOffice: "",
          taxNo: shipmentOwner.taxIdNumber || "",
          email: shipmentOwner.email,
          phone: shipmentOwner.phone || "",
        },
        amounts: {
          currency: "USD",
          gross: Number(totalPriceUSD.toFixed(2)),
          discount: 0,
          net: Number(totalPriceUSD.toFixed(2)),
          tax: 0,
          total: Number(totalPriceUSD.toFixed(2)),
        },
        details: [
          {
            barcode: "ydkargo",
            productName: "Yurt dışı kargo hizmet bedeli",
            quantity: 1,
            unitPrice: totalPriceUSD,
            grossPrice: totalPriceUSD,
            taxRate: 0,
            tax: 0,
            total: totalPriceUSD,
          },
        ],
      };

      const response = await this.sendInvoiceRequest(invoiceData);
      return response;
    } catch (error) {
      console.error("Error creating Bizim Hesap invoice:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * Send invoice request to Bizim Hesap API
   */
  private async sendInvoiceRequest(
    invoiceData: any,
  ): Promise<BizimHesapResponse> {
    try {
      console.log(
        "Sending invoice data to Bizim Hesap:",
        JSON.stringify(invoiceData, null, 2),
      );

      const response = await fetch(this.apiUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify(invoiceData),
      });

      console.log("Bizim Hesap response status:", response.status);

      const responseText = await response.text();
      console.log("Bizim Hesap response body:", responseText);

      if (!response.ok) {
        throw new Error(
          `HTTP ${response.status}: ${response.statusText} - ${responseText}`,
        );
      }

      const result = JSON.parse(responseText);

      if (result.error) {
        return {
          success: false,
          error: result.error,
        };
      }

      return {
        success: true,
        message: result.message || "Invoice created successfully",
        invoiceId: result.guid || result.id,
      };
    } catch (error) {
      console.error("Bizim Hesap API request failed:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "API request failed",
      };
    }
  }

  /**
   * Format shipment address for invoice
   */
  private formatAddress(shipment: any): string {
    const parts = [
      shipment.senderAddress1,
      shipment.senderAddress2,
      shipment.senderCity,
      shipment.senderState,
      shipment.senderPostalCode,
      shipment.senderCountry,
    ].filter(Boolean);

    return parts.join(", ") || "Address not provided";
  }

  /**
   * Create invoices for all shipments with 3rd party tracking
   */
  async createInvoicesForTrackedShipments(
    shipments: any[],
    storage: any,
  ): Promise<{
    processed: number;
    successful: Array<{ shipmentId: number; invoiceId: string }>;
    failed: Array<{ shipmentId: number; error: string }>;
  }> {
    const results = {
      processed: 0,
      successful: [] as Array<{ shipmentId: number; invoiceId: string }>,
      failed: [] as Array<{ shipmentId: number; error: string }>,
    };

    for (const shipment of shipments) {
      if (shipment.carrierTrackingNumber) {
        results.processed++;

        // Get shipment owner details
        const shipmentOwner = await storage.getUser(shipment.userId);
        if (!shipmentOwner) {
          results.failed.push({
            shipmentId: shipment.id,
            error: "Shipment owner not found",
          });
          continue;
        }

        const result = await this.createInvoiceForShipment(
          shipment,
          shipmentOwner,
        );

        if (result.success && result.invoiceId) {
          results.successful.push({
            shipmentId: shipment.id,
            invoiceId: result.invoiceId,
          });
          console.log(
            `Invoice created for shipment ${shipment.id}: ${result.invoiceId}`,
          );
        } else {
          results.failed.push({
            shipmentId: shipment.id,
            error: result.error || "Unknown error",
          });
        }

        // Add delay to avoid rate limiting
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    }

    return results;
  }
}

export const bizimHesapService = new BizimHesapService();
export default bizimHesapService;
