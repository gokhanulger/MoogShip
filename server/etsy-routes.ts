import { Router } from "express";
import crypto from "crypto";
import axios from "axios";
import { z } from "zod";
import { storage } from "./storage";
import { authenticateToken } from "./middlewares/auth";
import { calculateCombinedPricing } from "./services/moogship-pricing";
import USITCDutyService from "./services/usitc-duty-rates";

const router = Router();

// Environment variables for Etsy OAuth
const ETSY_API_KEY = process.env.ETSY_API_KEY || "";
const ETSY_REDIRECT_URI = process.env.ETSY_REDIRECT_URI || "http://localhost:5000/api/etsy/callback";
const ETSY_SCOPES = "transactions_r transactions_w";

// Store PKCE verifiers temporarily (in production, use Redis or database)
const pkceStore = new Map<string, { verifier: string; userId: number }>();

// Generate PKCE challenge
function generatePKCE() {
  const verifier = crypto.randomBytes(32).toString("base64url");
  const challenge = crypto
    .createHash("sha256")
    .update(verifier)
    .digest("base64url");
  return { verifier, challenge };
}

// Initiate OAuth flow
router.get("/auth", authenticateToken, async (req, res) => {
  try {
    const userId = req.user!.id;
    const { verifier, challenge } = generatePKCE();
    const state = crypto.randomBytes(16).toString("hex");
    
    // Store verifier and userId with state as key
    pkceStore.set(state, { verifier, userId });
    
    // Build authorization URL
    const params = new URLSearchParams({
      response_type: "code",
      redirect_uri: ETSY_REDIRECT_URI,
      scope: ETSY_SCOPES,
      client_id: ETSY_API_KEY,
      state,
      code_challenge: challenge,
      code_challenge_method: "S256"
    });
    
    const authUrl = `https://www.etsy.com/oauth/connect?${params}`;
    
    res.json({ authUrl });
  } catch (error) {
    console.error("Error initiating Etsy OAuth:", error);
    res.status(500).json({ error: "Failed to initiate Etsy authentication" });
  }
});

// OAuth callback handler
router.get("/callback", async (req, res) => {
  try {
    const { code, state } = req.query;
    
    if (!code || !state) {
      return res.status(400).json({ error: "Missing code or state parameter" });
    }
    
    // Retrieve verifier and userId from state
    const storedData = pkceStore.get(state as string);
    if (!storedData) {
      return res.status(400).json({ error: "Invalid state parameter" });
    }
    
    const { verifier, userId } = storedData;
    pkceStore.delete(state as string); // Clean up
    
    // Exchange code for tokens
    const tokenResponse = await axios.post(
      "https://api.etsy.com/v3/public/oauth/token",
      {
        grant_type: "authorization_code",
        client_id: ETSY_API_KEY,
        redirect_uri: ETSY_REDIRECT_URI,
        code,
        code_verifier: verifier
      }
    );
    
    const { access_token, refresh_token, expires_in } = tokenResponse.data;
    
    // Calculate token expiration time
    const tokenExpiresAt = new Date();
    tokenExpiresAt.setSeconds(tokenExpiresAt.getSeconds() + expires_in);
    
    // Get shop information
    const headers = {
      "x-api-key": ETSY_API_KEY,
      "Authorization": `Bearer ${access_token}`
    };
    
    const shopsResponse = await axios.get(
      "https://openapi.etsy.com/v3/application/users/me/shops",
      { headers }
    );
    
    if (!shopsResponse.data.results || shopsResponse.data.results.length === 0) {
      return res.status(400).json({ error: "No Etsy shop found for this account" });
    }
    
    const shop = shopsResponse.data.results[0];
    
    // Check if connection already exists
    const existingConnection = await storage.getEtsyConnection(userId);
    
    if (existingConnection) {
      // Update existing connection
      await storage.updateEtsyConnection(existingConnection.id, {
        shopId: shop.shop_id.toString(),
        shopName: shop.shop_name,
        shopUrl: shop.url,
        shopOwnerName: shop.user?.name || shop.shop_name,
        accessToken: access_token,
        refreshToken: refresh_token,
        tokenExpiresAt,
        isActive: true,
        updatedAt: new Date()
      });
    } else {
      // Create new connection
      await storage.createEtsyConnection({
        userId,
        shopId: shop.shop_id.toString(),
        shopName: shop.shop_name,
        shopUrl: shop.url,
        shopOwnerName: shop.user?.name || shop.shop_name,
        accessToken: access_token,
        refreshToken: refresh_token,
        tokenExpiresAt,
        isActive: true
      });
    }
    
    // Redirect to the Etsy integration page
    res.redirect("/etsy-integration?success=true");
  } catch (error) {
    console.error("Error in Etsy OAuth callback:", error);
    if (axios.isAxiosError(error)) {
      console.error("Axios error details:", error.response?.data);
    }
    res.redirect("/etsy-integration?error=true");
  }
});

// Get connection status
router.get("/connection", authenticateToken, async (req, res) => {
  try {
    const userId = req.user!.id;
    const connection = await storage.getEtsyConnection(userId);
    
    if (!connection) {
      return res.json({ connected: false });
    }
    
    res.json({
      connected: true,
      shopName: connection.shopName,
      shopUrl: connection.shopUrl,
      lastSyncAt: connection.lastSyncAt,
      totalOrdersSynced: connection.totalOrdersSynced
    });
  } catch (error) {
    console.error("Error fetching Etsy connection:", error);
    res.status(500).json({ error: "Failed to fetch connection status" });
  }
});

// Disconnect Etsy
router.delete("/connection", authenticateToken, async (req, res) => {
  try {
    const userId = req.user!.id;
    const connection = await storage.getEtsyConnection(userId);
    
    if (!connection) {
      return res.status(404).json({ error: "No Etsy connection found" });
    }
    
    await storage.deleteEtsyConnection(connection.id);
    
    res.json({ success: true });
  } catch (error) {
    console.error("Error disconnecting Etsy:", error);
    res.status(500).json({ error: "Failed to disconnect Etsy" });
  }
});

// Refresh access token
async function refreshAccessToken(connection: any) {
  try {
    const response = await axios.post(
      "https://api.etsy.com/v3/public/oauth/token",
      {
        grant_type: "refresh_token",
        client_id: ETSY_API_KEY,
        refresh_token: connection.refreshToken
      }
    );
    
    const { access_token, refresh_token, expires_in } = response.data;
    
    // Calculate new expiration time
    const tokenExpiresAt = new Date();
    tokenExpiresAt.setSeconds(tokenExpiresAt.getSeconds() + expires_in);
    
    // Update connection with new tokens
    await storage.updateEtsyConnection(connection.id, {
      accessToken: access_token,
      refreshToken: refresh_token,
      tokenExpiresAt,
      updatedAt: new Date()
    });
    
    return access_token;
  } catch (error) {
    console.error("Error refreshing Etsy access token:", error);
    throw error;
  }
}

// Sync orders from Etsy
router.post("/sync-orders", authenticateToken, async (req, res) => {
  try {
    const userId = req.user!.id;
    const connection = await storage.getEtsyConnection(userId);
    
    if (!connection) {
      return res.status(404).json({ error: "No Etsy connection found" });
    }
    
    // Check if token needs refresh
    let accessToken = connection.accessToken;
    if (new Date() >= connection.tokenExpiresAt) {
      accessToken = await refreshAccessToken(connection);
    }
    
    const headers = {
      "x-api-key": ETSY_API_KEY,
      "Authorization": `Bearer ${accessToken}`
    };
    
    // Fetch receipts (orders) from Etsy
    const receiptsResponse = await axios.get(
      `https://openapi.etsy.com/v3/application/shops/${connection.shopId}/receipts`,
      {
        headers,
        params: {
          limit: 100,
          was_paid: true,
          was_shipped: false // Get unshipped orders
        }
      }
    );
    
    const receipts = receiptsResponse.data.results || [];
    const ordersToCreate = [];
    
    for (const receipt of receipts) {
      // Check if order already exists
      const existingOrder = await storage.getEtsyOrderByReceiptId(receipt.receipt_id.toString());
      
      if (!existingOrder) {
        // Get detailed receipt with transactions (line items)
        const detailResponse = await axios.get(
          `https://openapi.etsy.com/v3/application/shops/${connection.shopId}/receipts/${receipt.receipt_id}`,
          { headers }
        );
        
        const detailedReceipt = detailResponse.data;
        
        // Map transactions to items
        const items = (detailedReceipt.transactions || []).map((transaction: any) => ({
          transactionId: transaction.transaction_id.toString(),
          title: transaction.title,
          quantity: transaction.quantity,
          price: Math.round(transaction.price.amount), // Convert to cents
          sku: transaction.sku || null,
          variationName: transaction.variations?.map((v: any) => v.formatted_value).join(", ") || null
        }));
        
        // Calculate estimated weight based on item count
        const estimatedWeight = items.reduce((total: number, item: any) => 
          total + (item.quantity * 0.1), 0); // Default 100g per item
        
        // Create order object
        ordersToCreate.push({
          userId,
          etsyConnectionId: connection.id,
          receiptId: receipt.receipt_id.toString(),
          orderNumber: receipt.receipt_id.toString(),
          orderDate: new Date(receipt.create_timestamp * 1000),
          orderStatus: receipt.status,
          paymentStatus: receipt.is_paid ? "paid" : "pending",
          shippingStatus: receipt.is_shipped ? "shipped" : "not_shipped",
          buyerName: receipt.name,
          buyerEmail: receipt.buyer_email || null,
          shipToName: receipt.name,
          shipToAddress1: receipt.formatted_address?.first_line || "",
          shipToAddress2: receipt.formatted_address?.second_line || null,
          shipToCity: receipt.formatted_address?.city || "",
          shipToState: receipt.formatted_address?.state || null,
          shipToCountry: receipt.formatted_address?.country_iso || "",
          shipToZip: receipt.formatted_address?.zip || null,
          grandTotal: Math.round(receipt.grandtotal.amount),
          subtotal: Math.round(receipt.subtotal.amount),
          shippingCost: Math.round(receipt.total_shipping_cost.amount),
          taxTotal: Math.round(receipt.total_tax_cost.amount),
          currency: receipt.grandtotal.currency_code,
          items,
          estimatedWeight,
          packageContents: items.map((i: any) => i.title).join(", "),
          rawData: detailedReceipt
        });
      }
    }
    
    // Create new orders in database
    if (ordersToCreate.length > 0) {
      await storage.createEtsyOrders(ordersToCreate);
    }
    
    // Update last sync time
    await storage.updateEtsyConnection(connection.id, {
      lastSyncAt: new Date(),
      totalOrdersSynced: (connection.totalOrdersSynced || 0) + ordersToCreate.length
    });
    
    res.json({
      success: true,
      ordersAdded: ordersToCreate.length,
      totalOrders: receipts.length
    });
  } catch (error) {
    console.error("Error syncing Etsy orders:", error);
    if (axios.isAxiosError(error)) {
      console.error("Axios error details:", error.response?.data);
    }
    res.status(500).json({ error: "Failed to sync Etsy orders" });
  }
});

// Get Etsy orders
router.get("/orders", authenticateToken, async (req, res) => {
  try {
    const userId = req.user!.id;
    const orders = await storage.getEtsyOrders(userId);
    
    res.json(orders);
  } catch (error) {
    console.error("Error fetching Etsy orders:", error);
    res.status(500).json({ error: "Failed to fetch orders" });
  }
});

// Get unshipped Etsy orders
router.get("/orders/unshipped", authenticateToken, async (req, res) => {
  try {
    const userId = req.user!.id;
    const orders = await storage.getUnshippedEtsyOrders(userId);
    
    res.json(orders);
  } catch (error) {
    console.error("Error fetching unshipped Etsy orders:", error);
    res.status(500).json({ error: "Failed to fetch unshipped orders" });
  }
});

// Update Etsy order (e.g., to link with MoogShip shipment)
router.patch("/orders/:id", authenticateToken, async (req, res) => {
  try {
    const orderId = parseInt(req.params.id);
    const userId = req.user!.id;
    const updateData = req.body;

    // Verify the order belongs to this user
    const order = await storage.getEtsyOrder(orderId);
    if (!order || order.userId !== userId) {
      return res.status(404).json({ error: "Order not found" });
    }

    // Update the order
    const updated = await storage.updateEtsyOrder(orderId, updateData);
    if (!updated) {
      return res.status(500).json({ error: "Failed to update order" });
    }

    console.log(`[Etsy] Order ${orderId} updated with:`, updateData);
    res.json(updated);
  } catch (error) {
    console.error("Error updating Etsy order:", error);
    res.status(500).json({ error: "Failed to update order" });
  }
});

// Test pricing endpoint for debugging
router.get("/test-pricing", async (req, res) => {
  try {
    console.log('[TEST] Starting pricing test (combined: external first, Ship Entegra fallback)...');
    const { calculateCombinedPricing: combinedPricing } = await import('./services/moogship-pricing');

    // Test combined pricing (external first, Ship Entegra fallback)
    const priceData = await combinedPricing(
      15, // length
      10, // width
      1,  // height
      0.5, // weight in kg
      'US'
    );

    console.log('[TEST] Price data received');
    console.log('[TEST] Has options:', !!(priceData && priceData.options));
    console.log('[TEST] Options count:', priceData?.options?.length || 0);
    console.log('[TEST] Success:', priceData?.success);

    if (priceData?.options && priceData.options.length > 0) {
      console.log('[TEST] Available options:');
      priceData.options.forEach((opt: any, idx: number) => {
        console.log(`  ${idx + 1}. ${opt.displayName || opt.serviceName}: $${(opt.totalPrice/100).toFixed(2)}`);
      });
    }

    const bestOption = priceData?.options?.[0];
    res.json({
      message: 'Check server logs for price data structure',
      hasOptions: !!(priceData && priceData.options),
      optionsCount: priceData?.options?.length || 0,
      hasTotalPrice: !!(bestOption && bestOption.totalPrice),
      priceData: priceData
    });
  } catch (error: any) {
    console.error('[TEST] Error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Calculate bulk prices for multiple orders
router.post("/calculate-bulk-prices", authenticateToken, async (req, res) => {
  try {
    const { orders } = req.body;
    
    if (!orders || !Array.isArray(orders) || orders.length === 0) {
      return res.status(400).json({ error: "Invalid orders data" });
    }
    
    const results = [];
    
    // Get user details including price multiplier
    const userId = req.user!.id;
    const userDetails = await storage.getUserByEmail(req.user!.email);
    const userMultiplier = userDetails?.priceMultiplier || 1;
    
    console.log(`[ETSY PRICING] Calculating prices with user multiplier: ${userMultiplier}`);
    
    // Calculate prices for each order
    for (const orderData of orders) {
      try {
        const pricingOptions = [];
        
        // Calculate insurance if provided (1% of customs value)
        const insuranceAmount = orderData.insurance || 0; // Insurance should be passed in cents
        const hasInsurance = insuranceAmount > 0;
        
        // Make a single call to get base pricing
        try {
          const combinedResult = await calculateCombinedPricing(
            orderData.package?.length || 15,
            orderData.package?.width || 10,
            orderData.package?.height || 1,
            orderData.package?.weight || 0.5,
            orderData.destination?.country || 'US',
            userMultiplier
          );

          // Always create three distinct service levels
          // Base price from best option or fallback
          const basePrice = combinedResult?.options?.[0]?.totalPrice || 2000; // $20 fallback
          
          // Define service levels with different pricing multipliers
          const serviceLevels = [
            { 
              level: 'standard', 
              name: 'Standard Shipping', 
              multiplier: 1.0,  // Base price
              estimatedDays: '5-7',
              carrier: 'UPS Ground'
            },
            { 
              level: 'express', 
              name: 'Express Shipping', 
              multiplier: 1.5,  // 50% more than standard
              estimatedDays: '2-3',
              carrier: 'UPS Express'
            },
            { 
              level: 'priority', 
              name: 'Priority Shipping', 
              multiplier: 2.0,  // Double the standard price
              estimatedDays: '1-2',
              carrier: 'UPS Priority'
            },
          ];
          
          // Generate pricing option for each service level
          serviceLevels.forEach(service => {
            // Calculate base price for this service level
            const baseServicePrice = Math.round(basePrice * service.multiplier);
            
            // Apply user's price multiplier
            const adjustedShippingPrice = Math.round(baseServicePrice * userMultiplier);
            
            // Add insurance
            const totalPriceWithInsurance = adjustedShippingPrice + insuranceAmount;
            
            pricingOptions.push({
              id: `moogship_${service.level}`,
              name: service.carrier,
              price: totalPriceWithInsurance,
              basePrice: baseServicePrice,
              shippingPrice: adjustedShippingPrice,
              insuranceAmount: insuranceAmount,
              hasInsurance: hasInsurance,
              estimatedDays: service.estimatedDays,
              provider: 'moogship',
              serviceLevel: service.level,
              appliedMultiplier: userMultiplier,
            });
          });
          
          console.log(`[ETSY PRICING] Generated ${pricingOptions.length} pricing options from base price: $${(basePrice/100).toFixed(2)}`);
          
        } catch (error) {
          console.error('Error calculating shipping prices:', error);
          
          // Even on error, provide fallback options
          const fallbackBase = 2000; // $20
          const serviceLevels = [
            { level: 'standard', name: 'Standard Shipping', multiplier: 1.0, estimatedDays: '5-7' },
            { level: 'express', name: 'Express Shipping', multiplier: 1.5, estimatedDays: '2-3' },
            { level: 'priority', name: 'Priority Shipping', multiplier: 2.0, estimatedDays: '1-2' },
          ];
          
          serviceLevels.forEach(service => {
            const baseServicePrice = Math.round(fallbackBase * service.multiplier);
            const adjustedShippingPrice = Math.round(baseServicePrice * userMultiplier);
            const totalPriceWithInsurance = adjustedShippingPrice + insuranceAmount;
            
            pricingOptions.push({
              id: `fallback_${service.level}`,
              name: service.name,
              price: totalPriceWithInsurance,
              basePrice: baseServicePrice,
              shippingPrice: adjustedShippingPrice,
              insuranceAmount: insuranceAmount,
              hasInsurance: hasInsurance,
              estimatedDays: service.estimatedDays,
              provider: 'moogship',
              serviceLevel: service.level,
              appliedMultiplier: userMultiplier,
            });
          });
        }
        
        // Log pricing results for debugging
        console.log(`[ETSY PRICING] Order ${orderData.orderId}: Found ${pricingOptions.length} pricing options`);
        if (insuranceAmount > 0) {
          console.log(`[ETSY PRICING] Insurance included: $${(insuranceAmount/100).toFixed(2)} (1% of customs value)`);
        }
        pricingOptions.forEach(opt => {
          const insuranceNote = opt.hasInsurance ? ` + insurance: $${(opt.insuranceAmount/100).toFixed(2)}` : '';
          console.log(`  - ${opt.name}: $${(opt.price/100).toFixed(2)} (base: $${(opt.basePrice/100).toFixed(2)}, multiplier: ${opt.appliedMultiplier}${insuranceNote})`);
        });
        
        // If no real prices available, add at least one option
        if (pricingOptions.length === 0) {
          const fallbackShippingPrice = Math.round(1500 * userMultiplier);
          const fallbackTotalPrice = fallbackShippingPrice + insuranceAmount;
          pricingOptions.push({
            id: 'standard_fallback',
            name: 'Standard Shipping',
            price: fallbackTotalPrice, // Apply multiplier and insurance to fallback price
            basePrice: 1500,
            shippingPrice: fallbackShippingPrice,
            insuranceAmount: insuranceAmount,
            hasInsurance: hasInsurance,
            estimatedDays: '5-7',
            provider: 'default',
            serviceLevel: 'standard',
            appliedMultiplier: userMultiplier,
          });
        }
        
        // Calculate DDP if HS code and customs value provided
        let ddpAmount = 0;
        let dutyRate = 0;
        let ddpProcessingFee = 0;
        
        if ((orderData.destination?.country === 'US' || orderData.destination?.country === 'USA') 
            && orderData.hsCode && orderData.customsValue) {
          try {
            const usitcService = new USITCDutyService();
            const customsValueInDollars = orderData.customsValue / 100; // Convert from cents
            const usitcResult = await usitcService.getDutyRateAndAmount(
              orderData.hsCode, 
              customsValueInDollars
            );
            
            if (usitcResult.dutyRate && usitcResult.dutyRate.code) {
              dutyRate = usitcResult.dutyRate.dutyPercentage || 0;
              ddpAmount = Math.round(usitcResult.dutyAmount * 100); // Convert to cents
              // Check if ECO shipping based on pricing options (eco service is cheaper)
              const hasEcoOption = pricingOptions.some(opt => 
                opt.name && (opt.name.toLowerCase().includes('eko') || 
                opt.name.toLowerCase().includes('eco')));
              // ECO shipping: 45 cents, Standard shipping: $4.50 (450 cents)
              ddpProcessingFee = hasEcoOption ? 45 : 450;
            }
          } catch (error) {
            console.error('Error calculating DDP for order:', error);
            // Fallback to 20% if USITC fails
            ddpAmount = Math.round(orderData.customsValue * 0.2);
            dutyRate = 0.2;
          }
        } else if (orderData.customsValue) {
          // For non-US destinations or missing HS code, use simple 20% calculation
          ddpAmount = Math.round(orderData.customsValue * 0.2);
          dutyRate = 0.2;
        }
        
        results.push({
          orderId: orderData.orderId,
          pricingOptions,
          ddpAmount,
          dutyRate,
          ddpProcessingFee,
          totalDDP: ddpAmount + ddpProcessingFee,
          success: true,
        });
      } catch (error) {
        console.error(`Error calculating price for order ${orderData.orderId}:`, error);
        results.push({
          orderId: orderData.orderId,
          error: 'Failed to calculate price',
          success: false,
        });
      }
    }
    
    res.json({ results });
  } catch (error) {
    console.error("Error calculating bulk prices:", error);
    res.status(500).json({ error: "Failed to calculate bulk prices" });
  }
});

// Calculate shipping price for an order
router.post("/orders/:id/calculate-shipping", authenticateToken, async (req, res) => {
  try {
    const orderId = parseInt(req.params.id);
    const order = await storage.getEtsyOrder(orderId);
    
    if (!order || order.userId !== req.user!.id) {
      return res.status(404).json({ error: "Order not found" });
    }
    
    // For now, just return mock pricing data
    // In production, you would get user details and call actual shipping APIs
    
    // Calculate shipping using the internal pricing API
    const pricingResponse = await axios.post(
      `http://localhost:${process.env.PORT || 5000}/api/calculate-price`,
      {
        // Sender information (from user account)
        senderName: user.name || user.companyName || "Sender",
        senderAddress1: user.address1 || "Address",
        senderAddress2: user.address2 || "",
        senderCity: user.city || "City", 
        senderPostalCode: user.postalCode || "00000",
        senderPhone: user.phone || "0000000000",
        senderEmail: user.email,
        
        // Receiver information (from Etsy order)
        receiverName: order.shipToName,
        receiverAddress: order.shipToAddress1,
        receiverAddress2: order.shipToAddress2 || "",
        receiverCity: order.shipToCity,
        receiverState: order.shipToState || "",
        receiverCountry: order.shipToCountry,
        receiverPostalCode: order.shipToZip || "",
        receiverPhone: "0000000000", // Etsy doesn't provide phone numbers
        receiverEmail: order.buyerEmail || "",
        
        // Package information
        packageLength: 30, // Default dimensions for small package
        packageWidth: 20,
        packageHeight: 10,
        packageWeight: order.estimatedWeight || 0.5, // Default 500g if not estimated
        packageContents: order.packageContents || "E-commerce Products",
        
        // Additional information
        currency: order.currency || "USD",
        isInsured: false,
        insuranceValue: 0
      },
      {
        headers: {
          'Authorization': req.headers.authorization, // Pass through auth header
          'Content-Type': 'application/json'
        }
      }
    );
    
    // Extract the best shipping option from the response
    const shippingOptions = pricingResponse.data.prices || [];
    let shippingPrice = 0;
    
    if (shippingOptions.length > 0) {
      // Find the cheapest option
      const cheapestOption = shippingOptions.reduce((min: any, option: any) => 
        option.totalPrice < min.totalPrice ? option : min
      );
      shippingPrice = cheapestOption.totalPrice; // Already in cents
    } else {
      // Fallback to a default price if no options available
      shippingPrice = 2000; // $20.00 in cents
    }
    
    // Update order with calculated shipping price
    await storage.updateEtsyOrder(orderId, {
      shippingPriceCalculated: true,
      calculatedShippingPrice: shippingPrice
    });
    
    res.json({
      shippingPrice,
      currency: order.currency || "USD",
      shippingOptions: pricingResponse.data.prices
    });
  } catch (error) {
    console.error("Error calculating shipping price:", error);
    if (axios.isAxiosError(error)) {
      console.error("Price API error:", error.response?.data);
    }
    res.status(500).json({ error: "Failed to calculate shipping price" });
  }
});

export default router;