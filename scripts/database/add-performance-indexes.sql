-- Performance optimization: Add critical database indexes for shipment queries
-- This script significantly improves query performance for common shipment operations

BEGIN;

-- Index for user-specific shipment queries (most common query pattern)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_shipments_user_id_status 
ON shipments (user_id, status);

-- Index for admin dashboard queries (status-based filtering)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_shipments_status_created_at 
ON shipments (status, created_at DESC);

-- Index for carrier tracking number lookups
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_shipments_carrier_tracking_number 
ON shipments (carrier_tracking_number) 
WHERE carrier_tracking_number IS NOT NULL;

-- Index for shipment number searches (customer support)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_shipments_shipment_number 
ON shipments (shipment_number);

-- Index for bulk upload queries (user + created date)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_shipments_user_created_date 
ON shipments (user_id, created_at DESC);

-- Composite index for admin filtering by status and user
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_shipments_status_user_id 
ON shipments (status, user_id);

-- Index for receiver country analytics
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_shipments_receiver_country 
ON shipments (receiver_country) 
WHERE receiver_country IS NOT NULL;

-- Index for service provider analytics
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_shipments_shipping_provider 
ON shipments (shipping_provider) 
WHERE shipping_provider IS NOT NULL;

-- Index for price range queries (admin analytics)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_shipments_total_price 
ON shipments (total_price) 
WHERE total_price > 0;

-- Session table optimization for authentication
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_sessions_user_id 
ON sessions (user_id) 
WHERE user_id IS NOT NULL;

-- Index for session expiry cleanup
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_sessions_expires_at 
ON sessions (expires_at);

-- Users table optimization
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_email_lower 
ON users (LOWER(email));

-- Index for user role-based queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_role 
ON users (role) 
WHERE role IS NOT NULL;

COMMIT;

-- Performance analysis query to verify index effectiveness
-- Run this after index creation to monitor performance improvements
/*
EXPLAIN ANALYZE 
SELECT * FROM shipments 
WHERE user_id = 1 AND status = 'pending' 
ORDER BY created_at DESC 
LIMIT 20;

EXPLAIN ANALYZE 
SELECT * FROM shipments 
WHERE status = 'approved' 
ORDER BY created_at DESC 
LIMIT 50;

EXPLAIN ANALYZE 
SELECT * FROM shipments 
WHERE carrier_tracking_number = '1Z5EY7350499888389';
*/