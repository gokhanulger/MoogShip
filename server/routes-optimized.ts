/**
 * Optimized routes for faster data loading
 */

import { Router } from 'express';
import { db } from './db';
import { sql } from 'drizzle-orm';

export const optimizedRoutes = Router();

// Paginated shipments endpoint - much faster than loading all at once
optimizedRoutes.get('/api/admin/shipments/paginated', async (req, res) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 25;
    const offset = (page - 1) * limit;
    const search = req.query.search as string || '';
    const status = req.query.status as string || '';
    const customerId = req.query.customerId as string || '';
    
    console.time('[OPTIMIZED] Paginated shipments query');
    
    // Build WHERE clause based on filters
    let whereClause = 'WHERE 1=1'; // Show all shipments by default
    const params: any[] = [];
    
    // Status filtering
    if (status && status !== 'all') {
      if (status === 'pending') {
        whereClause += ` AND s.status = 'pending'`;
      } else if (status === 'approved') {
        whereClause += ` AND s.status = 'approved' AND s.carrier_tracking_number IS NULL`;
      } else if (status === 'pre_transit') {
        whereClause += ` AND (s.status = 'pre_transit' OR (s.status = 'approved' AND s.carrier_tracking_number IS NOT NULL))`;
      } else if (status === 'in_transit') {
        whereClause += ` AND s.status = 'in_transit'`;
      } else if (status === 'delivered') {
        whereClause += ` AND s.status = 'delivered'`;
      } else if (status === 'rejected') {
        whereClause += ` AND s.status = 'rejected'`;
      } else if (status === 'cancelled') {
        whereClause += ` AND s.status = 'cancelled'`;
      }
    }
    
    // Customer filtering - supports multiple customer IDs (comma-separated)
    if (customerId) {
      if (customerId.includes(',')) {
        // Multiple customer IDs
        const customerIds = customerId.split(',').map(id => parseInt(id.trim())).filter(id => !isNaN(id));
        if (customerIds.length > 0) {
          whereClause += ` AND s.user_id IN (${customerIds.join(',')})`;
        }
      } else {
        // Single customer ID
        const singleCustomerId = parseInt(customerId);
        if (!isNaN(singleCustomerId)) {
          whereClause += ` AND s.user_id = ${singleCustomerId}`;
        }
      }
    }
    
    // Search filtering
    if (search) {
      whereClause += ` AND (
        LOWER(s.sender_name) LIKE LOWER('%${search}%') OR
        LOWER(s.receiver_name) LIKE LOWER('%${search}%') OR
        LOWER(s.receiver_country) LIKE LOWER('%${search}%') OR
        LOWER(s.tracking_number) LIKE LOWER('%${search}%') OR
        LOWER(s.carrier_tracking_number) LIKE LOWER('%${search}%') OR
        LOWER(s.manual_tracking_number) LIKE LOWER('%${search}%') OR
        LOWER(s.manual_carrier_name) LIKE LOWER('%${search}%') OR
        CONCAT('#SH-', LPAD(s.id::text, 6, '0')) LIKE LOWER('%${search}%')
      )`;
    }
    
    // Get total count for pagination
    const countQuery = `SELECT COUNT(*) as total FROM shipments s ${whereClause}`;
    const countResult = await db.execute(sql.raw(countQuery));
    const total = Number(countResult.rows[0]?.total || 0);
    
    // Get paginated data with all necessary fields for table display AND dialog details
    const dataQuery = `
      SELECT 
        s.id, s.status, s.tracking_number as "trackingNumber",
        s.carrier_tracking_number as "carrierTrackingNumber",
        s.manual_tracking_number as "manualTrackingNumber",
        s.manual_carrier_name as "manualCarrierName",
        s.manual_tracking_link as "manualTrackingLink",
        s.sender_name as "senderName", s.sender_phone as "senderPhone", s.sender_email as "senderEmail",
        s.sender_address as "senderAddress", s.sender_address1 as "senderAddress1", s.sender_address2 as "senderAddress2", 
        s.sender_city as "senderCity", s.sender_postal_code as "senderPostalCode",
        s.receiver_name as "receiverName", s.receiver_phone as "receiverPhone", s.receiver_email as "receiverEmail",
        s.receiver_address as "receiverAddress", s.receiver_address2 as "receiverAddress2",
        s.receiver_city as "receiverCity", s.receiver_state as "receiverState",
        s.receiver_postal_code as "receiverPostalCode", s.receiver_country as "receiverCountry",
        s.package_length as "packageLength", s.package_width as "packageWidth", 
        s.package_height as "packageHeight", s.package_weight as "packageWeight",
        s.piece_count as "pieceCount", s.package_contents as "packageContents",
        s.gtip, s.customs_value as "customsValue", s.currency,
        s.shipping_terms as "shippingTerms",
        s.total_price as "totalPrice", s.original_total_price as "originalTotalPrice",
        s.base_price as "basePrice", s.fuel_charge as "fuelCharge", s.taxes,
        s.ddp_duties_amount as "ddpDutiesAmount", s.ddp_tax_amount as "ddpTaxAmount",
        s.ddp_base_duties_amount as "ddpBaseDutiesAmount",
        s.ddp_trump_tariffs_amount as "ddpTrumpTariffsAmount",
        s.ddp_processing_fee as "ddpProcessingFee",
        s.selected_service as "selectedService", s.provider_service_code as "providerServiceCode",
        s.service_level as "serviceLevel", s.is_insured as "isInsured",
        s.insurance_value as "insuranceValue", s.insurance_cost as "insuranceCost",
        s.carrier_name as "carrierName", s.estimated_delivery_days as "estimatedDeliveryDays",
        s.label_url as "labelUrl", s.label_error as "labelError", s.label_attempts as "labelAttempts",
        s.sent_to_shipentegra as "sentToShipEntegra", s.sent_to_shipentegra_at as "sentToShipEntegraAt",
        s.applied_multiplier as "priceMultiplier", s.notes as "shipmentNotes",
        s.invoice_pdf as "invoicePdf", s.invoice_filename as "invoiceFilename",
        s.invoice_uploaded_at as "invoiceUploadedAt",
        s.user_id as "userId",
        s.created_at as "createdAt", s.updated_at as "updatedAt", 
        s.rejection_reason as "rejectionReason",
        u.company_name as "companyName", u.username as "userName", u.email as "userEmail"
      FROM shipments s
      LEFT JOIN users u ON s.user_id = u.id
      ${whereClause}
      ORDER BY s.id DESC
      LIMIT ${limit} OFFSET ${offset}
    `;
    
    const result = await db.execute(sql.raw(dataQuery));
    
    console.timeEnd('[OPTIMIZED] Paginated shipments query');
    
    const totalPages = Math.ceil(total / limit);
    
    res.json({
      data: result.rows,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1
      }
    });
    
  } catch (error) {
    console.error('[OPTIMIZED] Error in paginated shipments:', error);
    res.status(500).json({ error: 'Failed to fetch shipments' });
  }
});

// Fast shipment counts for tabs - essential for filtering
optimizedRoutes.get('/api/admin/shipments/counts', async (req, res) => {
  try {
    console.time('[OPTIMIZED] Shipment counts query');
    
    const countsResult = await db.execute(sql`
      SELECT 
        COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending,
        COUNT(CASE WHEN status = 'approved' AND carrier_tracking_number IS NULL THEN 1 END) as approved,
        COUNT(CASE WHEN status = 'pre_transit' OR (status = 'approved' AND carrier_tracking_number IS NOT NULL) THEN 1 END) as pre_transit,
        COUNT(CASE WHEN status = 'in_transit' THEN 1 END) as in_transit,
        COUNT(CASE WHEN status = 'delivered' THEN 1 END) as delivered,
        COUNT(CASE WHEN status = 'rejected' THEN 1 END) as rejected,
        COUNT(CASE WHEN status = 'cancelled' THEN 1 END) as cancelled,
        COUNT(*) as total
      FROM shipments
    `);
    
    console.timeEnd('[OPTIMIZED] Shipment counts query');
    
    const counts = countsResult.rows[0] || {
      pending: 0,
      approved: 0, 
      pre_transit: 0,
      in_transit: 0,
      delivered: 0,
      rejected: 0,
      cancelled: 0,
      total: 0
    };
    
    res.json(counts);
    
  } catch (error) {
    console.error('[OPTIMIZED] Error in shipment counts:', error);
    res.status(500).json({ error: 'Failed to fetch counts' });
  }
});

// Quick status counts endpoint
optimizedRoutes.get('/api/admin/shipments/counts', async (req, res) => {
  try {
    console.time('[OPTIMIZED] Status counts query');
    
    const result = await db.execute(sql`
      SELECT 
        status,
        COUNT(*) as count
      FROM shipments 
      WHERE status IN ('approved', 'in_transit', 'delivered', 'pending', 'rejected', 'cancelled')
      GROUP BY status
      ORDER BY status
    `);
    
    console.timeEnd('[OPTIMIZED] Status counts query');
    
    const counts = result.rows.reduce((acc: any, row: any) => {
      acc[row.status] = Number(row.count);
      return acc;
    }, {});
    
    res.json(counts);
    
  } catch (error) {
    console.error('[OPTIMIZED] Error in status counts:', error);
    res.status(500).json({ error: 'Failed to fetch status counts' });
  }
});