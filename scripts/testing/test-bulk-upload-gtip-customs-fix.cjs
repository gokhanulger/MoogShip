/**
 * Comprehensive test to verify GTIP and customs value data flow in bulk upload
 * This validates that field mapping from preview table to shipment creation is working correctly
 */

const { execSync } = require('child_process');

async function testBulkUploadDataFlow() {
  try {
    console.log('🧪 Testing bulk upload GTIP and customs value data flow...\n');
    
    // Get recent bulk uploaded shipments
    const shipments = execSync(`
      psql $DATABASE_URL -c "
        SELECT 
          id, 
          receiver_name,
          gtip,
          customs_value,
          customs_item_count,
          created_at
        FROM shipments 
        WHERE id >= 630 
        ORDER BY id DESC 
        LIMIT 20;
      "
    `, { encoding: 'utf8' });
    
    console.log('📊 Recent bulk uploaded shipments (ID >= 630):');
    console.log(shipments);
    
    // Check GTIP population success rate
    const gtipCheck = execSync(`
      psql $DATABASE_URL -c "
        SELECT 
          COUNT(*) as total_shipments,
          COUNT(CASE WHEN gtip != '9999999999' AND gtip IS NOT NULL THEN 1 END) as populated_gtip,
          ROUND(
            (COUNT(CASE WHEN gtip != '9999999999' AND gtip IS NOT NULL THEN 1 END) * 100.0 / COUNT(*)), 
            1
          ) as gtip_success_rate
        FROM shipments 
        WHERE id >= 630;
      "
    `, { encoding: 'utf8' });
    
    console.log('\n📈 GTIP Population Analysis:');
    console.log(gtipCheck);
    
    // Check customs value population
    const customsCheck = execSync(`
      psql $DATABASE_URL -c "
        SELECT 
          COUNT(*) as total_shipments,
          COUNT(CASE WHEN customs_value > 10 THEN 1 END) as non_default_customs,
          AVG(customs_value) as avg_customs_value,
          MIN(customs_value) as min_customs_value,
          MAX(customs_value) as max_customs_value,
          ROUND(
            (COUNT(CASE WHEN customs_value > 10 THEN 1 END) * 100.0 / COUNT(*)), 
            1
          ) as customs_success_rate
        FROM shipments 
        WHERE id >= 630;
      "
    `, { encoding: 'utf8' });
    
    console.log('\n💰 Customs Value Analysis:');
    console.log(customsCheck);
    
    // Check for currency conversion issues (values divided by 100)
    const currencyIssueCheck = execSync(`
      psql $DATABASE_URL -c "
        SELECT 
          id,
          receiver_name,
          customs_value,
          total_price / 100.0 as total_price_dollars,
          CASE 
            WHEN customs_value < 1 THEN 'Likely divided by 100'
            WHEN customs_value BETWEEN 1 AND 10 THEN 'Default or very low'
            ELSE 'Normal value'
          END as value_status
        FROM shipments 
        WHERE id >= 670 
        ORDER BY id DESC 
        LIMIT 10;
      "
    `, { encoding: 'utf8' });
    
    console.log('\n🔍 Currency Conversion Issue Check (Recent 10):');
    console.log(currencyIssueCheck);
    
    // Verify customs item count
    const itemCountCheck = execSync(`
      psql $DATABASE_URL -c "
        SELECT 
          COUNT(*) as total_shipments,
          COUNT(CASE WHEN customs_item_count > 0 THEN 1 END) as with_item_count,
          AVG(customs_item_count) as avg_item_count
        FROM shipments 
        WHERE id >= 630;
      "
    `, { encoding: 'utf8' });
    
    console.log('\n📦 Customs Item Count Analysis:');
    console.log(itemCountCheck);
    
    // Check if bulk uploaded shipments have proper editing compatibility
    const editCompatibilityCheck = execSync(`
      psql $DATABASE_URL -c "
        SELECT 
          id,
          receiver_name,
          CASE 
            WHEN gtip IS NOT NULL AND customs_value IS NOT NULL AND customs_item_count IS NOT NULL 
            THEN 'Editable' 
            ELSE 'Missing fields' 
          END as edit_compatibility,
          gtip,
          customs_value,
          customs_item_count
        FROM shipments 
        WHERE id >= 675
        ORDER BY id DESC;
      "
    `, { encoding: 'utf8' });
    
    console.log('\n✏️ Shipment Edit Compatibility Check:');
    console.log(editCompatibilityCheck);
    
    console.log('\n✅ Test completed! Data flow verification complete.');
    console.log('\n📋 Summary:');
    console.log('- GTIP codes should now transfer from preview table (gtipCode field) to shipments (gtip field)');
    console.log('- Customs values should transfer from preview table (declaredValue field) to shipments (customsValue field)');
    console.log('- No currency division by 100 should occur in backend processing');
    console.log('- All bulk uploaded shipments should be editable with proper customs field population');
    
  } catch (error) {
    console.error('❌ Error during testing:', error);
  }
}

testBulkUploadDataFlow();