/**
 * Generate missing labels for approved shipments
 */
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { shipments } from './shared/schema.js';
import { eq } from 'drizzle-orm';
import { generateShippingLabel } from './server/services/labelGenerator.js';
import { promises as fs } from 'fs';
import path from 'path';

const sql = postgres(process.env.DATABASE_URL);
const db = drizzle(sql);

/**
 * Get label URL from file path
 */
function getLabelUrl(filePath) {
  // Convert absolute path to relative URL
  const relativePath = filePath.replace(process.cwd(), '');
  return relativePath.startsWith('/') ? relativePath : `/${relativePath}`;
}

async function generateMissingLabels() {
  try {
    console.log('Starting label generation for approved shipments without labels...');
    
    // Get approved shipments without label URLs
    const shipmentsWithoutLabels = await db
      .select()
      .from(shipments)
      .where(eq(shipments.status, 'approved'));
    
    console.log(`Found ${shipmentsWithoutLabels.length} approved shipments to check`);
    
    for (const shipment of shipmentsWithoutLabels) {
      if (!shipment.labelUrl) {
        try {
          console.log(`Generating label for shipment ${shipment.id}...`);
          
          const labelResult = await generateShippingLabel(shipment);
          const labelUrl = getLabelUrl(labelResult.labelPath);
          
          // Update the shipment with the label URL
          await db
            .update(shipments)
            .set({ labelUrl })
            .where(eq(shipments.id, shipment.id));
          
          console.log(`✓ Label generated for shipment ${shipment.id}: ${labelUrl}`);
          
        } catch (error) {
          console.error(`✗ Error generating label for shipment ${shipment.id}:`, error.message);
        }
      } else {
        console.log(`Shipment ${shipment.id} already has a label: ${shipment.labelUrl}`);
      }
    }
    
    console.log('Label generation completed!');
    
  } catch (error) {
    console.error('Error in label generation process:', error);
  } finally {
    await sql.end();
  }
}

generateMissingLabels();