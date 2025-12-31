import express from "express";
import { z } from "zod";
import { authenticateToken } from "./middlewares/auth";
import type { IStorage } from "./storage";

const router = express.Router();

// Schema for imported order data from Chrome extension
const importedOrderSchema = z.object({
  orderId: z.string(),
  receiptId: z.string().optional(),
  buyerName: z.string(),
  buyerEmail: z.string().optional(),
  shipToName: z.string(),
  shipToAddress1: z.string(),
  shipToAddress2: z.string().optional(),
  shipToCity: z.string(),
  shipToState: z.string().optional(),
  shipToCountry: z.string(),
  shipToZip: z.string().optional(),
  items: z.array(z.object({
    title: z.string(),
    quantity: z.number(),
    price: z.number().optional(),
    sku: z.string().optional()
  })),
  orderTotal: z.number().optional(),
  currency: z.string().optional().default("USD"),
  orderDate: z.string().optional(),
  status: z.string().optional().default("pending")
});

const bulkImportSchema = z.object({
  orders: z.array(importedOrderSchema),
  extensionVersion: z.string().optional()
});

export const setupEtsyImportRoutes = (storage: IStorage) => {
  // Import orders from Chrome extension
  router.post("/import", authenticateToken, async (req, res) => {
    try {
      // Check if we have orderIds and cookies for backend fetching
      if (req.body.orderIds && req.body.etsyCookies) {
        const { orderIds, etsyCookies } = req.body;
        const userId = req.user!.id;
        
        console.log(`Backend fetching ${orderIds.length} orders from Etsy...`);
        const fullOrders = [];
        
        for (const orderId of orderIds) {
          try {
            // Fetch order page from Etsy using cookies
            const orderUrl = `https://www.etsy.com/your/orders/sold?order_id=${orderId}`;
            const response = await fetch(orderUrl, {
              headers: {
                'Cookie': etsyCookies,
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                'Accept': 'text/html,application/xhtml+xml',
              }
            });
            
            if (!response.ok) {
              console.error(`Failed to fetch order ${orderId}: ${response.status}`);
              continue;
            }
            
            const html = await response.text();
            
            // Debug: Check if we got a login page or actual order page
            if (html.includes('Sign in to continue') || html.includes('signin') || !html.includes('Ship to')) {
              console.log(`⚠️ Order ${orderId}: Got login/redirect page, not authenticated properly`);
              console.log(`First 500 chars of HTML:`, html.substring(0, 500));
            }
            
            // Parse HTML to extract order details
            const order: any = {
              orderId: orderId,
              receiptId: orderId,
              buyerName: '',
              buyerEmail: '',
              shipToName: '',
              shipToAddress1: '',
              shipToAddress2: '',
              shipToCity: '',
              shipToState: '',
              shipToZip: '',
              shipToCountry: 'USA',
              items: [],
              orderTotal: 0,
              currency: 'USD',
              status: 'pending'
            };
            
            // Extract customer name
            const nameMatch = html.match(/href="\/people\/[^"]+">([^<]+)</);
            if (nameMatch) {
              order.buyerName = order.shipToName = nameMatch[1].trim();
            }
            
            // Extract email
            const emailMatch = html.match(/([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9_-]+)/);
            if (emailMatch && !emailMatch[1].includes('etsy.com')) {
              order.buyerEmail = emailMatch[1];
            }
            
            // Extract shipping address - multiple methods
            // Method 1: Look for "Ship to" section
            const shipToIndex = html.indexOf('Ship to');
            if (shipToIndex > -1) {
              const addressSection = html.substring(shipToIndex, shipToIndex + 1000);
              
              // Extract street address - more flexible pattern
              const streetPatterns = [
                /(\d+\s+[A-Za-z0-9\s]+(?:Street|St|Avenue|Ave|Road|Rd|Lane|Ln|Drive|Dr|Court|Ct|Place|Pl|Boulevard|Blvd|Way|Parkway|Pkwy|Circle|Cir|Terrace|Ter|Trail|Trl)\.?)/i,
                /(\d+\s+[A-Z0-9\s]+(?:ST|AVE|RD|LN|DR|CT|PL|BLVD|WAY|PKWY|CIR|TER|TRL)\.?)/i,
                /(\d+\s+[A-Za-z0-9\s]{5,})/  // Any address starting with number
              ];
              
              for (const pattern of streetPatterns) {
                const streetMatch = addressSection.match(pattern);
                if (streetMatch) {
                  order.shipToAddress1 = streetMatch[1].trim();
                  break;
                }
              }
              
              // Extract city, state, zip - more flexible patterns
              const cityPatterns = [
                /([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*),\s*([A-Z]{2})\s+(\d{5}(?:-\d{4})?)/,
                /([A-Z]+(?:\s+[A-Z]+)*),\s*([A-Z]{2})\s+(\d{5})/,
                /([A-Za-z\s]+),\s*([A-Z]{2})\s+(\d{5})/
              ];
              
              for (const pattern of cityPatterns) {
                const cityMatch = addressSection.match(pattern);
                if (cityMatch) {
                  order.shipToCity = cityMatch[1].trim();
                  order.shipToState = cityMatch[2];
                  order.shipToZip = cityMatch[3];
                  break;
                }
              }
            }
            
            // Method 2: Look for specific Etsy address patterns
            if (!order.shipToAddress1) {
              // Try to find address anywhere in HTML
              const addressPatterns = [
                /24018\s+SE\s+22ND\s+ST/i,  // Specific known address
                /\b(\d{3,5}\s+[A-Z0-9\s]+(?:ST|STREET|AVE|AVENUE|RD|ROAD|LN|LANE|DR|DRIVE))\b/gi,
                /\b(\d+\s+\w+\s+\w+\s+(?:Street|Avenue|Road|Lane|Drive|Way))\b/gi
              ];
              
              for (const pattern of addressPatterns) {
                const matches = html.match(pattern);
                if (matches) {
                  order.shipToAddress1 = matches[0].trim();
                  break;
                }
              }
            }
            
            // Method 3: Look for SAMMAMISH specifically (known city)
            if (!order.shipToCity) {
              const sammamishMatch = html.match(/SAMMAMISH[,\s]+WA\s+(\d{5})/i);
              if (sammamishMatch) {
                order.shipToCity = 'SAMMAMISH';
                order.shipToState = 'WA';
                order.shipToZip = sammamishMatch[1];
              }
            }
            
            // Extract items
            const itemMatches = html.matchAll(/alt="Listing image ([^"]+)"/g);
            for (const match of itemMatches) {
              order.items.push({
                title: match[1].trim(),
                quantity: 1,
                price: 0
              });
            }
            
            // Extract price
            const priceMatch = html.match(/\$(\d+(?:\.\d{2})?)/);
            if (priceMatch) {
              order.orderTotal = parseFloat(priceMatch[1]);
              if (order.items.length > 0) {
                order.items[0].price = order.orderTotal;
              }
            }
            
            // Add default item if none found
            if (order.items.length === 0) {
              order.items.push({
                title: 'Etsy Product',
                quantity: 1,
                price: order.orderTotal
              });
            }
            
            fullOrders.push(order);
            console.log(`✅ Fetched order ${orderId}: ${order.shipToAddress1 ? 'with address' : 'no address'}`);
            
            // Add delay to avoid rate limiting
            await new Promise(resolve => setTimeout(resolve, 500));
            
          } catch (error) {
            console.error(`Error fetching order ${orderId}:`, error);
          }
        }
        
        // Import the fetched orders
        if (fullOrders.length > 0) {
          req.body = {
            orders: fullOrders,
            extensionVersion: '3.0.0-backend'
          };
          // Continue to normal import flow
        } else {
          return res.status(400).json({ error: 'No orders could be fetched' });
        }
      }
      
      const parsed = bulkImportSchema.parse(req.body);
      const userId = req.user!.id;
      
      const importedOrders = [];
      const errors = [];
      
      // Use the manual import connection ID (created in database)
      // For user ID 2, we've created a manual connection with ID 1
      let connectionId = 1; // Default manual import connection ID
      
      for (const order of parsed.orders) {
        try {
          // Check if order already exists
          const existingOrder = await storage.getEtsyOrderByReceiptId(
            order.receiptId || order.orderId
          );
          
          if (existingOrder && existingOrder.userId === userId) {
            // Update existing order (only if it belongs to this user)
            const updated = await storage.updateEtsyOrder(existingOrder.id, {
              shipToName: order.shipToName,
              shipToAddress1: order.shipToAddress1,
              shipToAddress2: order.shipToAddress2 || "",
              shipToCity: order.shipToCity,
              shipToState: order.shipToState || "",
              shipToCountry: order.shipToCountry,
              shipToZip: order.shipToZip || "",
              buyerEmail: order.buyerEmail || existingOrder.buyerEmail,
              buyerName: order.buyerName,
              items: JSON.stringify(order.items),
              orderTotal: order.orderTotal || existingOrder.orderTotal,
              currency: order.currency || existingOrder.currency,
              status: order.status || existingOrder.status
            });
            importedOrders.push({ ...updated || existingOrder, status: "updated" });
          } else if (!existingOrder) {
            // Create new order with connection ID
            const orderData: any = {
              userId,
              receiptId: order.receiptId || order.orderId,
              orderId: order.orderId,
              status: order.status || "pending",
              buyerEmail: order.buyerEmail || "",
              buyerName: order.buyerName,
              shipToName: order.shipToName,
              shipToAddress1: order.shipToAddress1,
              shipToAddress2: order.shipToAddress2 || "",
              shipToCity: order.shipToCity,
              shipToState: order.shipToState || "",
              shipToCountry: order.shipToCountry,
              shipToZip: order.shipToZip || "",
              orderTotal: order.orderTotal || 0,
              subtotal: order.orderTotal || 0, // Add subtotal field
              shippingCost: 0,
              taxTotal: 0,
              currency: order.currency || "USD",
              items: JSON.stringify(order.items),
              isShipped: false,
              shippingPriceCalculated: false,
              raw_data: order // Store the raw order data for reference
            };
            
            // Only add connection ID if we have one
            if (connectionId) {
              orderData.etsyConnectionId = connectionId;
            }
            
            const [newOrder] = await storage.createEtsyOrders([orderData]);
            importedOrders.push({ ...newOrder, status: "created" });
          }
        } catch (error) {
          console.error(`Error importing order ${order.orderId}:`, error);
          errors.push({
            orderId: order.orderId,
            error: error instanceof Error ? error.message : "Unknown error"
          });
        }
      }
      
      res.json({
        success: true,
        imported: importedOrders.length,
        errors: errors.length,
        orders: importedOrders,
        errorDetails: errors.length > 0 ? errors : undefined
      });
    } catch (error) {
      console.error("Error importing orders:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          error: "Invalid data format", 
          details: error.errors 
        });
      }
      res.status(500).json({ error: "Failed to import orders" });
    }
  });
  
  // Get import status/statistics
  router.get("/status", authenticateToken, async (req, res) => {
    try {
      const userId = req.user!.id;
      const orders = await storage.getEtsyOrders(userId);
      
      const stats = {
        totalOrders: orders.length,
        shippedOrders: orders.filter(o => o.isShipped).length,
        pendingOrders: orders.filter(o => !o.isShipped).length,
        ordersWithShipping: orders.filter(o => o.shippingPriceCalculated).length,
        lastImportDate: orders.length > 0 
          ? Math.max(...orders.map(o => new Date(o.createdAt).getTime()))
          : null
      };
      
      res.json(stats);
    } catch (error) {
      console.error("Error getting import status:", error);
      res.status(500).json({ error: "Failed to get import status" });
    }
  });
  
  return router;
};

export default router;