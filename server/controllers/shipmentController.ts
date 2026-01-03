import { Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import { PDFDocument } from 'pdf-lib';
// Extended request type with file for multer
interface FileRequest extends Request {
  file?: {
    originalname: string;
    mimetype: string;
    size: number;
    path: string;
    // buffer might be present when using memory storage
    buffer?: Buffer;
  };
}
import { storage } from '../storage';
import { ShipmentStatus, ServiceLevel, PickupStatus, packages, User, TransactionType } from '@shared/schema';
import { pool } from '../db';
import { sendPickupNotificationEmail } from '../email';
import { convertCountryNameToCode, hasStates } from '@shared/countries';
import { 
  generateShippingLabel, 
  getLabelUrl, 
  generateTrackingNumber,
  cleanAddressText
} from '../services/labelGenerator';
import { sendToShipEntegra, isEUCountry, isHMRCCountry } from '../services/shipentegra';
import * as xlsx from 'xlsx';
import { parse } from 'csv-parse/sync';
import { downloadPdfFromUrl } from '../utilities/pdfUtils';
import { sendBulkShipmentNotification, sendAdminBulkApprovalNotification } from '../services/bulkShipmentEmailService';

/**
 * Parse an Etsy CSV order file into shipment data
 * This function converts Etsy's exported Orders CSV format into the format needed for shipment creation
 * @param csvBufferOrPath - Either a Buffer containing CSV data or a path to a CSV file
 * @param isPath - If true, csvBufferOrPath is treated as a file path, otherwise as a buffer
 */
function parseEtsyOrdersCsv(csvBufferOrPath: Buffer | string, isPath: boolean = false): any[] {
  try {
    // Parse the CSV data
    let csvString: string;
    
    if (isPath && typeof csvBufferOrPath === 'string') {
      // Read from file path
      csvString = fs.readFileSync(csvBufferOrPath, 'utf8');
    } else if (Buffer.isBuffer(csvBufferOrPath)) {
      // Convert buffer to string
      csvString = csvBufferOrPath.toString('utf8');
    } else {
      throw new Error('Invalid input: expected Buffer or file path string');
    }
    
    const records = parse(csvString, {
      columns: true,
      skip_empty_lines: true,
      trim: true
    });
    
    if (records.length === 0) {
      return [];
    }
    
    console.log(`Parsed ${records.length} Etsy orders from CSV`);
    
    // Get the first record to analyze columns
    const firstRecord = records[0];
    const columnNames = Object.keys(firstRecord);
    console.log('Detected CSV columns:', columnNames);
    
    // Helper function to find the correct column name regardless of exact format
    const findColumn = (possibleNames: string[]): string | undefined => {
      return columnNames.find(col => possibleNames.some(name => 
        col.toLowerCase().includes(name.toLowerCase())
      ));
    };
  
    // Map column names to our expected format - prioritizing exact matches for required fields
    const shipNameCol = findColumn(['Ship Name', 'ShipName', 'Name', 'Recipient', 'Buyer Name', 'Full Name']);
    const firstNameCol = findColumn(['First Name', 'FirstName']);
    const lastNameCol = findColumn(['Last Name', 'LastName']);
    const buyerCol = findColumn(['Buyer', 'Customer']);
    const shipAddress1Col = findColumn(['Ship Address1', 'ShipAddress1', 'Address 1', 'Address Line 1', 'Street 1']);
    const shipAddress2Col = findColumn(['Ship Address2', 'ShipAddress2', 'Address 2', 'Address Line 2', 'Street 2']);
    const shipCityCol = findColumn(['Ship City', 'ShipCity', 'City', 'Town']);
    const shipStateCol = findColumn(['Ship State', 'ShipState', 'State', 'Province', 'Region']);
    const shipZipCol = findColumn(['Ship Zipcode', 'ShipZipcode', 'Zip', 'Postal', 'Post Code']);
    const shipCountryCol = findColumn(['Ship Country', 'ShipCountry', 'Country']);
    const orderIdCol = findColumn(['Order ID', 'OrderID', 'Order Number', 'Order #']);
    const itemNameCol = findColumn(['Item Name', 'ItemName', 'Product', 'Title', 'Item']);
    const saleDateCol = findColumn(['Sale Date', 'SaleDate', 'Order Date', 'Purchase Date']);
    const datePaidCol = findColumn(['Date Paid', 'DatePaid', 'Payment Date']);
    const dateShippedCol = findColumn(['Date Shipped', 'DateShipped', 'Ship Date']);
    const variationsCol = findColumn(['Variations', 'Product Options', 'Options']);
    const currencyCol = findColumn(['Currency', 'Currency Code']);
    const skuCol = findColumn(['SKU', 'Product Code', 'Item Code']);
    const emailCol = findColumn(['Email', 'Buyer Email', 'Customer Email']);
    const phoneCol = findColumn(['Phone', 'Telephone', 'Buyer Phone', 'Customer Phone']);
    const quantityCol = findColumn(['Quantity', 'Qty', 'Number of Items']);
    const orderValueCol = findColumn(['Order Value', 'OrderValue', 'Total', 'Price']);
    
    console.log('Mapped columns:', {
      shipNameCol, shipAddress1Col, shipCityCol, orderIdCol, itemNameCol, skuCol
    });
    
    // Filter out orders that have already been shipped
    console.log(`Found ${records.length} Etsy records, checking for Date Shipped column: ${dateShippedCol}`);
    let filteredRecords = records;
    
    if (dateShippedCol) {
      filteredRecords = records.filter(order => {
        // Only include orders where Date Shipped is empty
        return !order[dateShippedCol] || order[dateShippedCol].toString().trim() === '';
      });
      
      console.log(`After filtering out shipped orders, ${filteredRecords.length} Etsy orders remain`);
    }
    
    // Map filtered Etsy orders to our shipment format
    return filteredRecords.map((order: any) => {
      // Try to determine dimensions from SKU, item name or variations
      // Format examples: "DSNL-TRK-YZK-10X14" might indicate a 10x14 cm item
      let extractedDims = { length: 0, width: 0, height: 0, weight: 0 };
      
      // Parse SKU for dimensions
      if (skuCol && order[skuCol]) {
        const sku = order[skuCol];
        extractedDims = parseDimensionsFromText(sku, extractedDims);
      }
      
      // Check the item name for dimensions
      if (itemNameCol && order[itemNameCol]) {
        const itemName = order[itemNameCol];
        extractedDims = parseDimensionsFromText(itemName, extractedDims);
      }
      
      // Check variations for dimensions
      if (variationsCol && order[variationsCol]) {
        const variations = order[variationsCol];
        extractedDims = parseDimensionsFromText(variations, extractedDims);
        
        // Look for specific variations like "Size:" or "Dimensions:"
        if (variations.includes('Size:')) {
          const sizeMatch = variations.match(/Size:\s*([0-9x.]+)/i);
          if (sizeMatch && sizeMatch[1]) {
            extractedDims = parseDimensionsFromText(sizeMatch[1], extractedDims);
          }
        }
      }
      
      // Use extracted dimensions if found, otherwise use defaults
      // Default values: 15x10x1 cm and 0.5 kg as requested
      const packageLength = extractedDims.length > 0 ? extractedDims.length : 15; 
      const packageWidth = extractedDims.width > 0 ? extractedDims.width : 10;
      const packageHeight = extractedDims.height > 0 ? extractedDims.height : 1;
      const packageWeight = extractedDims.weight > 0 ? extractedDims.weight : 0.5;
      
      // Try to determine the best name
      let receiverName = '';
      
      if (shipNameCol && order[shipNameCol]) {
        receiverName = order[shipNameCol];
      } else if (firstNameCol && lastNameCol && order[firstNameCol] && order[lastNameCol]) {
        receiverName = `${order[firstNameCol]} ${order[lastNameCol]}`;
      } else if (buyerCol && order[buyerCol]) {
        // Clean up buyer field - sometimes has format "Name (userid)"
        const buyerName = order[buyerCol];
        if (buyerName) {
          const parenIndex = buyerName.indexOf('(');
          receiverName = parenIndex > 0 ? buyerName.substring(0, parenIndex).trim() : buyerName;
        }
      }
      
      // Don't use order number as name - this fixes the issue where recipient shows as #OrderNumber
      if (!receiverName || receiverName.trim() === '') {
        // If we have order info but no name, create a meaningful placeholder
        if (orderIdCol && order[orderIdCol]) {
          receiverName = `Unnamed Customer (Order: ${order[orderIdCol]})`;
        } else {
          receiverName = "Unnamed Customer";
        }
      }
      
      // Also check if the name starts with '#', which indicates it's an order number, not a name
      if (typeof receiverName === 'string' && receiverName.startsWith('#')) {
        // If we have order info, create a meaningful placeholder
        if (orderIdCol && order[orderIdCol]) {
          receiverName = `Unnamed Customer (Order: ${order[orderIdCol]})`;
        } else {
          receiverName = "Unnamed Customer";
        }
      }
      
      // Determine the best receiver address
      const receiverAddress = shipAddress1Col && order[shipAddress1Col] ? order[shipAddress1Col] : '';
      
      // Try to get receiver email and phone
      let receiverEmail = '(Not provided)';
      let receiverPhone = '(Not provided)';
      
      if (emailCol && order[emailCol]) {
        receiverEmail = order[emailCol];
      }
      
      if (phoneCol && order[phoneCol]) {
        receiverPhone = order[phoneCol];
      }
      
      // Default to standard service, but could be determined by order metadata
      const serviceLevel = 'standard';
      
      // Figure out the package contents
      let packageContents = 'Merchandise';
      if (itemNameCol && order[itemNameCol]) {
        packageContents = order[itemNameCol];
      }
      
      // If we have quantity, add it to the description
      if (quantityCol && order[quantityCol] && parseInt(order[quantityCol]) > 1) {
        packageContents = `${order[quantityCol]}x ${packageContents}`;
      }
      
      // Create a shipment from the Etsy order
      return {
        // Sender information (default values since Etsy doesn't provide this)
        senderName: 'TR Ofis',
        senderAddress: 'Mecidiyeköy Mah, Trump Towers',
        senderCity: 'Istanbul',
        senderCountry: 'Turkey',
        senderPostalCode: '34387',
        senderPhone: '+90 212 123 4567',
        senderEmail: 'shipping@moogship.com',
        
        // Receiver information from Etsy order - use mapped column names
        receiverName,
        receiverAddress,
        receiverAddress2: shipAddress2Col ? order[shipAddress2Col] || '' : '',
        receiverCity: shipCityCol ? order[shipCityCol] || '' : '',
        receiverState: shipStateCol ? order[shipStateCol] || '' : '',
        receiverCountry: shipCountryCol ? order[shipCountryCol] || '' : '',
        receiverPostalCode: shipZipCol ? order[shipZipCol] || '' : '',
        receiverPhone,
        receiverEmail,
        
        // Package details - using intelligent detection or defaults
        packageWeight,
        packageLength,
        packageWidth,
        packageHeight,
        packageContents,
        serviceLevel,
        
        // Additional information
        description: `Etsy Order #${orderIdCol ? order[orderIdCol] : ''} - ${packageContents}`,
        orderReference: orderIdCol ? order[orderIdCol] || '' : '',
        itemVariations: variationsCol ? order[variationsCol] || '' : '',
        orderDate: saleDateCol ? order[saleDateCol] || '' : '',
        paymentDate: datePaidCol ? order[datePaidCol] || '' : '',
        shipDate: dateShippedCol ? order[dateShippedCol] || '' : '',
        currency: currencyCol ? order[currencyCol] || 'USD' : 'USD',
        
        // Store original Etsy order number for UI reference
        orderNumber: orderIdCol ? order[orderIdCol] || '' : '',
        
        // Include SKU if available
        sku: skuCol ? order[skuCol] || '' : '',
        
        // Store the specific Etsy data fields requested by the user
        etsyData: {
          saleDate: saleDateCol ? order[saleDateCol] || '' : '',
          orderID: orderIdCol ? order[orderIdCol] || '' : '',
          fullName: shipNameCol ? order[shipNameCol] || '' : receiverName,
          street1: shipAddress1Col ? order[shipAddress1Col] || '' : '',
          street2: shipAddress2Col ? order[shipAddress2Col] || '' : '',
          shipCity: shipCityCol ? order[shipCityCol] || '' : '',
          shipState: shipStateCol ? order[shipStateCol] || '' : '',
          shipZipcode: shipZipCol ? order[shipZipCol] || '' : '',
          shipCountry: shipCountryCol ? order[shipCountryCol] || '' : '',
          currency: currencyCol ? order[currencyCol] || '' : '',
          orderValue: orderValueCol ? order[orderValueCol] || '' : '',
          sku: skuCol ? order[skuCol] || '' : ''
        },
        
        // Include original Etsy data for debugging
        originalOrderData: order
      };
    });
  } catch (error) {
    console.error('Error parsing Etsy CSV:', error);
    return [];
  }
}

/**
 * Try to parse dimensions from text like SKUs, item names, or variations
 * Looking for patterns like 10x14, 5cm x 10cm, etc.
 */
function parseDimensionsFromText(text: string, currentDims: {length: number, width: number, height: number, weight: number}) {
  if (!text) return currentDims;
  
  // Make a copy of the current dimensions
  const dims = {...currentDims};
  
  try {
    // Look for dimension patterns like 10x14, 10x14x5, 10cm x 14cm
    const dimensionRegex = /(\d+)(?:\s*[xX×]\s*)(\d+)(?:\s*[xX×]\s*)(\d+)?/g;
    const matchesArray = text.matchAll(dimensionRegex);
    const matches = Array.from(matchesArray);
    
    if (matches.length > 0) {
      // Use the first match
      const match = matches[0];
      if (match[1] && match[2]) {
        dims.length = parseInt(match[1]);
        dims.width = parseInt(match[2]);
        if (match[3]) {
          dims.height = parseInt(match[3]);
        }
      }
    }
    
    // Look for weight patterns like 0.5kg, 500g, 1.2 kg
    const weightRegex = /(\d+(?:\.\d+)?)\s*(?:kg|g|grams|kilograms)/i;
    const weightMatch = text.match(weightRegex);
    
    if (weightMatch && weightMatch[1]) {
      let weight = parseFloat(weightMatch[1]);
      // Convert to kg if in grams
      if (text.toLowerCase().includes('g') && !text.toLowerCase().includes('kg')) {
        weight = weight / 1000;
      }
      dims.weight = weight;
    }
  } catch (error) {
    console.error('Error parsing dimensions from text:', error);
  }
  
  return dims;
}

/**
 * Parse generic CSV/Excel data to detect recipient information
 * Automatically detects column names that contain recipient information
 */
function parseGenericShipmentData(rawData: any[]): any[] {
  if (!rawData || rawData.length === 0) {
    return [];
  }
  
  console.log(`Analyzing ${rawData.length} rows of generic CSV/Excel data`);
  
  // Get all column names from the first record
  const firstRecord = rawData[0];
  const columnNames = Object.keys(firstRecord);
  
  console.log('Detected columns:', columnNames);
  
  // Helper function to find columns that might contain specific types of data
  const findColumns = (keywordList: string[]): string[] => {
    return columnNames.filter(col => 
      keywordList.some(keyword => {
        // Add special handling for Turkish column names
        if (keyword === 'address' && (col === 'Adres' || col === 'Adres 1' || col === 'Adres1')) {
          return true;
        }
        return col.toLowerCase().includes(keyword.toLowerCase());
      })
    );
  };
  
  // Find potential columns for different data elements - prioritize company names
  const companyColumns = findColumns(['company', 'business', 'organization', 'firm', 'corp', 'inc', 'ltd', 'llc']);
  const nameColumns = findColumns(['name', 'customer', 'client', 'recipient', 'receiver', 'ship to', 'buyer']);
  const addressColumns = findColumns(['address', 'street', 'location', 'ship to']);
  const cityColumns = findColumns(['city', 'town', 'municipality']);
  const stateColumns = findColumns(['state', 'province', 'region', 'county']);
  const zipColumns = findColumns(['zip', 'postal', 'post code', 'code postal']);
  const countryColumns = findColumns(['country', 'nation']);
  const phoneColumns = findColumns(['phone', 'telephone', 'mobile', 'cell', 'tel']);
  const emailColumns = findColumns(['email', 'e-mail', 'mail']);
  const orderRefColumns = findColumns(['order', 'reference', 'ref', 'id', 'number']);
  const contentColumns = findColumns(['content', 'item', 'product', 'description', 'article']);
  const dimensionColumns = findColumns(['dimension', 'size', 'length', 'width', 'height']);
  const weightColumns = findColumns(['weight', 'kg', 'mass']);
  const dateShippedColumns = findColumns(['date shipped', 'ship date', 'shipped date', 'date of shipment']);
  const shippingTermsColumns = findColumns(['shipping terms', 'terms', 'dap', 'ddp', 'incoterms']);
  
  // Filter out rows where Date Shipped is not empty
  console.log(`Looking for Date Shipped columns among ${dateShippedColumns.length} potential columns`);
  if (dateShippedColumns.length > 0) {
    console.log('Date Shipped columns found:', dateShippedColumns);
    
    // Filter rawData to only include rows where date shipped is empty
    rawData = rawData.filter(row => {
      for (const col of dateShippedColumns) {
        // If the date shipped column exists and has a value, exclude this row
        if (row[col] && row[col].toString().trim() !== '') {
          return false;
        }
      }
      // Include rows where date shipped columns don't exist or are empty
      return true;
    });
    
    console.log(`After filtering out shipped items, ${rawData.length} rows remain`);
  } else {
    console.log('No Date Shipped columns detected');
  }

  // Create shipment objects from the filtered raw data
  return rawData.map((row, index) => {
    // Extract receiver name - PRIORITIZE COMPANY NAMES first
    let receiverName = '';
    
    // First priority: Company names
    for (const col of companyColumns) {
      if (row[col] && typeof row[col] === 'string' && row[col].trim() !== '') {
        receiverName = row[col].trim();
        console.log(`Using company name from ${col}: "${receiverName}"`);
        break;
      }
    }
    
    // Second priority: Regular name columns (only if no company name found)
    if (!receiverName) {
      for (const col of nameColumns) {
        if (row[col] && typeof row[col] === 'string' && row[col].trim() !== '') {
          receiverName = row[col].trim();
          console.log(`Using name from ${col}: "${receiverName}"`);
          break;
        }
      }
    }
    
    // Third priority: First and last name combination (only if no company or name found)
    if (!receiverName) {
      const firstNameCol = findColumns(['first'])[0];
      const lastNameCol = findColumns(['last'])[0];
      
      if (firstNameCol && lastNameCol && row[firstNameCol] && row[lastNameCol]) {
        receiverName = `${row[firstNameCol]} ${row[lastNameCol]}`;
        console.log(`Using first+last name: "${receiverName}"`);
      }
    }
    
    // Apply address cleaning to receiver name to remove database artifacts
    if (receiverName) {
      const originalName = receiverName;
      receiverName = cleanAddressText(receiverName);
        
      if (originalName !== receiverName) {
        console.log(`Cleaned receiver name: "${originalName}" → "${receiverName}"`);
      }
    }
    
    // If still no name, use a generic one based on row index
    if (!receiverName || receiverName.trim() === '') {
      receiverName = `Recipient ${index + 1}`;
    }
    
    // Also filter out names that look like order numbers (starting with #)
    if (typeof receiverName === 'string' && receiverName.startsWith('#')) {
      receiverName = `Recipient ${index + 1}`;
    }
    
    // Extract address
    let receiverAddress = '';
    
    // Add support for Turkish column names
    const turkishAddressColumns = ['Adres 1', 'Adres1', 'Adres'];
    const allAddressColumns = [...addressColumns, ...turkishAddressColumns];
    
    for (const col of allAddressColumns) {
      if (row[col] && typeof row[col] === 'string' && row[col].trim() !== '') {
        receiverAddress = row[col].trim();
        console.log(`Using ${col} for receiverAddress: "${receiverAddress}"`);
        break;
      }
    }
    
    // Extract address line 2
    let receiverAddress2 = '';
    // Look more broadly for address line 2 or street 2 - including exact column name matches and Turkish column names
    const address2Cols = columnNames.filter(col => 
      col.toLowerCase() === 'street 2' || 
      col.toLowerCase() === 'address 2' || 
      col.toLowerCase() === 'address2' ||
      col.toLowerCase() === 'street2' ||
      col.toLowerCase() === 'receiveraddress2' || 
      col.toLowerCase() === 'receiver address 2' ||
      col.toLowerCase() === 'adres 2' || // Turkish column name
      col.toLowerCase().includes('address') && col.toLowerCase().includes('2') ||
      col.toLowerCase().includes('adres') && col.toLowerCase().includes('2') || // Turkish
      col.toLowerCase().includes('street') && col.toLowerCase().includes('2') ||
      col.toLowerCase().includes('line') && col.toLowerCase().includes('2')
    );
    
    console.log('Found potential address2 columns:', address2Cols);
    
    for (const col of address2Cols) {
      if (row[col] && typeof row[col] === 'string' && row[col].trim() !== '') {
        receiverAddress2 = row[col].trim();
        console.log(`Using ${col} for receiverAddress2: "${receiverAddress2}"`);
        
        // Keep address lines separate for carrier API mapping
        console.log(`Found address2: "${receiverAddress2}"`);
        console.log(`Primary address: "${receiverAddress}"`);
        console.log(`Address lines will be kept separate for proper carrier API handling`);
        
        break;
      }
    }
    
    // Keep receiverAddress2 separate for proper carrier API mapping
    // Don't combine into single field as carriers need separate address lines
    
    // Extract city
    let receiverCity = '';
    for (const col of cityColumns) {
      if (row[col] && typeof row[col] === 'string') {
        receiverCity = row[col];
        break;
      }
    }
    
    // Extract state/province
    let receiverState = '';
    for (const col of stateColumns) {
      if (row[col] && typeof row[col] === 'string') {
        receiverState = row[col];
        break;
      }
    }
    
    // Extract postal code
    let receiverPostalCode = '';
    for (const col of zipColumns) {
      if (row[col]) {
        // Convert to string in case it's a number
        receiverPostalCode = String(row[col]);
        break;
      }
    }
    
    // Extract country
    let receiverCountry = '';
    for (const col of countryColumns) {
      if (row[col] && typeof row[col] === 'string') {
        receiverCountry = row[col];
        break;
      }
    }
    
    // Extract phone
    let receiverPhone = '';
    for (const col of phoneColumns) {
      if (row[col]) {
        // Convert to string in case it's a number
        receiverPhone = String(row[col]);
        break;
      }
    }
    
    // Extract email
    let receiverEmail = '';
    for (const col of emailColumns) {
      if (row[col] && typeof row[col] === 'string') {
        receiverEmail = row[col];
        break;
      }
    }
    
    // Extract order reference
    let orderReference = '';
    for (const col of orderRefColumns) {
      if (row[col]) {
        // Convert to string in case it's a number
        orderReference = String(row[col]);
        break;
      }
    }
    
    // Extract package contents/description
    let packageContents = 'Merchandise';
    for (const col of contentColumns) {
      if (row[col] && typeof row[col] === 'string') {
        packageContents = row[col];
        break;
      }
    }
    
    // Look for dimensions in the data
    // Default package dimensions: 15x10x1 cm and 0.5 kg
    let packageLength = 15;
    let packageWidth = 10;
    let packageHeight = 1;
    let packageWeight = 0.5;
    
    // First check specific dimension columns
    for (const col of dimensionColumns) {
      if (row[col] && typeof row[col] === 'string') {
        const dims = parseDimensionsFromText(row[col], {
          length: packageLength,
          width: packageWidth,
          height: packageHeight,
          weight: packageWeight
        });
        
        packageLength = dims.length;
        packageWidth = dims.width;
        packageHeight = dims.height;
      }
    }
    
    // Check weight columns
    for (const col of weightColumns) {
      if (row[col]) {
        // Try to parse weight - could be a number or string with units
        if (typeof row[col] === 'number') {
          packageWeight = row[col];
        } else if (typeof row[col] === 'string') {
          const dims = parseDimensionsFromText(row[col], {
            length: packageLength,
            width: packageWidth,
            height: packageHeight,
            weight: packageWeight
          });
          packageWeight = dims.weight;
        }
        break;
      }
    }
    
    // Look for dimensions in any text field
    for (const col of columnNames) {
      if (row[col] && typeof row[col] === 'string') {
        const text = row[col];
        const dims = parseDimensionsFromText(text, {
          length: packageLength,
          width: packageWidth,
          height: packageHeight,
          weight: packageWeight
        });
        
        // Update if we found dimensions
        if (dims.length !== packageLength || dims.width !== packageWidth || 
            dims.height !== packageHeight || dims.weight !== packageWeight) {
          packageLength = dims.length;
          packageWidth = dims.width;
          packageHeight = dims.height;
          packageWeight = dims.weight;
          break;
        }
      }
    }
    
    // Extract shipping terms (DAP/DDP)
    let shippingTerms = 'dap'; // Default to DAP
    for (const col of shippingTermsColumns) {
      if (row[col] && typeof row[col] === 'string') {
        const terms = row[col].toLowerCase().trim();
        if (terms === 'ddp' || terms.includes('ddp')) {
          shippingTerms = 'ddp';
          break;
        } else if (terms === 'dap' || terms.includes('dap')) {
          shippingTerms = 'dap';
          break;
        }
      }
    }
    
    // Also check if specific column names indicate DDP/DAP directly
    const colName = columnNames.find(col => col.toLowerCase() === 'shippingterms' || col.toLowerCase() === 'shipping_terms');
    if (colName && row[colName]) {
      const terms = String(row[colName]).toLowerCase().trim();
      if (terms === 'ddp' || terms.includes('ddp')) {
        shippingTerms = 'ddp';
      } else if (terms === 'dap' || terms.includes('dap')) {
        shippingTerms = 'dap';
      }
    }
    
    // Return the constructed shipment object
    return {
      // Sender information (default values)
      senderName: 'TR Ofis',
      senderAddress: 'Mecidiyeköy Mah, Trump Towers',
      senderCity: 'Istanbul',
      senderCountry: 'Turkey',
      senderPostalCode: '34387',
      senderPhone: '+90 212 123 4567',
      senderEmail: 'shipping@moogship.com',
      
      // Receiver information extracted from the data
      receiverName,
      receiverAddress,
      receiverAddress2,
      receiverCity,
      receiverState,
      receiverCountry,
      receiverPostalCode,
      receiverPhone,
      receiverEmail,
      
      // Package details - using extracted data or defaults
      packageWeight,
      packageLength,
      packageWidth,
      packageHeight,
      packageContents,
      serviceLevel: ServiceLevel.STANDARD,
      shippingTerms, // DAP or DDP
      
      // Additional information
      description: packageContents,
      orderReference,
      
      // Include original data for debugging
      originalRowData: row
    };
  });
}

/**
 * Create a new shipment
 */
export const createShipment = async (req: Request, res: Response) => {
  console.log('🚀 SHIPMENT CREATION DEBUG - Starting shipment creation workflow...');
  
  try {
    // Get authenticated user data
    const user = req.user;
    const adminUserId = user?.id || 1; // The admin creating the shipment
    
    // Handle admin billing to other users
    let userId = req.body.userId || req.body.userId; // Use userId from admin form
    let targetUser = user;
    const defaultMultiplier = await storage.getDefaultPriceMultiplier();
    let userPriceMultiplier = user?.priceMultiplier || defaultMultiplier;

    if (user?.role === 'admin' && userId) {
      // Admin is creating a shipment and billing to another user
      console.log(`🔧 ADMIN BILLING: Admin ${adminUserId} creating shipment for user ${userId}`);

      // Get the target user's information for pricing
      try {
        targetUser = await storage.getUser(userId);
        if (!targetUser) {
          return res.status(400).json({
            message: 'Selected user not found',
            error: 'USER_NOT_FOUND'
          });
        }
        userPriceMultiplier = targetUser.priceMultiplier || defaultMultiplier;
        console.log(`👤 Target user found: ${targetUser.name} (ID: ${userId}) with multiplier: ${userPriceMultiplier}`);
      } catch (error) {
        console.error('Error fetching target user:', error);
        return res.status(400).json({ 
          message: 'Failed to fetch user information',
          error: 'USER_FETCH_ERROR'
        });
      }
    } else if (user?.role === 'admin' && req.body.createdByAdmin) {
      // Admin creating shipment but no specific user selected - shouldn't happen with new UI
      return res.status(400).json({ 
        message: 'Please select a customer for the shipment',
        error: 'NO_CUSTOMER_SELECTED'
      });
    } else {
      // Regular user creating their own shipment
      userId = adminUserId;
    }
    
    // userId is already properly set above
    
    console.log('📦 SHIPMENT CREATION DEBUG - Creating shipment with data:', JSON.stringify(req.body, null, 2));
    console.log('👤 SHIPMENT CREATION DEBUG - User data:', { id: userId, multiplier: userPriceMultiplier, role: user?.role, username: user?.username });
    
    // CRITICAL DEBUG: Log exact pricing data received from frontend
    console.log('💰 SHIPMENT CREATION PRICING DEBUG - Raw pricing data from frontend:');
    console.log('  🔍 basePrice:', req.body.basePrice);
    console.log('  🔍 fuelCharge:', req.body.fuelCharge);
    console.log('  🔍 totalPrice:', req.body.totalPrice);
    console.log('  🔍 originalBasePrice:', req.body.originalBasePrice);
    console.log('  🔍 originalFuelCharge:', req.body.originalFuelCharge);
    console.log('  🔍 originalTotalPrice:', req.body.originalTotalPrice);
    console.log('  🔍 appliedMultiplier:', req.body.appliedMultiplier);
    console.log('  🔍 User multiplier from session:', userPriceMultiplier);
    
    // STEP 1: Analyze if price calculation phase already applied multiplier
    console.log('📊 STEP 1: Analyzing price calculation phase results...');
    if (req.body.appliedMultiplier !== undefined) {
      console.log('  ✅ Price calculator already applied multiplier:', req.body.appliedMultiplier);
      console.log('  📈 Customer sees price (already multiplied):', req.body.totalPrice);
      console.log('  📉 Original ShipEntegra cost:', req.body.originalTotalPrice);
    } else {
      console.log('  ⚠️ No appliedMultiplier field detected from price calculator');
      console.log('  🚨 This suggests prices may not have gone through proper calculation phase');
    }
    
    // Check if this is a shipment to an EU country and has IOSS number
    const countryCode = req.body.receiverCountry;
    // Using imported isEUCountry function from server/services/shipentegra.ts
    const isEUDestination = isEUCountry(countryCode);
    const hasIossNumber = req.body.iossNumber && req.body.iossNumber.trim() !== '';
    
    console.log(`[createShipment] IOSS Check - Country: ${countryCode}, EU Country: ${isEUDestination}, IOSS Number Present: ${hasIossNumber}, IOSS Value: ${req.body.iossNumber || 'not set'}`);
    
    // CRITICAL: Enforce IOSS number requirement for ALL EU destinations
    const isHMRCDestination = isHMRCCountry(countryCode);
    if (isEUDestination && !isHMRCDestination && !hasIossNumber) {
      console.log(`❌ [IOSS VALIDATION] EU destination ${countryCode} requires IOSS number`);
      return res.status(400).json({ 
        message: 'IOSS number is required for shipments to EU countries',
        error: 'IOSS_REQUIRED',
        countryCode: countryCode,
        isEUDestination: true,
        details: 'Import One-Stop Shop (IOSS) number is mandatory for e-commerce goods shipped to European Union countries'
      });
    }
    
    // Validate HMRC number for UK and Sweden
    if (isHMRCDestination && !hasIossNumber) {
      console.log(`❌ [HMRC VALIDATION] HMRC destination ${countryCode} requires HMRC number`);
      return res.status(400).json({ 
        message: 'HMRC number is required for shipments to UK and Sweden',
        error: 'HMRC_REQUIRED',
        countryCode: countryCode,
        isHMRCDestination: true,
        details: 'HMRC registration number is mandatory for shipments to United Kingdom and Sweden'
      });
    }
    
    // Validate state field for countries that have states
    if (hasStates(countryCode)) {
      const hasState = req.body.receiverState && req.body.receiverState.trim() !== '';
      
      if (!hasState) {
        console.log(`❌ [STATE VALIDATION] Country ${countryCode} requires state/province field`);
        return res.status(400).json({ 
          message: 'State/province is required for this destination',
          error: 'STATE_REQUIRED',
          countryCode: countryCode,
          details: 'State or province field is mandatory for shipments to this country'
        });
      }
    }
    
    // Use the pricing provided by the client or calculate it if not provided
    const shipmentData = { ...req.body };
    
    // Map receiverSuite to receiverAddress2 for shipping provider compatibility
    if (shipmentData.receiverSuite && shipmentData.receiverSuite.trim() !== '') {
      shipmentData.receiverAddress2 = shipmentData.receiverSuite.trim();
      console.log('✅ Mapped receiverSuite to receiverAddress2:', shipmentData.receiverAddress2);
    }
    
    // Add default sender information for admin-created shipments
    if (user?.role === 'admin' && req.body.createdByAdmin) {
      // Use the selected customer's information as sender for their shipment
      if (targetUser && targetUser.id !== adminUserId) {
        shipmentData.senderName = targetUser.name || targetUser.username || 'Customer';
        shipmentData.senderAddress = targetUser.address || 'Customer Address';
        shipmentData.senderCity = targetUser.city || 'Customer City';
        shipmentData.senderCountry = targetUser.country || 'Turkey';
        shipmentData.senderPostalCode = targetUser.postalCode || '34000';
        shipmentData.senderPhone = targetUser.phone || '+90 000 000 0000';
        shipmentData.senderEmail = targetUser.email || 'customer@email.com';
        console.log(`✅ Using customer ${targetUser.name} as sender for their shipment`);
      } else {
        // Fallback to default company info if customer data not available
        shipmentData.senderName = shipmentData.senderName || 'MoogShip';
        shipmentData.senderAddress = shipmentData.senderAddress || 'Mecidiyeköy Mah, Trump Towers';
        shipmentData.senderCity = shipmentData.senderCity || 'Istanbul';
        shipmentData.senderCountry = shipmentData.senderCountry || 'Turkey';
        shipmentData.senderPostalCode = shipmentData.senderPostalCode || '34387';
        shipmentData.senderPhone = shipmentData.senderPhone || '+90 212 123 4567';
        shipmentData.senderEmail = shipmentData.senderEmail || 'shipping@moogship.com';
        console.log('✅ Using fallback company sender information');
      }
      
      // Map receiverAddress1 and receiverAddress2 to receiverAddress for database compatibility
      if (shipmentData.receiverAddress1) {
        let fullAddress = shipmentData.receiverAddress1;
        if (shipmentData.receiverAddress2) {
          fullAddress += ', ' + shipmentData.receiverAddress2;
        }
        shipmentData.receiverAddress = fullAddress;
        console.log('✅ Mapped receiver address:', fullAddress);
      }
      
      // Add default package contents for admin-created shipments
      if (!shipmentData.packageContents) {
        shipmentData.packageContents = 'General merchandise';
        console.log('✅ Added default package contents');
      }
      
      console.log('✅ Added default sender information for admin-created shipment');
    }
    
    // Remove admin-specific fields that shouldn't be stored in the shipment
    delete shipmentData.userId;
    
    // Check credit limit if we have totalPrice and the user isn't an admin
    if (shipmentData.totalPrice && user?.role !== 'admin') {
      const creditCheck = await checkUserCreditLimit(userId, shipmentData.totalPrice);
      
      if (!creditCheck.success) {
        return res.status(400).json({ message: creditCheck.message });
      }
      
      // If the shipment would exceed credit limit, prevent creation
      if (creditCheck.exceedsLimit) {
        return res.status(400).json({ 
          message: `Cannot create shipment: ${creditCheck.message}`,
          requiresOverride: true,
          creditDetails: {
            userBalance: creditCheck.currentBalance,
            shipmentPrice: creditCheck.shipmentCost,
            newBalance: creditCheck.newBalance,
            minBalance: creditCheck.minimumBalance,
            exceededAmount: creditCheck.exceededAmount,
            formattedUserBalance: `$${(creditCheck.currentBalance / 100).toFixed(2)}`,
            formattedShipmentPrice: `$${(creditCheck.shipmentCost / 100).toFixed(2)}`,
            formattedNewBalance: `$${(creditCheck.newBalance / 100).toFixed(2)}`,
            formattedMinBalance: creditCheck.minimumBalance !== null ? 
              `$${(creditCheck.minimumBalance / 100).toFixed(2)}` : 'Not set',
            formattedExceededAmount: `$${(creditCheck.exceededAmount / 100).toFixed(2)}`,
            user: creditCheck.user ? {
              id: creditCheck.user.id,
              username: creditCheck.user.username,
              name: creditCheck.user.name
            } : undefined
          }
        });
      }
    }
    
    // Convert pieceCount from string to number if needed
    if (shipmentData.pieceCount && typeof shipmentData.pieceCount === 'string') {
      shipmentData.pieceCount = parseInt(shipmentData.pieceCount, 10) || 1;
    }
    
    // Ensure piece count is at least 1
    const pieceCount = shipmentData.pieceCount || 1;
    
    // Convert package dimensions to integers since the database schema requires it
    if (shipmentData.packageLength) {
      shipmentData.packageLength = Math.round(Number(shipmentData.packageLength));
    }
    
    if (shipmentData.packageWidth) {
      shipmentData.packageWidth = Math.round(Number(shipmentData.packageWidth));
    }
    
    if (shipmentData.packageHeight) {
      shipmentData.packageHeight = Math.round(Number(shipmentData.packageHeight));
    }
    
    // Ensure weight is a number
    if (shipmentData.packageWeight) {
      shipmentData.packageWeight = Number(shipmentData.packageWeight);
    }
    
    console.log(`Creating shipment with ${pieceCount} pieces`);
    
    // STEP 2: Critical double multiplication prevention logic
    console.log('🔒 STEP 2: Double multiplication prevention analysis...');
    
    // Check if prices have already been multiplied by checking for appliedMultiplier field AND value > 1
    const priceAlreadyMultiplied = shipmentData.appliedMultiplier !== undefined && shipmentData.appliedMultiplier > 1;
    
    if (priceAlreadyMultiplied) {
      console.log('  ✅ DETECTION: Price calculator already applied multiplier:', shipmentData.appliedMultiplier);
      console.log('  💰 Customer sees (already multiplied):', shipmentData.totalPrice);
      console.log('  💲 Original ShipEntegra cost:', shipmentData.originalTotalPrice);
      console.log('  🛡️ PREVENTION: Using prices as-is to prevent double multiplication');
      
      // CRITICAL: Do NOT multiply again - prices are already customer prices
      console.log('  📊 FINAL SHIPMENT PRICING:');
      console.log('    - Total Price (customer):', shipmentData.totalPrice);
      console.log('    - Base Price (customer):', shipmentData.basePrice);
      console.log('    - Fuel Charge (customer):', shipmentData.fuelCharge);
      console.log('    - Applied Multiplier:', shipmentData.appliedMultiplier);
      
      // Store original prices if they exist (these come from the price calculator)
      if (!shipmentData.originalBasePrice && shipmentData.basePrice) {
        shipmentData.originalBasePrice = Math.round(shipmentData.basePrice / shipmentData.appliedMultiplier);
        console.log('    - Calculated Original Base Price:', shipmentData.originalBasePrice);
      }
      if (!shipmentData.originalFuelCharge && shipmentData.fuelCharge) {
        shipmentData.originalFuelCharge = Math.round(shipmentData.fuelCharge / shipmentData.appliedMultiplier);
        console.log('    - Calculated Original Fuel Charge:', shipmentData.originalFuelCharge);
      }
      if (!shipmentData.originalTotalPrice && shipmentData.totalPrice) {
        // Calculate original total price, accounting for additional fee which is not multiplied
        const additionalFee = shipmentData.originalAdditionalFee || shipmentData.additionalFee || 0;
        const totalPriceExcludingAdditionalFee = shipmentData.totalPrice - additionalFee;
        const originalTotalWithoutFee = Math.round(totalPriceExcludingAdditionalFee / shipmentData.appliedMultiplier);
        shipmentData.originalTotalPrice = originalTotalWithoutFee + additionalFee;
        console.log('    - Calculated Original Total Price (including additional fee):', shipmentData.originalTotalPrice);
      }
    } else {
      // This should rarely happen since the price calculator handles multipliers
      console.log('  ⚠️ WARNING: No appliedMultiplier detected from price calculator');
      console.log('  🚨 This suggests prices may need manual multiplication');
      console.log('  ⚡ Applying multiplier for user:', user?.username, 'Multiplier:', userPriceMultiplier);
      
      // Store original prices before multiplying
      const originalBase = shipmentData.basePrice;
      const originalFuel = shipmentData.fuelCharge;
      const originalTotal = shipmentData.totalPrice;
      
      if (shipmentData.basePrice && !shipmentData.originalBasePrice) {
        shipmentData.originalBasePrice = shipmentData.basePrice;
      }
      if (shipmentData.fuelCharge && !shipmentData.originalFuelCharge) {
        shipmentData.originalFuelCharge = shipmentData.fuelCharge;
      }
      if (shipmentData.totalPrice && !shipmentData.originalTotalPrice) {
        // Include originalAdditionalFee in originalTotalPrice calculation
        const additionalFee = shipmentData.originalAdditionalFee || shipmentData.additionalFee || 0;
        shipmentData.originalTotalPrice = shipmentData.totalPrice + additionalFee;
      }
      
      // Apply user-specific price multiplier
      if (shipmentData.basePrice) {
        shipmentData.basePrice = Math.round(shipmentData.basePrice * userPriceMultiplier);
        console.log('  📈 Base Price: ', originalBase, ' → ', shipmentData.basePrice);
      }
      
      if (shipmentData.fuelCharge) {
        shipmentData.fuelCharge = Math.round(shipmentData.fuelCharge * userPriceMultiplier);
        console.log('  📈 Fuel Charge: ', originalFuel, ' → ', shipmentData.fuelCharge);
      }
      
      // Handle additionalFee (pass through without multiplier)
      const additionalFee = shipmentData.additionalFee || 0;
      if (additionalFee > 0) {
        console.log('  💰 Additional Fee (pass-through): ', additionalFee);
        shipmentData.originalAdditionalFee = additionalFee;
      }
      
      // Recalculate total price with additionalFee
      if (shipmentData.basePrice || shipmentData.fuelCharge || additionalFee) {
        const baseWithMultiplier = shipmentData.basePrice || 0;
        const fuelWithMultiplier = shipmentData.fuelCharge || 0;
        shipmentData.totalPrice = baseWithMultiplier + fuelWithMultiplier + additionalFee;
        console.log('  📈 Total Price: ', originalTotal, ' → ', shipmentData.totalPrice, '(includes additional fee:', additionalFee, ')');
        console.log('  ✅ Applied multiplier', userPriceMultiplier, '- Original:', shipmentData.originalTotalPrice, 'Customer:', shipmentData.totalPrice);
      }
      
      shipmentData.appliedMultiplier = userPriceMultiplier;
    }
    
    // STEP 3: Final price verification before database storage
    console.log('🗃️ STEP 3: Final price verification before database storage...');
    console.log('  💰 Final Total Price for database:', shipmentData.totalPrice);
    console.log('  💲 Final Original Price for database:', shipmentData.originalTotalPrice);
    console.log('  📊 Final Applied Multiplier for database:', shipmentData.appliedMultiplier);
    console.log('  👤 User multiplier from session:', userPriceMultiplier);
    
    // Verify multiplication logic is correct
    if (shipmentData.originalTotalPrice && shipmentData.appliedMultiplier) {
      const expectedCustomerPrice = Math.round(shipmentData.originalTotalPrice * shipmentData.appliedMultiplier);
      const actualCustomerPrice = shipmentData.totalPrice;
      
      if (expectedCustomerPrice === actualCustomerPrice) {
        console.log('  ✅ VERIFICATION PASSED: Customer price matches expected calculation');
        console.log('    Expected:', expectedCustomerPrice, 'Actual:', actualCustomerPrice);
      } else {
        console.log('  🚨 VERIFICATION FAILED: Customer price mismatch!');
        console.log('    Expected:', expectedCustomerPrice, 'Actual:', actualCustomerPrice);
        console.log('    Difference:', actualCustomerPrice - expectedCustomerPrice);
      }
    }
    
    // Process package items to calculate customs values if provided
    if (shipmentData.packageItems && Array.isArray(shipmentData.packageItems) && shipmentData.packageItems.length > 0) {
      console.log(`Processing ${shipmentData.packageItems.length} package items for customs declaration...`);
      
      // Calculate total value and item count for customs
      let totalCustomsValue = 0;
      let totalCustomsItemCount = 0;
      
      for (const item of shipmentData.packageItems) {
        // Add item price * quantity to total customs value
        if (item.price && item.quantity) {
          // Parse as float, then multiply by 100 and round to get cents as integer
          const itemPrice = parseFloat(parseFloat(item.price).toFixed(2)); // Ensure price is rounded to 2 decimal places
          const itemQuantity = parseInt(item.quantity);
          const itemValue = itemPrice * itemQuantity;
          totalCustomsValue += itemValue;
          totalCustomsItemCount += itemQuantity;
          console.log(`Item: ${item.name}, Price: ${itemPrice.toFixed(2)}, Quantity: ${itemQuantity}, Value: ${itemValue.toFixed(2)}, Running Total: ${totalCustomsValue.toFixed(2)}`);
        }
      }
      
      // Store customs values in the shipment data (integers in cents)
      // Convert dollars to cents (multiply by 100) and round to nearest integer
      shipmentData.customsValue = Math.round(totalCustomsValue * 100);
      shipmentData.customsItemCount = totalCustomsItemCount;
      
      // Fix: Ensure the totalCustomsValue is properly rounded for logging and calculations
      const formattedValue = parseFloat(totalCustomsValue.toFixed(2));
      const centsValue = Math.round(formattedValue * 100);
      shipmentData.customsValue = centsValue; // Update with properly rounded integer in cents
      console.log(`Calculated customs values - Total Value: $${formattedValue.toFixed(2)} (${centsValue} cents), Total Items: ${totalCustomsItemCount}`);
    } else {
      // No package items provided, use default values
      console.log('No package items provided, checking for explicit customs value...');
      
      // CRITICAL FIX: Check if customsValue was explicitly provided (e.g., from admin form)
      if (shipmentData.customsValue !== undefined && shipmentData.customsValue !== null) {
        console.log(`Using explicit customs value provided: ${shipmentData.customsValue} cents ($${(shipmentData.customsValue / 100).toFixed(2)})`);
        // Keep the provided customs value as-is (already in cents from frontend)
      } else {
        console.log('No explicit customs value provided, using fallback');
        // Make sure customsValue is stored as cents - use totalPrice (already in cents) or default to $50 (5000 cents)
        shipmentData.customsValue = shipmentData.totalPrice || 5000; // Default to shipment total price or $50 (5000 cents)
      }
      
      // Set default item count if not provided
      if (!shipmentData.customsItemCount) {
        shipmentData.customsItemCount = 1; // Default to 1 item
      }
    }
    
    // STEP 4: Calculate insurance cost if insurance is enabled
    console.log('🛡️ STEP 4: Insurance cost calculation...');
    if (shipmentData.includeInsurance && shipmentData.insuranceValue && !shipmentData.insuranceCost) {
      console.log('  🔍 Insurance detected: Value =', shipmentData.insuranceValue, 'cents');
      
      try {
        // Get insurance ranges from database
        const insuranceRanges = await storage.getActiveInsuranceRanges();
        console.log('  📊 Found', insuranceRanges.length, 'insurance ranges');
        
        // Find the appropriate range for the value
        const applicableRange = insuranceRanges.find(range => 
          shipmentData.insuranceValue >= range.minValue && shipmentData.insuranceValue <= range.maxValue
        );
        
        if (applicableRange) {
          shipmentData.insuranceCost = applicableRange.insuranceCost;
          console.log('  ✅ Insurance cost calculated using range:', applicableRange.insuranceCost, 'cents');
        } else {
          // Default calculation if no range found (2% of value with minimum $5)
          const calculatedCost = Math.max(Math.round(shipmentData.insuranceValue * 0.02), 500);
          shipmentData.insuranceCost = calculatedCost;
          console.log('  ⚠️ No range found, using default calculation:', calculatedCost, 'cents (2% of value, min $5)');
        }
        
        console.log('  💰 Final insurance cost:', shipmentData.insuranceCost, 'cents ($' + (shipmentData.insuranceCost / 100).toFixed(2) + ')');
      } catch (error) {
        console.error('  ❌ Error calculating insurance cost:', error);
        // Use default calculation as fallback
        const fallbackCost = Math.max(Math.round(shipmentData.insuranceValue * 0.02), 500);
        shipmentData.insuranceCost = fallbackCost;
        console.log('  🔄 Using fallback calculation:', fallbackCost, 'cents');
      }
    } else if (shipmentData.includeInsurance) {
      console.log('  ⚠️ Insurance enabled but missing value or cost already provided');
    } else {
      console.log('  ➡️ No insurance requested, skipping calculation');
    }

    // STEP 5: Calculate DDP duties and taxes if DDP shipping terms selected
    console.log('🏛️ STEP 5: DDP duty and tax calculation...');
    
    // Auto-determine shipping terms for US destinations
    const isUSDestination = shipmentData.receiverCountry === 'US' || 
                          shipmentData.receiverCountry === 'USA' || 
                          shipmentData.receiverCountry === 'United States' ||
                          countryCode === 'US';
    
    if (isUSDestination && !shipmentData.shippingTerms) {
      shipmentData.shippingTerms = 'ddp'; // US always gets DDP
      console.log('  🇺🇸 US destination detected, auto-setting shipping terms to DDP');
    }
    
    if (shipmentData.shippingTerms === 'ddp' && isUSDestination) {
      console.log('  🔍 DDP shipping terms detected for US destination');
      
      // First check if the frontend already provided split duty values (base HS and Trump tariffs)
      if (req.body.ddpBaseDutiesAmount !== undefined && req.body.ddpTrumpTariffsAmount !== undefined) {
        console.log('  ✅ Using pre-calculated split duties from frontend:');
        shipmentData.ddpBaseDutiesAmount = req.body.ddpBaseDutiesAmount || 0;
        shipmentData.ddpTrumpTariffsAmount = req.body.ddpTrumpTariffsAmount || 0;
        shipmentData.ddpDutiesAmount = req.body.ddpDutiesAmount || (shipmentData.ddpBaseDutiesAmount + shipmentData.ddpTrumpTariffsAmount);
        // Check if ECO shipping based on selectedService
        const isEcoShipping = shipmentData.selectedService && 
          (shipmentData.selectedService.toLowerCase().includes('eko') || 
           shipmentData.selectedService.toLowerCase().includes('eco'));
        // ECO shipping: 45 cents, Standard shipping: $4.50 (450 cents)
        shipmentData.ddpProcessingFee = req.body.ddpProcessingFee || (isEcoShipping ? 45 : 450);
        shipmentData.ddpTaxAmount = req.body.ddpTaxAmount || 0;
        
        console.log(`    📊 Base HS Duties: $${(shipmentData.ddpBaseDutiesAmount / 100).toFixed(2)}`);
        console.log(`    📊 Trump Tariffs: $${(shipmentData.ddpTrumpTariffsAmount / 100).toFixed(2)}`);
        console.log(`    📊 Total Duties: $${(shipmentData.ddpDutiesAmount / 100).toFixed(2)}`);
        console.log(`    📊 DDP Processing Fee: $${(shipmentData.ddpProcessingFee / 100).toFixed(2)}`);
      } else {
        // If no pre-calculated values, calculate them now
        try {
          // Calculate DDP processing fee based on shipping method
          // Check if ECO shipping based on selectedService
          const isEcoShipping = shipmentData.selectedService && 
            (shipmentData.selectedService.toLowerCase().includes('eko') || 
             shipmentData.selectedService.toLowerCase().includes('eco'));
          // ECO shipping: 45 cents, Standard shipping: $4.50 (450 cents)
          const ddpProcessingFee = isEcoShipping ? 45 : 450;
          shipmentData.ddpProcessingFee = ddpProcessingFee;
          console.log('  💰 DDP processing fee set:', ddpProcessingFee, 'cents ($', (ddpProcessingFee / 100).toFixed(2), ')');
          
          // Calculate duties immediately instead of waiting for after creation
          if (shipmentData.customsValue) {
          console.log('  📋 Calculating DDP duties for customs value:', shipmentData.customsValue, 'cents');
          
          try {
            // Import duty calculation service
            const USITCDutyService = (await import('../services/usitc-duty-rates')).default;
            const usitcService = new USITCDutyService();
            
            // Use HS code if provided, otherwise use default
            const hsCode = shipmentData.gtip || '9999999999';
            
            // Calculate duties using USITC rates
            const dutyLookup = await usitcService.getDutyRate(hsCode);
            
            if (dutyLookup && dutyLookup.dutyPercentage !== null) {
              const customsValueInDollars = shipmentData.customsValue / 100;
              const baseDuty = customsValueInDollars * (dutyLookup.dutyPercentage / 100);
              const trumpTariff = 0; // Would be calculated separately if applicable
              const totalDuty = baseDuty + trumpTariff;
              
              shipmentData.ddpDutiesAmount = Math.round(totalDuty * 100); // Convert to cents
              shipmentData.ddpTaxAmount = 0; // State taxes not implemented yet
              
              console.log(`  ✅ Calculated DDP duties: $${(shipmentData.ddpDutiesAmount / 100).toFixed(2)} (${dutyLookup.dutyPercentage}% rate)`);
            } else {
              // Default to 20% duty if no specific rate found
              console.log('  ⚠️ Could not calculate specific duty rate, using default 20%');
              const customsValueInDollars = shipmentData.customsValue / 100;
              const estimatedDuty = customsValueInDollars * 0.20; // 20% default
              
              shipmentData.ddpDutiesAmount = Math.round(estimatedDuty * 100); // Convert to cents
              shipmentData.ddpTaxAmount = 0;
              
              console.log(`  ✅ Using default 20% duty: $${(shipmentData.ddpDutiesAmount / 100).toFixed(2)}`);
            }
          } catch (error) {
            console.error('  ❌ Error in duty calculation:', error);
            // Fallback: use 20% of customs value
            const customsValueInDollars = shipmentData.customsValue / 100;
            const estimatedDuty = customsValueInDollars * 0.20; // 20% default
            
            shipmentData.ddpDutiesAmount = Math.round(estimatedDuty * 100);
            shipmentData.ddpTaxAmount = 0;
            
            console.log(`  🔄 Fallback duty calculation: $${(shipmentData.ddpDutiesAmount / 100).toFixed(2)} (20% of customs value)`);
            }
          } else {
            console.log('  ⚠️ Missing customs value, using total price for duty estimation');
            // Use total price as customs value if not provided
            const estimatedCustomsValue = shipmentData.totalPrice || 5000; // Default $50
            const estimatedDuty = (estimatedCustomsValue / 100) * 0.20; // 20% of value
            
            shipmentData.ddpDutiesAmount = Math.round(estimatedDuty * 100);
            shipmentData.ddpTaxAmount = 0;
            
            console.log(`  ✅ Estimated duties from total price: $${(shipmentData.ddpDutiesAmount / 100).toFixed(2)}`);
          }
        } catch (error) {
          console.error('  ❌ Error calculating DDP duties and taxes:', error);
          // Set reasonable defaults on error
          const fallbackCustomsValue = shipmentData.customsValue || shipmentData.totalPrice || 5000;
          const fallbackDuty = (fallbackCustomsValue / 100) * 0.20; // 20% fallback
          
          shipmentData.ddpDutiesAmount = Math.round(fallbackDuty * 100);
          shipmentData.ddpTaxAmount = 0;
          // Check if ECO shipping based on selectedService for processing fee
          const isEcoShipping = shipmentData.selectedService && 
            (shipmentData.selectedService.toLowerCase().includes('eko') || 
             shipmentData.selectedService.toLowerCase().includes('eco'));
          // ECO shipping: 45 cents, Standard shipping: $4.50 (450 cents)
          shipmentData.ddpProcessingFee = isEcoShipping ? 45 : 450;
          
          console.log(`  🔄 Using fallback duty calculation: $${(shipmentData.ddpDutiesAmount / 100).toFixed(2)}`);
        }
      }
    } else if (shipmentData.shippingTerms === 'ddp') {
      console.log('  ⚠️ DDP shipping terms selected but destination is not US - only US DDP is supported');
      // Reset DDP fields for non-US destinations
      shipmentData.ddpDutiesAmount = 0;
      shipmentData.ddpTaxAmount = 0;
      shipmentData.ddpProcessingFee = 0;
    } else {
      console.log('  ➡️ DAP shipping terms selected, skipping DDP calculations');
      // Ensure DDP fields are cleared for DAP shipments
      shipmentData.ddpDutiesAmount = 0;
      shipmentData.ddpTaxAmount = 0;
      shipmentData.ddpProcessingFee = 0;
    }

    // Ensure sender name is limited to 15 characters
    if (shipmentData.senderName && shipmentData.senderName.length > 15) {
      console.log(`Truncating sender name "${shipmentData.senderName}" to 15 characters`);
      shipmentData.senderName = shipmentData.senderName.substring(0, 15);
    }
    
    // Create the shipment with calculated pricing and customs values
    const shipment = await storage.createShipment(shipmentData, userId);
    console.log('Shipment created successfully with pricing:', shipment.id, 'Total price:', shipmentData.totalPrice, 'Customs value:', shipmentData.customsValue);
    
    // Send notification email to administrators
    try {
      // Import the email notification function
      const { sendNewShipmentNotification } = await import('../notification-emails');
      
      // Get the full user information
      const shipmentUser = await storage.getUser(userId);
      
      if (shipmentUser) {
        // Send notification in background, don't block the response
        sendNewShipmentNotification(shipment, shipmentUser)
          .then(result => {
            if (result.success) {
              console.log(`Admin notification emails sent successfully for shipment ${shipment.id}`);
            } else {
              console.warn(`Failed to send some or all admin notification emails for shipment ${shipment.id}:`, result.error);
            }
          })
          .catch(err => {
            console.error(`Error sending admin notification emails for shipment ${shipment.id}:`, err);
          });
      } else {
        console.warn(`Could not send admin notification emails for shipment ${shipment.id}: User ${userId} not found`);
      }
    } catch (emailError) {
      console.error('Error sending shipment notification email:', emailError);
      // Continue even if email sending fails
    }
    
    // Create physical package records for the shipment
    try {
      console.log(`Creating physical package records for shipment ${shipment.id}`);
      
      // Check if client sent package data
      if (shipmentData.packages && Array.isArray(shipmentData.packages) && shipmentData.packages.length > 0) {
        console.log(`Using ${shipmentData.packages.length} packages sent from client`);
        
        // Collect all packages to insert together
        const packagesToInsert = [];
        
        // Process each package individually
        for (const packageData of shipmentData.packages) {
          // Make sure we're getting numeric values for the dimensions
          const weight = typeof packageData.weight === 'number' ? packageData.weight : 
                       parseFloat(packageData.weight) || shipmentData.packageWeight;
          const length = typeof packageData.length === 'number' ? packageData.length : 
                       parseFloat(packageData.length) || shipmentData.packageLength;
          const width = typeof packageData.width === 'number' ? packageData.width : 
                      parseFloat(packageData.width) || shipmentData.packageWidth;
          const height = typeof packageData.height === 'number' ? packageData.height : 
                       parseFloat(packageData.height) || shipmentData.packageHeight;
          
          // Log package dimensions before saving
          console.log(`Package dimensions - Weight: ${weight}kg, Dimensions: ${length}×${width}×${height}cm, Name: ${packageData.name || 'Package'}`);
          
          // Add to packages to create with numeric values for dimensions
          const packageRecord = {
            shipmentId: shipment.id,
            name: packageData.name || "Package",
            description: packageData.description || `Package for shipment #${shipment.id}`,
            weight: Number(weight),
            length: Number(length),
            width: Number(width),
            height: Number(height)
          };
          
          packagesToInsert.push(packageRecord);
          
          console.log(`DEBUG: Adding package with specific dimensions:`, packageRecord);
        }
        
        // Insert all packages at once
        if (packagesToInsert.length > 0) {
          console.log(`Creating ${packagesToInsert.length} physical packages with individual dimensions`);
          
          // Important: Convert all dimensions to strings for the database
          const formattedPackages = packagesToInsert.map(pkg => {
            return {
              ...pkg,
              weight: typeof pkg.weight === 'number' ? pkg.weight.toString() : String(pkg.weight),
              length: typeof pkg.length === 'number' ? pkg.length.toString() : String(pkg.length),
              width: typeof pkg.width === 'number' ? pkg.width.toString() : String(pkg.width),
              height: typeof pkg.height === 'number' ? pkg.height.toString() : String(pkg.height)
            };
          });
          
          console.log(`Package data example:`, JSON.stringify(formattedPackages[0]));
          
          // Use the storage method to create packages
          const createdPackages = await storage.createManyPackages(formattedPackages);
          console.log(`Created ${createdPackages.length} packages in database`);
        }
      } else {
        // Fallback to the old way if no packages array is provided
        console.log(`No specific package data found, creating ${pieceCount} generic packages`);
        
        // Create physical packages with the dimensions from the shipment
        const packageDimensions = {
          weight: shipmentData.packageWeight,
          length: shipmentData.packageLength,
          width: shipmentData.packageWidth,
          height: shipmentData.packageHeight
        };
        
        await storage.createPhysicalPackagesForShipment(
          shipment.id,
          pieceCount,
          packageDimensions,
          null,  // name parameter
          null   // description parameter
        );
      }
      
      console.log(`Created physical package records for shipment ${shipment.id}`);
    } catch (packageError) {
      console.error('Error creating physical package records:', packageError);
      // Continue with the shipment creation even if package record creation fails
    }
    
    // STEP 6: Calculate and update DDP duties after shipment creation (when package items are available)
    console.log('🔍🔍🔍 STEP 6 DEBUG: Checking DDP duty calculation conditions...');
    console.log('  - shippingTerms:', shipmentData.shippingTerms);
    console.log('  - receiverCountry:', shipmentData.receiverCountry);
    console.log('  - shipment.id:', shipment.id);
    
    // FORCE EXECUTION for debugging - run duty calculation for any DDP shipment to US
    const shouldCalculateDuties = (shipmentData.shippingTerms === 'ddp' || shipment.shippingTerms === 'ddp') && 
        (shipmentData.receiverCountry === 'US' || shipment.receiverCountry === 'US') && 
        shipment.id;
    console.log('  - shouldCalculateDuties:', shouldCalculateDuties);
    
    if (shouldCalculateDuties) {
      console.log('🏛️ STEP 6: Post-creation DDP duty calculation with actual package items...');
      
      try {
        // Query package items from database
        const packageItems = await storage.getShipmentPackageItems(shipment.id);
        console.log(`  📋 Found ${packageItems.length} package items for duty calculation`);
        
        if (packageItems.length > 0) {
          // Use the first package item for duty calculation (can be enhanced to handle multiple items)
          const firstItem = packageItems[0];
          const hsCode = firstItem.hsCode || '';
          const productDescription = firstItem.name || 'General merchandise';
          const customsValueInDollars = shipmentData.customsValue / 100; // Convert cents to dollars
          
          console.log(`  📊 Duty calculation inputs: HS code="${hsCode}", Description="${productDescription}", Value=$${customsValueInDollars}`);
          
          if (hsCode) {
            // Import and use the USITC duty service
            const USITCDutyService = (await import('../services/usitc-duty-rates')).default;
            const usitcService = new USITCDutyService();
            
            const usitcResult = await usitcService.getDutyRateAndAmount(hsCode, customsValueInDollars);
            
            if (usitcResult && usitcResult.dutyAmount > 0) {
              const totalDutyAmountCents = Math.round(usitcResult.dutyAmount * 100);
              const baseDutyAmountCents = Math.round(usitcResult.baseDutyAmount * 100);
              const trumpTariffAmountCents = Math.round(usitcResult.trumpTariffAmount * 100);
              // Check if ECO shipping based on selectedService
              const isEcoShipping = shipment.selectedService && 
                (shipment.selectedService.toLowerCase().includes('eko') || 
                 shipment.selectedService.toLowerCase().includes('eco'));
              // ECO shipping: 45 cents, Standard shipping: $4.50 (450 cents)
              const ddpProcessingFee = isEcoShipping ? 45 : 450;
              
              console.log(`  💰 Duty breakdown: Base=$${(baseDutyAmountCents/100).toFixed(2)}, Trump=$${(trumpTariffAmountCents/100).toFixed(2)}, Total=$${(totalDutyAmountCents/100).toFixed(2)}`);
              
              // Update the shipment with calculated duty amounts (separated) and duty rates
              await storage.updateShipment(shipment.id, {
                ddpDutiesAmount: totalDutyAmountCents,
                ddpBaseDutiesAmount: baseDutyAmountCents,
                ddpTrumpTariffsAmount: trumpTariffAmountCents,
                ddpTaxAmount: 0, // State taxes not implemented yet
                ddpProcessingFee: ddpProcessingFee,
                ddpBaseDutyRate: usitcResult.baseDutyRate || 0,
                ddpTrumpTariffRate: usitcResult.trumpTariffRate || 0,
                ddpTotalDutyRate: usitcResult.totalDutyRate || 0
              });
              
              console.log(`  ✅ USITC duty calculation successful and saved to database:`);
              console.log(`    - HS Code: ${hsCode}`);
              console.log(`    - Base duties: ${baseDutyAmountCents} cents ($${(baseDutyAmountCents/100).toFixed(2)})`);
              console.log(`    - Trump tariffs: ${trumpTariffAmountCents} cents ($${(trumpTariffAmountCents/100).toFixed(2)})`);
              console.log(`    - Total duty amount: ${totalDutyAmountCents} cents ($${(totalDutyAmountCents/100).toFixed(2)})`);
              console.log(`    - Tax amount: 0 cents (state taxes not implemented yet)`);
              console.log(`    - Processing fee: ${ddpProcessingFee} cents ($${(ddpProcessingFee/100).toFixed(2)})`);
              
              const totalDDPCosts = totalDutyAmountCents + 0 + ddpProcessingFee;
              
              // IMPORTANT: Do NOT deduct DDP costs during shipment creation
              // DDP costs (base duties, Trump tariffs, processing fees) should only be charged
              // after admin approval, not during creation
              console.log(`  ℹ️ DDP costs calculated but NOT deducted from balance (waiting for admin approval):`);
              console.log(`     - Base customs duties: $${(baseDutyAmountCents/100).toFixed(2)}`);
              console.log(`     - Trump tariffs: $${(trumpTariffAmountCents/100).toFixed(2)}`);
              console.log(`     - Processing fee: $${(ddpProcessingFee/100).toFixed(2)}`);
              console.log(`     - Total DDP costs: $${(totalDDPCosts/100).toFixed(2)}`);
              console.log(`     - These will be charged when admin approves the shipment`);
              
            } else {
              console.log(`  ⚠️ USITC service did not return duty calculation for HS code: ${hsCode}`);
            }
          } else {
            console.log(`  ⚠️ No HS code found for package item: ${firstItem.name}`);
          }
        } else {
          console.log(`  ⚠️ No package items found for shipment ${shipment.id}`);
        }
      } catch (dutyError) {
        console.error(`  ❌ Error in post-creation duty calculation:`, dutyError);
      }
    }
    
    // Generate the shipping label
    try {
      console.log('Generating shipping label...');
      const labelResult = await generateShippingLabel(shipment);
      const labelUrl = getLabelUrl(labelResult.labelPath);
      console.log('Label generated successfully at:', labelUrl);
      
      // Update the shipment with the label URL and PDF data
      await storage.updateShipment(shipment.id, {
        status: ShipmentStatus.PENDING,
        labelUrl: labelUrl,
        labelPdf: labelResult.labelBase64
      });
      
      // Return the updated shipment
      const updatedShipment = await storage.getShipment(shipment.id);
      return res.status(200).json(updatedShipment);
    } catch (labelError) {
      console.error('Error generating label:', labelError);
      // Still return the shipment even if label generation fails
      return res.status(200).json(shipment);
    }
  } catch (error) {
    console.error('🚨 CRITICAL ERROR in createShipment:', error);
    console.error('🚨 Error details:', {
      name: error instanceof Error ? error.name : 'Unknown',
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : 'No stack trace',
      userId: user?.id || 'undefined',
      requestBody: JSON.stringify(req.body)
    });
    return res.status(500).json({ 
      message: 'Failed to create shipment',
      error: error instanceof Error ? error.message : String(error)
    });
  }
};

/**
 * Upload bulk shipments
 */
export const uploadBulkShipments = async (req: FileRequest, res: Response) => {
  try {
    // Get user data from authenticated user
    const user = req.user;
    const userId = user?.id;

    if (!userId) {
      return res.status(401).json({ message: 'User not authenticated' });
    }

    // Get user's price multiplier if available (use system default as fallback)
    const defaultMultiplier = await storage.getDefaultPriceMultiplier();
    const userPriceMultiplier = user?.priceMultiplier || defaultMultiplier;
    
    // Make sure we have a file in the request
    if (!req.file) {
      console.error('🔍 VALIDATE BULK: No file in request');
      return res.status(400).json({ message: 'No file uploaded' });
    }
    
    // Read the uploaded file
    console.log('🔍 VALIDATE BULK: Processing uploaded file:', req.file.originalname);
    console.log('🔍 VALIDATE BULK: File size:', req.file.size);
    console.log('🔍 VALIDATE BULK: File mimetype:', req.file.mimetype);
    
    let shipmentsData: any[] = [];
    let fileType: 'excel' | 'etsy-csv' = 'excel'; // Default to excel
    const createLabels = req.body.createLabels === 'true';
    
    // Check if client provided prepared shipments data with pricing
    if (req.body.shipments) {
      try {
        // Parse the shipments data sent from the client
        shipmentsData = JSON.parse(req.body.shipments);
        console.log(`Using ${shipmentsData.length} prepared shipments from client with pricing details`);
        
        // Apply price multiplier to prepared shipments from client  
        shipmentsData = shipmentsData.map(shipment => {
          // Check if prices have already been multiplied by checking for appliedMultiplier field AND value > 1
          // The price calculator API sets appliedMultiplier to indicate what was applied
          // If appliedMultiplier > 1, prices have been multiplied; if 1.0, they are original costs
          const priceAlreadyMultiplied = shipment.appliedMultiplier !== undefined && shipment.appliedMultiplier > 1;
          
          // Store original prices if they exist (these come from the price calculator)
          if (shipment.originalBasePrice) {
            console.log(`Bulk: Using original base price from calculator: ${shipment.originalBasePrice}`);
          } else if (shipment.basePrice) {
            shipment.originalBasePrice = shipment.basePrice;
          }
          
          if (shipment.originalFuelCharge) {
            console.log(`Bulk: Using original fuel charge from calculator: ${shipment.originalFuelCharge}`);
          } else if (shipment.fuelCharge) {
            shipment.originalFuelCharge = shipment.fuelCharge;
          }
          
          if (shipment.originalTotalPrice) {
            console.log(`Bulk: Using original total price from calculator: ${shipment.originalTotalPrice}`);
          } else if (shipment.totalPrice) {
            // Include originalAdditionalFee in originalTotalPrice calculation
            const additionalFee = shipment.originalAdditionalFee || shipment.additionalFee || 0;
            shipment.originalTotalPrice = shipment.totalPrice + additionalFee;
          }
          
          // Record the applied multiplier
          if (priceAlreadyMultiplied) {
            console.log(`Bulk shipment price calculator already applied multiplier ${shipment.appliedMultiplier}. Using prices as-is.`);
            console.log(`Bulk customer price: ${shipment.totalPrice}, Original cost: ${shipment.originalTotalPrice}`);
            // Even if no multiplier is applied, set the field to prevent issues in createShipment
            shipment.appliedMultiplier = shipment.appliedMultiplier || 1;
            console.log(`✅ BULK IMPORT FIX: Set appliedMultiplier=${shipment.appliedMultiplier} for already processed shipment`);
          } else {
            // This should rarely happen since the price calculator handles multipliers
            console.log(`Bulk: No multiplier detected from price calculator. Applying multiplier ${userPriceMultiplier}`);
            
            // Store original prices before multiplying
            if (shipment.basePrice && !shipment.originalBasePrice) {
              shipment.originalBasePrice = shipment.basePrice;
            }
            if (shipment.fuelCharge && !shipment.originalFuelCharge) {
              shipment.originalFuelCharge = shipment.fuelCharge;
            }
            if (shipment.totalPrice && !shipment.originalTotalPrice) {
              // Include originalAdditionalFee in originalTotalPrice calculation
              const additionalFee = shipment.originalAdditionalFee || shipment.additionalFee || 0;
              shipment.originalTotalPrice = shipment.totalPrice + additionalFee;
            }
            
            // Apply user-specific price multiplier
            if (shipment.basePrice) {
              shipment.basePrice = Math.round(shipment.basePrice * userPriceMultiplier);
            }
            
            if (shipment.fuelCharge) {
              shipment.fuelCharge = Math.round(shipment.fuelCharge * userPriceMultiplier);
            }
            
            if (shipment.totalPrice) {
              shipment.totalPrice = Math.round(shipment.totalPrice * userPriceMultiplier);
            }
            
            shipment.appliedMultiplier = userPriceMultiplier;
            console.log(`✅ BULK IMPORT FIX: Set appliedMultiplier=${userPriceMultiplier} to prevent double multiplication in createShipment`);
          }
          
          return shipment;
        });
        
        console.log(`Applied price multiplier ${userPriceMultiplier} to ${shipmentsData.length} prepared shipments`);
        
        // Ensure sender name is truncated to 15 characters for all shipments
    shipmentsData = shipmentsData.map(shipment => {
      if (shipment.senderName && shipment.senderName.length > 15) {
        console.log(`Bulk upload: Truncating sender name "${shipment.senderName}" to 15 characters`);
        shipment.senderName = shipment.senderName.substring(0, 15);
      }
      return shipment;
    });
        
    // Detect if this is Etsy data
    if (shipmentsData.length > 0 && shipmentsData[0].orderNumber) {
      fileType = 'etsy-csv';
    }
      } catch (e) {
        console.error('Error parsing shipments data from request:', e);
        // Fall back to parsing the file
      }
    }
    
    // If no shipments data was provided in the request, parse from file
    if (shipmentsData.length === 0) {
      try {
        // Determine file type based on extension
        const fileName = req.file.originalname.toLowerCase();
        
        if (fileName.endsWith('.csv')) {
          // Check if this is an Etsy CSV file by looking for specific headers
          // Read file from disk since we're using disk storage in multer
          const csvString = fs.readFileSync(req.file.path, 'utf8');
          const firstLine = csvString.split('\n')[0].trim();
          
          // More flexible Etsy CSV detection - looking for key column patterns
          const isEtsyCsv = 
            // Check for various column patterns that indicate this is an Etsy export
            (firstLine.toLowerCase().includes('sale date') || firstLine.toLowerCase().includes('order date')) &&
            (
              // Direct Etsy shipping fields
              firstLine.toLowerCase().includes('ship name') || 
              firstLine.toLowerCase().includes('recipient') ||
              // Full name with shipping address fields (more precise)
              (firstLine.toLowerCase().includes('full name') && 
               (firstLine.toLowerCase().includes('ship city') || firstLine.toLowerCase().includes('ship state') || 
                firstLine.toLowerCase().includes('ship country') || firstLine.toLowerCase().includes('address'))) ||
              // Buyer fields with address/location info
              (firstLine.toLowerCase().includes('buyer') && 
               (firstLine.toLowerCase().includes('address') || firstLine.toLowerCase().includes('city'))) ||
              // Ship address fields (common in Etsy exports)
              (firstLine.toLowerCase().includes('ship city') || firstLine.toLowerCase().includes('ship state') || firstLine.toLowerCase().includes('ship country'))
            ) &&
            (firstLine.toLowerCase().includes('order id') || firstLine.toLowerCase().includes('order #'));
            
          if (isEtsyCsv) {
            console.log('Detected Etsy orders CSV format');
            fileType = 'etsy-csv';
            
            // Parse Etsy CSV file
            shipmentsData = parseEtsyOrdersCsv(req.file.path, true);
          } else {
            // Regular CSV, treat as Excel
            const workbook = xlsx.readFile(req.file.path);
            const worksheet = workbook.Sheets[workbook.SheetNames[0]];
            const rawData = xlsx.utils.sheet_to_json(worksheet);
            
            // Process generic CSV/Excel data to extract recipient information
            shipmentsData = parseGenericShipmentData(rawData);
          }
        } else if (fileName.endsWith('.numbers')) {
          // Apple Numbers file - treat as Excel but log it
          console.log('Apple Numbers file detected - attempting to process');
          try {
            // Try to read as Excel - might work if it's a compatible format
            const workbook = xlsx.readFile(req.file.path);
            const worksheet = workbook.Sheets[workbook.SheetNames[0]];
            const rawData = xlsx.utils.sheet_to_json(worksheet);
            
            // Process generic Excel data to extract recipient information
            shipmentsData = parseGenericShipmentData(rawData);
          } catch (numbersError) {
            console.error('Error reading Apple Numbers file:', numbersError);
            return res.status(400).json({ 
              message: 'Apple Numbers files are not directly supported. Please export to CSV or Excel format.'
            });
          }
        } else {
          // Excel file
          const workbook = xlsx.readFile(req.file.path);
          
          // Get the first worksheet
          const worksheet = workbook.Sheets[workbook.SheetNames[0]];
          
          // Convert to JSON
          const rawData = xlsx.utils.sheet_to_json(worksheet);
          
          // Process generic Excel data to extract recipient information
          shipmentsData = parseGenericShipmentData(rawData);
        }
      } catch (e) {
        console.error('Error processing file:', e);
        return res.status(400).json({ message: `Error processing file: ${e}` });
      }
    }
    
    if (shipmentsData.length === 0) {
      return res.status(400).json({ message: 'The uploaded file contains no shipment data' });
    }
    
    console.log(`Extracted ${shipmentsData.length} shipments from the uploaded file`);
    
    // Apply default dimensions to each shipment and ensure numeric values
    shipmentsData = shipmentsData.map(shipment => {
      // Convert pieceCount from string to number if needed
      let pieceCount = shipment.pieceCount || 1;
      if (typeof pieceCount === 'string') {
        pieceCount = parseInt(pieceCount, 10) || 1;
      }
      
      // Package dimensions must be integers for the database
      const length = Math.round(Number(shipment.length || 15));
      const width = Math.round(Number(shipment.width || 10));
      const height = Math.round(Number(shipment.height || 1));
      
      return {
        ...shipment,
        length: length,
        width: width, 
        height: height,
        weight: shipment.weight || 0.5,
        pieceCount: pieceCount
      };
    });
    
    // Filter out any shipments that should be skipped (marked with skipImport=true)
    const shipmentsToCreate = shipmentsData.filter(shipment => !shipment.skipImport);
    
    if (shipmentsToCreate.length === 0) {
      return res.status(400).json({ 
        message: 'No shipments to create. All shipments were skipped or the file was empty.'
      });
    }
    
    console.log(`Creating ${shipmentsToCreate.length} shipments out of ${shipmentsData.length} total`);
    
    // Create the shipments with the filtered data
    const createdShipments = await storage.createBulkShipments(shipmentsToCreate, userId);
    
    console.log(`Successfully created ${createdShipments.length} shipments`);
    
    // Create physical package records for each shipment
    for (const shipment of createdShipments) {
      try {
        const originalShipmentData = shipmentsToCreate.find(s => s.receiverName === shipment.receiverName && 
          s.receiverAddress === shipment.receiverAddress);
        
        if (originalShipmentData) {
          const pieceCount = originalShipmentData.pieceCount || 1;
          
          console.log(`Creating ${pieceCount} physical package records for bulk shipment ${shipment.id}`);
          
          // Create physical packages with the dimensions from the shipment
          // Apply number conversion to the dimensions
          const packageDimensions = {
            weight: typeof shipment.packageWeight === 'string' ? Number(shipment.packageWeight) : shipment.packageWeight,
            length: typeof shipment.packageLength === 'string' ? Number(shipment.packageLength) : shipment.packageLength,
            width: typeof shipment.packageWidth === 'string' ? Number(shipment.packageWidth) : shipment.packageWidth,
            height: typeof shipment.packageHeight === 'string' ? Number(shipment.packageHeight) : shipment.packageHeight
          };
          
          const packages = await storage.createPhysicalPackagesForShipment(
            shipment.id,
            pieceCount,
            packageDimensions,
            null,  // name parameter
            null   // description parameter
          );
          
          console.log(`Created physical package records for shipment ${shipment.id}`);
        }
      } catch (packageError) {
        console.error(`Error creating physical package records for shipment ${shipment.id}:`, packageError);
        // Continue with the other shipments even if package record creation fails for one
      }
    }
    
    // Generate labels if requested
    if (createLabels) {
      console.log(`Automatically generating labels for ${createdShipments.length} shipments`);
      
      for (const shipment of createdShipments) {
        try {
          // Generate label
          const labelResult = await generateShippingLabel(shipment);
          const labelUrl = getLabelUrl(labelResult.labelPath);
          
          // Update the shipment with the label URL and PDF data
          await storage.updateShipment(shipment.id, {
            status: ShipmentStatus.PENDING,
            labelUrl: labelUrl,
            labelPdf: labelResult.labelBase64
          });
          
          console.log(`Generated label for shipment ${shipment.id}: ${labelUrl}`);
        } catch (labelError) {
          console.error(`Error generating label for shipment ${shipment.id}:`, labelError);
        }
      }
      
      // Reload shipments to get updated label URLs
      const updatedShipments = await Promise.all(
        createdShipments.map(s => storage.getShipment(s.id))
      );
      
      // Filter out any undefined shipments
      const finalShipments = updatedShipments.filter(s => s !== undefined);
      
      return res.status(200).json({
        message: `Successfully uploaded ${finalShipments.length} shipments with labels${
          shipmentsData.length > shipmentsToCreate.length 
            ? ` (${shipmentsData.length - shipmentsToCreate.length} shipments were skipped)`
            : ''
        }`,
        shipments: finalShipments
      });
    }
    
    return res.status(200).json({
      message: `Successfully uploaded ${createdShipments.length} shipments${
        shipmentsData.length > shipmentsToCreate.length 
          ? ` (${shipmentsData.length - shipmentsToCreate.length} shipments were skipped)`
          : ''
      }`,
      shipments: createdShipments
    });
  } catch (error) {
    console.error('Error uploading bulk shipments:', error);
    return res.status(500).json({ message: 'Failed to upload bulk shipments' });
  }
};

/**
 * Get all shipments for the current user
 */
export const getMyShipments = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    
    if (!userId) {
      return res.status(401).json({ message: 'User not authenticated' });
    }
    
    const shipments = await storage.getUserShipments(userId);
    return res.status(200).json(shipments);
  } catch (error) {
    console.error('[SHIPMENTS] Error fetching user shipments:', error);
    return res.status(500).json({ message: 'Failed to fetch shipments' });
  }
};

/**
 * Get all shipments (admin only)
 */
export const getAllShipments = async (req: Request, res: Response) => {
  try {
    const shipments = await storage.getAllShipments();
    
    // Now, for each shipment, fetch the packages data
    const shipmentsWithPackages = await Promise.all(
      shipments.map(async (shipment) => {
        // Fetch the physical packages for this shipment
        const packages = await storage.getShipmentPackages(shipment.id);
        
        // Return the shipment with packages included
        return {
          ...shipment,
          packages: packages
        };
      })
    );
    
    return res.status(200).json(shipmentsWithPackages);
  } catch (error) {
    console.error('Error fetching all shipments:', error);
    return res.status(500).json({ message: 'Failed to fetch shipments' });
  }
};

/**
 * Get all shipments for tracking management (fast version without packages)
 */
export const getAllShipmentsForTracking = async (req: Request, res: Response) => {
  try {
    const shipments = await storage.getAllShipments();
    
    // Return shipments without packages data for fast loading
    return res.status(200).json(shipments);
  } catch (error) {
    console.error('Error fetching shipments for tracking:', error);
    return res.status(500).json({ message: 'Failed to fetch shipments for tracking' });
  }
};

/**
 * Get pending shipments (admin only)
 */
export const getPendingShipments = async (req: Request, res: Response) => {
  try {
    const shipments = await storage.getPendingShipments();
    
    // Now, for each shipment, fetch the packages data
    const shipmentsWithPackages = await Promise.all(
      shipments.map(async (shipment) => {
        // Fetch the physical packages for this shipment
        const packages = await storage.getShipmentPackages(shipment.id);
        
        // Return the shipment with packages included
        return {
          ...shipment,
          packages: packages
        };
      })
    );
    
    return res.status(200).json(shipmentsWithPackages);
  } catch (error) {
    console.error('Error fetching pending shipments:', error);
    return res.status(500).json({ message: 'Failed to fetch pending shipments' });
  }
};

/**
 * Get a single shipment by ID
 */
export const getShipment = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const shipmentId = parseInt(id);
    const shipment = await storage.getShipment(shipmentId);
    
    if (!shipment) {
      return res.status(404).json({ message: 'Shipment not found' });
    }
    
    // Fetch physical packages associated with this shipment
    const packages = await storage.getShipmentPackages(shipmentId);
    
    // Add the packages to the shipment response
    const responseData = {
      ...shipment,
      packages: packages
    };
    
    return res.status(200).json(responseData);
  } catch (error) {
    console.error('Error fetching shipment:', error);
    return res.status(500).json({ message: 'Failed to fetch shipment' });
  }
};

/**
 * Edit a shipment
 */
export const editShipment = async (req: Request, res: Response) => {
  let updatedShipment; // Declare at function scope to avoid scope issues
  
  // Declare balance adjustment variables at function scope
  let balanceAdjustmentMade = false;
  let balanceAdjustmentAmount = 0;
  let reasonText = '';
  
  try {
    const { id } = req.params;
    const shipmentData = { ...req.body };
    const shipmentId = parseInt(id);
    
    console.log(`EDIT SHIPMENT REQUEST for ID ${id} - Method: ${req.method}, URL: ${req.originalUrl}`);
    console.log("EDIT SHIPMENT REQUEST - Raw Request Body:", JSON.stringify(req.body, null, 2));
    console.log("EDIT SHIPMENT REQUEST - Processed Data:", JSON.stringify(shipmentData, null, 2));
    
    // Get the existing shipment to check if status is being changed to APPROVED
    const existingShipment = await storage.getShipment(shipmentId);
    console.log("EDIT SHIPMENT - Existing shipment data:", existingShipment ? JSON.stringify(existingShipment, null, 2) : 'Not found');
    if (!existingShipment) {
      return res.status(404).json({ message: 'Shipment not found' });
    }
    
    console.log("EDIT SHIPMENT - Existing Shipment Details:", existingShipment);
    
    // Check if this is a status change to APPROVED
    const isChangingToApproved = 
      shipmentData.status === ShipmentStatus.APPROVED && 
      existingShipment.status !== ShipmentStatus.APPROVED;
    
    // Create a clean copy of the data that will only include fields from the shipments table
    const cleanedData: any = {};
    
    // Special handling for price recalculation requests
    // Handle both explicit price update flag and price-related fields detection
    if ((req.method === 'PATCH' || req.method === 'PUT') && 
        (shipmentData.__priceUpdate === true || 
        (shipmentData.basePrice !== undefined || 
         shipmentData.originalBasePrice !== undefined || 
         shipmentData.totalPrice !== undefined || 
         shipmentData.originalTotalPrice !== undefined))) {
      
      console.log('PRICE RECALCULATION detected - directly transferring price fields');
      
      // For price recalculation, directly transfer all price-related fields with forced type conversion
      // This ensures values are properly stored as numbers
      if (shipmentData.basePrice !== undefined) {
        const basePrice = Number(shipmentData.basePrice);
        if (!isNaN(basePrice)) {
          cleanedData.basePrice = basePrice;
          console.log(`Processing basePrice: ${shipmentData.basePrice} → ${basePrice}`);
        }
      }
      
      if (shipmentData.fuelCharge !== undefined) {
        const fuelCharge = Number(shipmentData.fuelCharge);
        if (!isNaN(fuelCharge)) {
          cleanedData.fuelCharge = fuelCharge;
          console.log(`Processing fuelCharge: ${shipmentData.fuelCharge} → ${fuelCharge}`);
        }
      }
      
      if (shipmentData.totalPrice !== undefined) {
        const totalPrice = Number(shipmentData.totalPrice);
        if (!isNaN(totalPrice)) {
          cleanedData.totalPrice = totalPrice;
          console.log(`Processing totalPrice: ${shipmentData.totalPrice} → ${totalPrice}`);
        }
      }
      
      if (shipmentData.originalBasePrice !== undefined) {
        const originalBasePrice = Number(shipmentData.originalBasePrice);
        if (!isNaN(originalBasePrice)) {
          cleanedData.originalBasePrice = originalBasePrice;
          console.log(`Processing originalBasePrice: ${shipmentData.originalBasePrice} → ${originalBasePrice}`);
        }
      }
      
      if (shipmentData.originalFuelCharge !== undefined) {
        const originalFuelCharge = Number(shipmentData.originalFuelCharge);
        if (!isNaN(originalFuelCharge)) {
          cleanedData.originalFuelCharge = originalFuelCharge;
          console.log(`Processing originalFuelCharge: ${shipmentData.originalFuelCharge} → ${originalFuelCharge}`);
        }
      }
      
      if (shipmentData.originalTotalPrice !== undefined) {
        const originalTotalPrice = Number(shipmentData.originalTotalPrice);
        if (!isNaN(originalTotalPrice)) {
          cleanedData.originalTotalPrice = originalTotalPrice;
          console.log(`Processing originalTotalPrice: ${shipmentData.originalTotalPrice} → ${originalTotalPrice}`);
        }
      }
      
      if (shipmentData.appliedMultiplier !== undefined) {
        const appliedMultiplier = Number(shipmentData.appliedMultiplier);
        if (!isNaN(appliedMultiplier)) {
          cleanedData.appliedMultiplier = appliedMultiplier;
          console.log(`Processing appliedMultiplier: ${shipmentData.appliedMultiplier} → ${appliedMultiplier}`);
        }
      }
      
      if (shipmentData.packageWeight !== undefined) {
        const packageWeight = Number(shipmentData.packageWeight);
        if (!isNaN(packageWeight)) {
          cleanedData.packageWeight = packageWeight;
          console.log(`Processing packageWeight: ${shipmentData.packageWeight} → ${packageWeight}`);
        }
      }
      
      // Skip further field processing for price-only updates if flag is set
      if (shipmentData.__priceUpdate === true) {
        console.log('PRICE RECALCULATION - Price data calculated (NOT SAVING TO DATABASE):', {
          basePrice: cleanedData.basePrice,
          fuelCharge: cleanedData.fuelCharge,
          totalPrice: cleanedData.totalPrice,
          originalBasePrice: cleanedData.originalBasePrice,
          originalFuelCharge: cleanedData.originalFuelCharge,
          originalTotalPrice: cleanedData.originalTotalPrice,
          appliedMultiplier: cleanedData.appliedMultiplier,
          packageWeight: cleanedData.packageWeight
        });
        
        // For price recalculations, return the calculated prices WITHOUT saving to database
        console.log(`PRICE RECALCULATION - Returning calculated prices to frontend (NOT SAVING)`);
        
        try {
          // Get existing shipment to return complete data
          const existingShipment = await storage.getShipment(shipmentId);
          
          if (!existingShipment) {
            return res.status(404).json({ message: 'Shipment not found' });
          }
          
          // Return the calculated prices WITHOUT saving to database
          const responseData = {
            ...existingShipment,
            // Include the calculated prices (temporary, not saved)
            basePrice: cleanedData.basePrice,
            fuelCharge: cleanedData.fuelCharge,
            totalPrice: cleanedData.totalPrice,
            originalBasePrice: cleanedData.originalBasePrice,
            originalFuelCharge: cleanedData.originalFuelCharge,
            originalTotalPrice: cleanedData.originalTotalPrice,
            appliedMultiplier: cleanedData.appliedMultiplier,
            packageWeight: cleanedData.packageWeight,
            // Mark this as a temporary calculation
            __temporaryCalculation: true
          };
          
          console.log(`PRICE RECALCULATION - Returning temporary calculation (prices NOT saved to database)`);
          return res.status(200).json(responseData);
        } catch (error) {
          console.error("PRICE RECALCULATION - Error:", error);
          return res.status(500).json({ message: 'Failed to calculate prices' });
        }
      }
      
      // Regular update processing for non-price-recalculation operations
      console.log('Processing combined update with price and non-price fields');
      
      // Transfer fields we know are valid for the shipment table
      if (shipmentData.senderName) cleanedData.senderName = shipmentData.senderName;
      if (shipmentData.senderAddress) cleanedData.senderAddress = shipmentData.senderAddress;
      
      // Include structured address fields for ShipEntegra compatibility
      if (shipmentData.senderAddress1) cleanedData.senderAddress1 = shipmentData.senderAddress1;
      if (shipmentData.senderAddress2) cleanedData.senderAddress2 = shipmentData.senderAddress2;
      
      if (shipmentData.senderCity) cleanedData.senderCity = shipmentData.senderCity;
      if (shipmentData.senderPostalCode) cleanedData.senderPostalCode = shipmentData.senderPostalCode;
      if (shipmentData.senderPhone) cleanedData.senderPhone = shipmentData.senderPhone;
      if (shipmentData.senderEmail) cleanedData.senderEmail = shipmentData.senderEmail;
      
      if (shipmentData.receiverName) cleanedData.receiverName = shipmentData.receiverName;
      if (shipmentData.receiverAddress) cleanedData.receiverAddress = shipmentData.receiverAddress;
      if (shipmentData.receiverAddress2) cleanedData.receiverAddress2 = shipmentData.receiverAddress2;
      if (shipmentData.receiverCity) cleanedData.receiverCity = shipmentData.receiverCity;
      if (shipmentData.receiverPostalCode) cleanedData.receiverPostalCode = shipmentData.receiverPostalCode;
      if (shipmentData.receiverCountry) cleanedData.receiverCountry = shipmentData.receiverCountry;
      if (shipmentData.receiverPhone) cleanedData.receiverPhone = shipmentData.receiverPhone;
      if (shipmentData.receiverEmail) cleanedData.receiverEmail = shipmentData.receiverEmail;
      if (shipmentData.receiverState) cleanedData.receiverState = shipmentData.receiverState;
      
      // Handle package dimensions and always convert to numbers
      if (shipmentData.packageLength !== undefined) {
        const length = Number(shipmentData.packageLength);
        cleanedData.packageLength = !isNaN(length) ? Math.round(length) : existingShipment.packageLength;
      }
      
      if (shipmentData.packageWidth !== undefined) {
        const width = Number(shipmentData.packageWidth);
        cleanedData.packageWidth = !isNaN(width) ? Math.round(width) : existingShipment.packageWidth;
      }
      
      if (shipmentData.packageHeight !== undefined) {
        const height = Number(shipmentData.packageHeight);
        cleanedData.packageHeight = !isNaN(height) ? Math.round(height) : existingShipment.packageHeight;
      }
      
      if (shipmentData.packageWeight !== undefined) {
        const weight = Number(shipmentData.packageWeight);
        cleanedData.packageWeight = !isNaN(weight) ? weight : existingShipment.packageWeight;
      }
      
      // Handle other properties that should be part of the shipment
      if (shipmentData.packageContents) cleanedData.packageContents = shipmentData.packageContents;
      if (shipmentData.serviceLevel) cleanedData.serviceLevel = shipmentData.serviceLevel;
      
      // Service-related fields for admin updates
      if (shipmentData.selectedService) cleanedData.selectedService = shipmentData.selectedService;
      if (shipmentData.shippingProvider) cleanedData.shippingProvider = shipmentData.shippingProvider;
      if (shipmentData.providerServiceCode) cleanedData.providerServiceCode = shipmentData.providerServiceCode;
      if (shipmentData.carrierName) cleanedData.carrierName = shipmentData.carrierName;
      
      if (shipmentData.description) cleanedData.description = shipmentData.description;
      if (shipmentData.status) cleanedData.status = shipmentData.status;
      if (shipmentData.statusDate) cleanedData.statusDate = shipmentData.statusDate;
      if (shipmentData.trackingNumber) cleanedData.trackingNumber = shipmentData.trackingNumber;
      if (shipmentData.labelUrl) cleanedData.labelUrl = shipmentData.labelUrl;
      if (shipmentData.basePrice) cleanedData.basePrice = Number(shipmentData.basePrice);
      if (shipmentData.fuelCharge) cleanedData.fuelCharge = Number(shipmentData.fuelCharge);
      if (shipmentData.totalPrice) cleanedData.totalPrice = Number(shipmentData.totalPrice);
      if (shipmentData.rejectionReason) cleanedData.rejectionReason = shipmentData.rejectionReason;
      
      // Add support for customs and GTIP fields with detailed logging
      console.log("EDIT SHIPMENT - GTIP Field Check:", {
        shipmentDataGtip: shipmentData.gtip,
        shipmentDataGtipType: typeof shipmentData.gtip,
        isDefined: shipmentData.gtip !== undefined,
        isNull: shipmentData.gtip === null,
        isEmpty: shipmentData.gtip === "",
        existingGtip: existingShipment.gtip
      });
      
      // More reliable GTIP handling - prioritizes the new value even if it's empty
      // as long as it's explicitly provided in the request
      if (shipmentData.hasOwnProperty('gtip')) {
        const gtipValue = shipmentData.gtip === null ? '' : String(shipmentData.gtip || '');
        console.log(`EDIT SHIPMENT - Explicitly setting GTIP value to: "${gtipValue}"`);
        cleanedData.gtip = gtipValue;
      } else if (existingShipment.gtip) {
        // Only preserve existing GTIP if no value was provided in the request
        console.log(`EDIT SHIPMENT - Preserving existing GTIP value: "${existingShipment.gtip}"`);
        cleanedData.gtip = existingShipment.gtip;
      }
      
      // Customs value as cents (stored as integer)
      if (shipmentData.customsValue !== undefined) {
        console.log(`EDIT SHIPMENT - Setting customsValue to: ${shipmentData.customsValue}`);
        cleanedData.customsValue = Number(shipmentData.customsValue);
      } else if (existingShipment.customsValue) {
        // Preserve existing customs value
        console.log(`EDIT SHIPMENT - Preserving existing customsValue: ${existingShipment.customsValue}`);
        cleanedData.customsValue = existingShipment.customsValue;
      }
      
      // Number of items for customs declaration
      if (shipmentData.customsItemCount !== undefined) {
        console.log(`EDIT SHIPMENT - Setting customsItemCount to: ${shipmentData.customsItemCount}`);
        cleanedData.customsItemCount = Number(shipmentData.customsItemCount);
      } else if (existingShipment.customsItemCount) {
        // Preserve existing item count
        console.log(`EDIT SHIPMENT - Preserving existing customsItemCount: ${existingShipment.customsItemCount}`);
        cleanedData.customsItemCount = existingShipment.customsItemCount;
      }
      
      // IOSS number for EU shipments
      if (shipmentData.hasOwnProperty('iossNumber')) {
        const iossValue = shipmentData.iossNumber === null ? '' : String(shipmentData.iossNumber || '');
        console.log(`EDIT SHIPMENT - Explicitly setting IOSS number to: "${iossValue}"`);
        cleanedData.iossNumber = iossValue;
      } else if (existingShipment.iossNumber) {
        // Only preserve existing IOSS number if no value was provided in the request
        console.log(`EDIT SHIPMENT - Preserving existing IOSS number: "${existingShipment.iossNumber}"`);
        cleanedData.iossNumber = existingShipment.iossNumber;
      }
      
      // Insurance details - CRITICAL FIX for insurance field mapping
      console.log("EDIT SHIPMENT - Insurance Field Processing:", {
        isInsured: shipmentData.isInsured,
        insuranceValue: shipmentData.insuranceValue,
        insuranceCost: shipmentData.insuranceCost,
        existingIsInsured: existingShipment.isInsured,
        existingInsuranceValue: existingShipment.insuranceValue,
        existingInsuranceCost: existingShipment.insuranceCost
      });
      
      if (shipmentData.hasOwnProperty('isInsured')) {
        const isInsuredValue = Boolean(shipmentData.isInsured);
        console.log(`EDIT SHIPMENT - Setting isInsured to: ${isInsuredValue}`);
        cleanedData.isInsured = isInsuredValue;
      } else if (existingShipment.isInsured !== undefined) {
        // Preserve existing insurance status if no value was provided
        console.log(`EDIT SHIPMENT - Preserving existing isInsured: ${existingShipment.isInsured}`);
        cleanedData.isInsured = existingShipment.isInsured;
      }
      
      if (shipmentData.hasOwnProperty('insuranceValue')) {
        const insuranceValueNum = Number(shipmentData.insuranceValue);
        const finalInsuranceValue = !isNaN(insuranceValueNum) ? insuranceValueNum : 0;
        console.log(`EDIT SHIPMENT - Setting insuranceValue to: ${finalInsuranceValue}`);
        cleanedData.insuranceValue = finalInsuranceValue;
      } else if (existingShipment.insuranceValue !== undefined) {
        // Preserve existing insurance value if no value was provided
        console.log(`EDIT SHIPMENT - Preserving existing insuranceValue: ${existingShipment.insuranceValue}`);
        cleanedData.insuranceValue = existingShipment.insuranceValue;
      }
      
      if (shipmentData.hasOwnProperty('insuranceCost')) {
        const insuranceCostNum = Number(shipmentData.insuranceCost);
        const finalInsuranceCost = !isNaN(insuranceCostNum) ? insuranceCostNum : 0;
        console.log(`EDIT SHIPMENT - Setting insuranceCost to: ${finalInsuranceCost}`);
        cleanedData.insuranceCost = finalInsuranceCost;
      } else if (existingShipment.insuranceCost !== undefined) {
        // Preserve existing insurance cost if no value was provided
        console.log(`EDIT SHIPMENT - Preserving existing insuranceCost: ${existingShipment.insuranceCost}`);
        cleanedData.insuranceCost = existingShipment.insuranceCost;
      }
      
      if (shipmentData.currency) {
        cleanedData.currency = shipmentData.currency;
      } else if (existingShipment.currency) {
        // Always preserve currency
        cleanedData.currency = existingShipment.currency;
      }
      
      console.log("EDIT SHIPMENT - Cleaned data for database:", cleanedData);
      
      // Use the cleaned data for the update
      const finalShipmentData = cleanedData;
      
      // If changing to APPROVED status, generate tracking number
      if (isChangingToApproved) {
        // Generate a tracking number if it doesn't already exist
        if (!finalShipmentData.trackingNumber) {
          finalShipmentData.trackingNumber = generateTrackingNumber(shipmentId);
        }
        
        // Generate a label URL if it doesn't already exist
        if (!finalShipmentData.labelUrl) {
          finalShipmentData.labelUrl = `https://moogship.com/labels/${finalShipmentData.trackingNumber}.pdf`;
        }
      }
      
      console.log("EDIT SHIPMENT - About to update with data:", JSON.stringify(finalShipmentData, null, 2));
      
      console.log(`🚀 EDIT SHIPMENT - Calling storage.updateShipment with ID: ${shipmentId}`);
      console.log(`🚀 EDIT SHIPMENT - Final shipment data:`, JSON.stringify(finalShipmentData, null, 2));
      
      try {
        updatedShipment = await storage.updateShipment(shipmentId, finalShipmentData);
        console.log(`✅ EDIT SHIPMENT - storage.updateShipment completed without throwing`);
        
        if (updatedShipment) {
          console.log("✅ EDIT SHIPMENT - Database updated successfully, returned shipment:", JSON.stringify(updatedShipment, null, 2));
        } else {
          console.error("❌ EDIT SHIPMENT - Database update returned null/undefined shipment");
        }
        
        // Execute a direct database query to verify the update took place including customs fields
        try {
          // Import the pool directly here to avoid dependency issues
          const poolConn = (await import('../db')).pool;
          const result = await poolConn.query(`
            SELECT 
              id, 
              sender_name, 
              receiver_name, 
              gtip, 
              customs_value, 
              customs_item_count,
              ioss_number,
              updated_at 
            FROM shipments 
            WHERE id = $1
          `, [shipmentId]);
          console.log(`EDIT SHIPMENT - Verification query result (including customs fields):`, JSON.stringify(result.rows, null, 2));
        } catch (verifyErr) {
          console.error("EDIT SHIPMENT - Verification query failed:", verifyErr);
        }
      } catch (updateError) {
        console.error("EDIT SHIPMENT - Error during update operation:", updateError);
        throw updateError;
      }
      
      if (!updatedShipment) {
        return res.status(404).json({ message: 'Shipment not found' });
      }
      
      // CHECK FOR BALANCE ADJUSTMENT: Price change on approved shipments ONLY
      // CRITICAL: Pending shipments should NEVER affect user balance
      // Balance is only deducted when shipment is first approved
      // After approval, price changes should adjust the balance accordingly
      const isPendingShipment = existingShipment.status === 'pending';
      const isApprovedShipment = existingShipment.status === 'approved' ||
                                 existingShipment.status === 'pre_transit' ||
                                 existingShipment.status === 'in_transit' ||
                                 existingShipment.status === 'delivered';

      // Only perform balance adjustment if this is a complete shipment update (not just price calculation)
      // Check if this is a price-only update (recalculation) vs full shipment update
      const isPriceOnlyUpdate = finalShipmentData.__priceUpdate === true;

      // CRITICAL LOG: Track pending shipment balance protection
      if (isPendingShipment) {
        console.log(`🛡️ PENDING SHIPMENT PROTECTION: Shipment #${shipmentId} is PENDING - NO balance adjustment will be made regardless of price changes`);
      }
      
      console.log(`💰 BALANCE ADJUSTMENT LOGIC CHECK:`, {
        shipmentId,
        status: existingShipment.status,
        isPendingShipment,
        isApprovedShipment,
        isPriceOnlyUpdate,
        hasTotalPrice: finalShipmentData.totalPrice !== undefined,
        priceChanged: existingShipment.totalPrice !== finalShipmentData.totalPrice,
        oldPrice: existingShipment.totalPrice,
        newPrice: finalShipmentData.totalPrice,
        willAdjustBalance: !isPendingShipment && isApprovedShipment && finalShipmentData.totalPrice !== undefined && existingShipment.totalPrice !== finalShipmentData.totalPrice && !isPriceOnlyUpdate
      });

      // CRITICAL: Only adjust balance for NON-PENDING shipments that are already approved
      // Pending shipments should NEVER trigger balance adjustments
      if (!isPendingShipment && isApprovedShipment && finalShipmentData.totalPrice !== undefined && existingShipment.totalPrice !== finalShipmentData.totalPrice && !isPriceOnlyUpdate) {
        const oldTotalPrice = existingShipment.totalPrice || 0;
        const newTotalPrice = finalShipmentData.totalPrice;
        const priceDifference = newTotalPrice - oldTotalPrice;
        
        console.log(`💰 EDIT SHIPMENT - BALANCE ADJUSTMENT CHECK:`, {
          shipmentId,
          status: existingShipment.status,
          oldPrice: oldTotalPrice,
          newPrice: newTotalPrice,
          difference: priceDifference,
        userId: existingShipment.userId
      });
      
      // Only adjust balance if there's a meaningful price difference (>1 cent)
      if (Math.abs(priceDifference) > 1) {
        try {
          // Update user balance: negative for price increase (charge more), positive for price decrease (refund)
          const updatedUser = await storage.updateUserBalance(existingShipment.userId, -priceDifference);
          
          if (updatedUser) {
            balanceAdjustmentMade = true;
            balanceAdjustmentAmount = -priceDifference;
            
            // Create a detailed transaction record for the balance adjustment
            let reasonDetails = [];
            
            // Check what changed to determine the reason
            if (finalShipmentData.packageWeight !== undefined && finalShipmentData.packageWeight !== existingShipment.packageWeight) {
              reasonDetails.push(`weight changed from ${existingShipment.packageWeight}kg to ${finalShipmentData.packageWeight}kg`);
            }
            if (finalShipmentData.packageLength !== undefined && finalShipmentData.packageLength !== existingShipment.packageLength) {
              reasonDetails.push(`length changed from ${existingShipment.packageLength}cm to ${finalShipmentData.packageLength}cm`);
            }
            if (finalShipmentData.packageWidth !== undefined && finalShipmentData.packageWidth !== existingShipment.packageWidth) {
              reasonDetails.push(`width changed from ${existingShipment.packageWidth}cm to ${finalShipmentData.packageWidth}cm`);
            }
            if (finalShipmentData.packageHeight !== undefined && finalShipmentData.packageHeight !== existingShipment.packageHeight) {
              reasonDetails.push(`height changed from ${existingShipment.packageHeight}cm to ${finalShipmentData.packageHeight}cm`);
            }
            if (finalShipmentData.selectedService !== undefined && finalShipmentData.selectedService !== existingShipment.selectedService) {
              // Import the service name mapping utility
              const { getServiceDisplayName } = await import('../utils/serviceNameMapping');
              const oldServiceDisplayName = getServiceDisplayName(existingShipment.selectedService || 'Unknown Service');
              const newServiceDisplayName = getServiceDisplayName(finalShipmentData.selectedService || 'Unknown Service');
              reasonDetails.push(`service changed from ${oldServiceDisplayName} to ${newServiceDisplayName}`);
            }
            if (finalShipmentData.receiverCountry !== undefined && finalShipmentData.receiverCountry !== existingShipment.receiverCountry) {
              reasonDetails.push(`destination changed from ${existingShipment.receiverCountry} to ${finalShipmentData.receiverCountry}`);
            }
            
            reasonText = reasonDetails.length > 0 
              ? ` (${reasonDetails.join(', ')})` 
              : ' (admin price adjustment)';
            
            const transactionDescription = priceDifference > 0 
              ? `Additional charge: Shipment #${shipmentId} price increased from $${(oldTotalPrice/100).toFixed(2)} to $${(newTotalPrice/100).toFixed(2)}${reasonText}` 
              : `Refund: Shipment #${shipmentId} price reduced from $${(oldTotalPrice/100).toFixed(2)} to $${(newTotalPrice/100).toFixed(2)}${reasonText}`;
            
            await storage.createTransaction(
              existingShipment.userId,
              -priceDifference,
              transactionDescription,
              shipmentId
            );
            
            console.log(`💳 EDIT SHIPMENT - BALANCE ADJUSTED: User ${existingShipment.userId} balance changed by $${(-priceDifference/100).toFixed(2)}`);
          } else {
            console.error(`❌ EDIT SHIPMENT - BALANCE ADJUSTMENT FAILED: Could not update balance for user ${existingShipment.userId}`);
          }
        } catch (balanceError) {
          console.error('❌ EDIT SHIPMENT - BALANCE ADJUSTMENT ERROR:', balanceError);
          // Continue with shipment update even if balance adjustment fails
        }
      } else {
        console.log(`💰 EDIT SHIPMENT - NO BALANCE ADJUSTMENT: Price difference is negligible (${priceDifference} cents)`);
      }
    }
    
    // Check if status is changing from APPROVED to CANCELLED or REJECTED (refund scenario)
    const isChangingToRefundableStatus = 
      existingShipment.status === 'approved' && 
      (finalShipmentData.status === 'cancelled' || finalShipmentData.status === 'rejected') &&
      updatedShipment;
    
    // Process refund if status changed from approved to cancelled/rejected
    if (isChangingToRefundableStatus && updatedShipment.userId && existingShipment.totalPrice > 0) {
      try {
        console.log(`💰 REFUND PROCESSING: Shipment #${shipmentId} status changed from approved to ${finalShipmentData.status}`);
        
        // Calculate refund amount (shipping + insurance)
        const shippingRefund = existingShipment.totalPrice;
        const insuranceRefund = existingShipment.insuranceCost || 0;
        const totalRefund = shippingRefund + insuranceRefund;
        
        // Update user balance
        const user = await storage.updateUserBalance(updatedShipment.userId, totalRefund);
        
        if (user) {
          // Create refund transaction for shipping cost
          if (shippingRefund > 0) {
            await storage.createTransaction(
              updatedShipment.userId,
              shippingRefund,
              `Refund: Shipment #${shipmentId} ${finalShipmentData.status} - shipping cost refunded`,
              shipmentId
            );
          }
          
          // Create separate refund transaction for insurance if applicable
          if (insuranceRefund > 0) {
            await storage.createTransaction(
              updatedShipment.userId,
              insuranceRefund,
              `Refund: Shipment #${shipmentId} ${finalShipmentData.status} - insurance refunded`,
              shipmentId
            );
          }
          
          console.log(`💰 REFUND PROCESSED: Shipment #${shipmentId} - User ${updatedShipment.userId} refunded $${(totalRefund/100).toFixed(2)} (Shipping: $${(shippingRefund/100).toFixed(2)}, Insurance: $${(insuranceRefund/100).toFixed(2)})`);
          
          // Set flags for response
          balanceAdjustmentMade = true;
          balanceAdjustmentAmount = totalRefund;
          reasonText = ` (shipment ${finalShipmentData.status} - full refund)`;
        }
      } catch (refundError) {
        console.error(`Error processing refund for shipment ${shipmentId}:`, refundError);
        // Continue with status update even if refund fails
      }
    }
    
    // If status is changing to APPROVED, deduct the price from user balance
    if (isChangingToApproved && updatedShipment && updatedShipment.userId && updatedShipment.totalPrice) {
      try {
        console.log("🟡 Starting approval balance deduction process...");
        // Price is already in cents, no need to multiply by 100
        const priceInCents = updatedShipment.totalPrice;
        console.log(`🟡 Deducting ${priceInCents} cents from user ${updatedShipment.userId}`);
        const user = await storage.updateUserBalance(updatedShipment.userId, -priceInCents);
        console.log("🟢 Approval balance deduction completed successfully");
        
        if (user) {
          console.log(`Deducted $${(updatedShipment.totalPrice/100).toFixed(2)} from user ${user.id}'s balance for shipment ${id} (via edit form)`);
          
          // Create a transaction record
          await storage.createTransaction(
            updatedShipment.userId,
            -updatedShipment.totalPrice, 
            `Payment for shipment #${id} to ${updatedShipment.receiverCity}, ${updatedShipment.receiverCountry}`,
            updatedShipment.id
          );
        }
      } catch (balanceError) {
        console.error('Error updating user balance:', balanceError);
        // Continue with approval even if balance update fails
        }
      }
    }
    
    console.log("🟢 EDIT SHIPMENT - Preparing successful response");
    console.log("🟢 Response data:", {
      success: true,
      shipmentId: updatedShipment?.id,
      balanceAdjustmentMade,
      balanceAdjustmentAmount
    });
    
    try {
      const responseData = {
        success: true,
        shipment: updatedShipment,
        balanceAdjustmentMade,
        balanceAdjustmentAmount,
        balanceAdjustmentMessage: balanceAdjustmentMade 
          ? `User balance adjusted by $${(balanceAdjustmentAmount/100).toFixed(2)} due to price change${reasonText || ''}`
          : undefined
      };
      
      console.log("🟢 Sending response...");
      console.log("🟢 Response data:", JSON.stringify(responseData, null, 2));
      return res.status(200).json(responseData);
    } catch (responseError) {
      console.error("🔴 ERROR SENDING RESPONSE:", responseError);
      console.error("🔴 Response error details:", JSON.stringify(responseError, null, 2));
      console.error("🔴 Response error stack:", responseError instanceof Error ? responseError.stack : 'No stack');
      throw responseError;
    }
  } catch (error) {
    console.error('🔴 CRITICAL ERROR in shipment update - Final catch block:', error);
    console.error('🔴 Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    console.error('🔴 Error name:', error instanceof Error ? error.name : 'Unknown');
    console.error('🔴 Error message:', error instanceof Error ? error.message : error);
    console.error('🔴 Error object full:', JSON.stringify(error, null, 2));
    console.error('🔴 This error should be investigated - the update may have partially succeeded');
    console.error('🔴 SHIPMENT UPDATE FINAL CATCH - REQUEST DETAILS:');
    console.error('🔴 Request method:', req.method);
    console.error('🔴 Request URL:', req.url);
    console.error('🔴 Request params:', JSON.stringify(req.params, null, 2));
    console.error('🔴 Request body:', JSON.stringify(req.body, null, 2));
    return res.status(500).json({ message: 'Failed to update shipment' });
  }
};

/**
 * Create a temporary shipment for credit limit checking
 */
export const createTemporaryShipment = async (req: Request, res: Response) => {
  try {
    const user = req.user;
    if (!user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const { totalPrice } = req.body;
    
    if (!totalPrice) {
      return res.status(400).json({ message: 'Missing required field: totalPrice' });
    }
    
    // Create a minimal temporary shipment just for credit checking
    const tempShipment = await storage.createShipment({
      senderName: 'Temporary',
      senderAddress: 'Temporary',
      // Include structured address fields for ShipEntegra compatibility
      senderAddress1: 'Temporary',
      senderAddress2: '',
      senderCity: 'Temporary',
      senderPostalCode: 'Temporary',
      senderPhone: 'Temporary',
      senderEmail: 'Temporary@example.com',
      receiverName: 'Temporary',
      receiverAddress: 'Temporary',
      receiverCity: 'Temporary',
      receiverPostalCode: 'Temporary',
      receiverCountry: 'Temporary',
      receiverPhone: 'Temporary',
      receiverEmail: 'Temporary@example.com',
      status: ShipmentStatus.TEMPORARY, // Using the enum value from shared/schema.ts
      packageLength: 1,
      packageWidth: 1,
      packageHeight: 1,
      packageWeight: 1,
      serviceLevel: 'Standard',
      totalPrice: totalPrice
      // No need for isTemporary flag as we use the status field to identify temporary shipments
    }, user.id);
    
    return res.status(200).json(tempShipment);
  } catch (error) {
    console.error('Error creating temporary shipment:', error);
    return res.status(500).json({ message: 'Failed to create temporary shipment' });
  }
};

/**
 * Check if approving a shipment would exceed a user's minimum balance limit
 */
/**
 * Helper function to check if a user would exceed their credit limit
 * For use in both shipment creation and approval workflows
 */
async function checkUserCreditLimit(userId: number, shipmentCost: number) {
  try {
    // Get the user
    const user = await storage.getUser(userId);
    
    if (!user) {
      return {
        success: false,
        message: 'User not found'
      };
    }
    
    // Get the user's new balance after deduction
    const newBalance = user.balance - shipmentCost;
    
    // Get the system minimum balance setting
    let systemMinBalance = null;
    try {
      const systemMinBalanceSetting = await storage.getSystemSetting('MIN_BALANCE');
      if (systemMinBalanceSetting && systemMinBalanceSetting.value) {
        systemMinBalance = parseInt(systemMinBalanceSetting.value, 10);
      }
    } catch (error) {
      console.error('Error getting system minimum balance setting:', error);
    }
    
    // Use user-specific minimum balance if available, otherwise use system default
    const minBalance = user.minimumBalance !== null ? user.minimumBalance : systemMinBalance;
    
    // Check if new balance would be below minimum
    const exceedsLimit = minBalance !== null && newBalance < minBalance;
    
    // Calculate how much the balance would be exceeded
    const exceededAmount = exceedsLimit ? minBalance - newBalance : 0;
    
    return {
      success: true,
      exceedsLimit,
      currentBalance: user.balance,
      shipmentCost,
      newBalance,
      minimumBalance: minBalance,
      exceededAmount,
      user,
      message: exceedsLimit 
        ? `This shipment would exceed your credit limit by $${(exceededAmount / 100).toFixed(2)}`
        : 'Credit limit check passed'
    };
  } catch (error) {
    console.error('Error in credit limit check:', error);
    return {
      success: false,
      message: 'Failed to check credit limit'
    };
  }
}

export const checkCreditLimit = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    // Get the shipment
    const shipment = await storage.getShipment(parseInt(id));
    
    if (!shipment) {
      return res.status(404).json({ message: 'Shipment not found' });
    }
    
    // If shipment doesn't have a price or user, no credit check needed
    if (!shipment.userId || !shipment.totalPrice) {
      return res.status(200).json({ 
        exceeds: false, 
        shipment, 
        message: 'No credit check needed' 
      });
    }
    
    // Use the helper function to check credit limit
    const creditCheck = await checkUserCreditLimit(shipment.userId, shipment.totalPrice);
    
    if (!creditCheck.success) {
      return res.status(400).json({ message: creditCheck.message });
    }
    
    // For backwards compatibility with existing client code
    const exceedsLimit = creditCheck.exceedsLimit;
    const newBalance = creditCheck.newBalance;
    const minBalance = creditCheck.minimumBalance;
    const exceededAmount = creditCheck.exceededAmount;
    const user = creditCheck.user;
    
    return res.status(200).json({
      exceeds: exceedsLimit,
      userBalance: user.balance,
      shipmentPrice: shipment.totalPrice,
      newBalance,
      minBalance,
      exceededAmount,
      // Format amounts for display in UI
      formattedUserBalance: `$${(user.balance / 100).toFixed(2)}`,
      formattedShipmentPrice: `$${(shipment.totalPrice / 100).toFixed(2)}`,
      formattedNewBalance: `$${(newBalance / 100).toFixed(2)}`,
      formattedMinBalance: minBalance !== null ? `$${(minBalance / 100).toFixed(2)}` : 'Not set',
      formattedExceededAmount: `$${(exceededAmount / 100).toFixed(2)}`,
      user: {
        id: user.id,
        username: user.username,
        name: user.name
      },
      shipment: {
        id: shipment.id,
        receiverName: shipment.receiverName,
        receiverCity: shipment.receiverCity,
        receiverCountry: shipment.receiverCountry
      },
      message: exceedsLimit 
        ? `Approving this shipment would exceed the user's credit limit by ${(exceededAmount / 100).toFixed(2)}`
        : 'Approving this shipment will not exceed the credit limit'
    });
  } catch (error) {
    console.error('Error checking credit limit:', error);
    return res.status(500).json({ message: 'Failed to check credit limit' });
  }
};

/**
 * Approve a shipment (admin only)
 */
export const approveShipment = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { labelUrl, bypassCreditCheck } = req.body;
    
    console.log(`Attempting to approve shipment #${id} with label URL: ${labelUrl}, bypass credit check: ${bypassCreditCheck}`);
    
    // Get the shipment to check its status and price
    const shipment = await storage.getShipment(parseInt(id));
    
    if (!shipment) {
      return res.status(404).json({ message: 'Shipment not found' });
    }
    
    // CRITICAL: Check if shipment is already approved to prevent duplicate charges
    if (shipment.status === ShipmentStatus.APPROVED) {
      console.log(`⚠️ DUPLICATE APPROVAL ATTEMPT: Shipment #${id} is already approved, rejecting request`);
      return res.status(409).json({ 
        message: 'Shipment is already approved',
        currentStatus: shipment.status 
      });
    }
    
    // Only allow approval of pending shipments
    if (shipment.status !== ShipmentStatus.PENDING) {
      console.log(`❌ INVALID STATUS: Cannot approve shipment #${id} with status: ${shipment.status}`);
      return res.status(400).json({ 
        message: `Cannot approve shipment with status: ${shipment.status}. Only pending shipments can be approved.`,
        currentStatus: shipment.status 
      });
    }
    
    console.log(`Found shipment #${id}:`, JSON.stringify({
      userId: shipment.userId,
      totalPrice: shipment.totalPrice,
      status: shipment.status
    }));
    
    // If not bypassing credit check and we have a user ID and price, check credit limits
    if (!bypassCreditCheck && shipment.userId && shipment.totalPrice) {
      const user = await storage.getUser(shipment.userId);
      
      if (user) {
        // Get the user's new balance after deduction
        const newBalance = user.balance - shipment.totalPrice;
        
        // Get system minimum balance setting
        let systemMinBalance = null;
        try {
          const systemMinBalanceSetting = await storage.getSystemSetting('MIN_BALANCE');
          if (systemMinBalanceSetting && systemMinBalanceSetting.value) {
            systemMinBalance = parseInt(systemMinBalanceSetting.value, 10);
          }
        } catch (error) {
          console.error('Error getting system minimum balance setting:', error);
        }
        
        // Use user-specific minimum balance if available, otherwise use system default
        const minBalance = user.minimumBalance !== null ? user.minimumBalance : systemMinBalance;
        
        // Check if new balance would be below minimum
        if (minBalance !== null && newBalance < minBalance) {
          return res.status(400).json({ 
            message: `Approving this shipment would exceed the user's credit limit. New balance would be $${(newBalance / 100).toFixed(2)}, below the minimum of $${(minBalance / 100).toFixed(2)}. Set bypassCreditCheck=true to approve anyway.`,
            requiresOverride: true,
            creditDetails: {
              userBalance: user.balance,
              shipmentPrice: shipment.totalPrice,
              newBalance,
              minBalance,
              exceededAmount: minBalance - newBalance,
              formattedUserBalance: `$${(user.balance / 100).toFixed(2)}`,
              formattedNewBalance: `$${(newBalance / 100).toFixed(2)}`,
              formattedMinBalance: `$${(minBalance / 100).toFixed(2)}`
            }
          });
        }
      }
    }
    
    // Generate a tracking number
    const trackingNumber = generateTrackingNumber(parseInt(id));
    
    console.log(`🚀 FAST APPROVAL: Updating shipment #${id} status to approved with tracking: ${trackingNumber}`);
    
    // Update the shipment status to approved
    const updatedShipment = await storage.updateShipmentStatus(
      parseInt(id),
      ShipmentStatus.APPROVED,
      labelUrl,
      trackingNumber
    );
    
    console.log(`✅ FAST APPROVAL: Shipment #${id} successfully updated to approved status`);
    
    if (!updatedShipment) {
      return res.status(404).json({ message: 'Shipment not found' });
    }
    
    // Deduct costs from the user's balance if they have one
    try {
      if (shipment.userId && shipment.totalPrice) {
        // Check if shipment has insurance using the same logic as the form
        const hasInsurance = shipment.isInsured || (shipment.insuranceValue && shipment.insuranceValue > 0);
        
        // Log shipment details before charging
        console.log(`💰 ADMIN APPROVAL - Processing balance deduction for shipment #${id}:`);
        console.log(`  🔑 Triggered by: Admin approval endpoint`);
        console.log(`  👤 Admin user: ${req.user?.username || 'unknown'}`);
        console.log(`  📅 Timestamp: ${new Date().toISOString()}`);
        console.log(`- User ID: ${shipment.userId}`);
        console.log(`- Total Price: ${shipment.totalPrice} cents ($${(shipment.totalPrice/100).toFixed(2)})`);
        console.log(`- Insurance Value: ${shipment.insuranceValue || 0} cents ($${((shipment.insuranceValue || 0)/100).toFixed(2)})`);
        console.log(`- Insurance Cost: ${shipment.insuranceCost || 0} cents ($${((shipment.insuranceCost || 0)/100).toFixed(2)})`);
        console.log(`- Has Insurance: ${hasInsurance}`);
        console.log(`- Status: ${shipment.status} -> ${ShipmentStatus.APPROVED}`);
        
        // Fetch user details before charging
        const userBefore = await storage.getUser(shipment.userId);
        if (userBefore) {
          console.log(`User ${userBefore.id} balance before charge: ${userBefore.balance} cents ($${(userBefore.balance/100).toFixed(2)})`);
        }
        
        // Calculate DDP costs if applicable
        const isDDP = shipment.shippingTerms === 'ddp';
        const ddpDutiesAmount = isDDP ? (shipment.ddpDutiesAmount || 0) : 0;
        const ddpTaxAmount = isDDP ? (shipment.ddpTaxAmount || 0) : 0;
        const ddpProcessingFee = isDDP ? (shipment.ddpProcessingFee || 0) : 0;
        const totalDDPCosts = ddpDutiesAmount + ddpTaxAmount + ddpProcessingFee;
        
        console.log(`- Shipping Terms: ${shipment.shippingTerms || 'dap'}`);
        if (isDDP) {
          console.log(`- DDP Duties: ${ddpDutiesAmount} cents ($${(ddpDutiesAmount/100).toFixed(2)})`);
          console.log(`- DDP Tax: ${ddpTaxAmount} cents ($${(ddpTaxAmount/100).toFixed(2)})`);
          console.log(`- DDP Processing Fee: ${ddpProcessingFee} cents ($${(ddpProcessingFee/100).toFixed(2)})`);
          console.log(`- Total DDP Costs: ${totalDDPCosts} cents ($${(totalDDPCosts/100).toFixed(2)})`);
        }

        if (hasInsurance && shipment.insuranceCost && shipment.insuranceCost > 0) {
          // Separate deductions for shipment with insurance
          console.log(`🔄 SEPARATE DEDUCTIONS: Processing shipping, insurance${isDDP ? ', and DDP costs' : ''} separately`);
          
          // totalPrice = shipping cost only (does NOT include insurance or DDP costs)
          // insuranceCost = insurance cost (separate from shipping)
          // DDP costs = duties + tax + processing fee (for DDP shipments only)
          const shippingCost = shipment.totalPrice;
          const totalChargeAmount = shippingCost + shipment.insuranceCost + totalDDPCosts;
          
          console.log(`- Shipping Cost: ${shippingCost} cents ($${(shippingCost/100).toFixed(2)})`);
          console.log(`- Insurance Cost: ${shipment.insuranceCost} cents ($${(shipment.insuranceCost/100).toFixed(2)})`);
          if (isDDP && totalDDPCosts > 0) {
            console.log(`- DDP Costs: ${totalDDPCosts} cents ($${(totalDDPCosts/100).toFixed(2)})`);
          }
          console.log(`- Total to be charged: ${totalChargeAmount} cents ($${(totalChargeAmount/100).toFixed(2)})`);
          
          // Deduct shipping cost first
          const userAfterShipping = await storage.updateUserBalance(shipment.userId, -shippingCost);
          
          if (userAfterShipping) {
            console.log(`🚢 Deducted shipping cost $${(shippingCost/100).toFixed(2)} from user ${userAfterShipping.id}'s balance`);
            console.log(`Balance after shipping deduction: ${userAfterShipping.balance} cents ($${(userAfterShipping.balance/100).toFixed(2)})`);
            
            // Create transaction record for shipping cost
            const shippingTransaction = await storage.createTransaction(
              shipment.userId,
              -shippingCost,
              `Shipping cost for shipment #${id} to ${shipment.receiverCity}, ${shipment.receiverCountry}`,
              shipment.id
            );
            
            console.log(`Created shipping transaction record ${shippingTransaction.id}`);
            
            // Deduct insurance cost separately
            const userAfterInsurance = await storage.updateUserBalance(shipment.userId, -shipment.insuranceCost);
            
            if (userAfterInsurance) {
              console.log(`🛡️ Deducted insurance cost $${(shipment.insuranceCost/100).toFixed(2)} from user ${userAfterInsurance.id}'s balance`);
              console.log(`Balance after insurance deduction: ${userAfterInsurance.balance} cents ($${(userAfterInsurance.balance/100).toFixed(2)})`);
              
              // Create transaction record for insurance cost
              const insuranceTransaction = await storage.createTransaction(
                shipment.userId,
                -shipment.insuranceCost,
                `Insurance cost for shipment #${id} (declared value: $${((shipment.insuranceValue || 0)/100).toFixed(2)})`,
                shipment.id
              );
              
              console.log(`Created insurance transaction record ${insuranceTransaction.id}`);
              
              // Deduct DDP costs if applicable (separated billing)
              if (isDDP && totalDDPCosts > 0) {
                // Get separated duty amounts from shipment
                const baseDutiesAmount = shipment.ddpBaseDutiesAmount || 0;
                const trumpTariffAmount = shipment.ddpTrumpTariffsAmount || 0;
                const processingFee = ddpProcessingFee;
                
                console.log(`🏛️ DDP CHARGES ON ADMIN APPROVAL - SEPARATED BILLING:`);
                console.log(`   Base Duties: $${(baseDutiesAmount/100).toFixed(2)}`);
                console.log(`   Trump Tariffs (15%): $${(trumpTariffAmount/100).toFixed(2)}`);
                console.log(`   Processing Fee: $${(processingFee/100).toFixed(2)}`);
                console.log(`   Triggered by: ADMIN APPROVAL - NOT during shipment creation`);
                
                let finalUser = null;
                
                // Deduct base customs duties if any
                if (baseDutiesAmount > 0) {
                  console.log(`   💳 CHARGING: Base customs duties $${(baseDutiesAmount/100).toFixed(2)}...`);
                  const userAfterBaseDuties = await storage.updateUserBalance(shipment.userId, -baseDutiesAmount);
                  if (userAfterBaseDuties) {
                    const baseDutiesTransaction = await storage.createTransaction(
                      shipment.userId,
                      -baseDutiesAmount,
                      `Base customs duties for shipment #${id}`,
                      shipment.id
                    );
                    console.log(`   ✅ Base duties charged - Transaction ID: ${baseDutiesTransaction.id}`);
                    finalUser = userAfterBaseDuties;
                  }
                }
                
                // Deduct Trump tariffs if any
                if (trumpTariffAmount > 0) {
                  console.log(`   💳 CHARGING: Trump tariffs (15%) $${(trumpTariffAmount/100).toFixed(2)}...`);
                  const userAfterTrumpTariff = await storage.updateUserBalance(shipment.userId, -trumpTariffAmount);
                  if (userAfterTrumpTariff) {
                    const trumpTariffTransaction = await storage.createTransaction(
                      shipment.userId,
                      -trumpTariffAmount,
                      `Trump tariffs for shipment #${id} (15% additional tariff)`,
                      shipment.id
                    );
                    console.log(`   ✅ Trump tariffs charged - Transaction ID: ${trumpTariffTransaction.id}`);
                    finalUser = userAfterTrumpTariff;
                  }
                }
                
                // Deduct DDP processing fee
                if (processingFee > 0) {
                  const userAfterProcessing = await storage.updateUserBalance(shipment.userId, -processingFee);
                  if (userAfterProcessing) {
                    const processingTransaction = await storage.createTransaction(
                      shipment.userId,
                      -processingFee,
                      `DDP processing fee for shipment #${id}`,
                      shipment.id
                    );
                    console.log(`Created DDP processing transaction ${processingTransaction.id}`);
                    finalUser = userAfterProcessing;
                  }
                }
                
                if (finalUser) {
                  console.log(`Final balance: ${finalUser.balance} cents ($${(finalUser.balance/100).toFixed(2)})`);
                }
                
                console.log(`✅ SEPARATE DEDUCTIONS COMPLETE: Total deducted $${(totalChargeAmount/100).toFixed(2)} (Shipping: $${(shippingCost/100).toFixed(2)} + Insurance: $${(shipment.insuranceCost/100).toFixed(2)} + DDP: $${(totalDDPCosts/100).toFixed(2)})`);
              } else {
                console.log(`✅ SEPARATE DEDUCTIONS COMPLETE: Total deducted $${(totalChargeAmount/100).toFixed(2)} (Shipping: $${(shippingCost/100).toFixed(2)} + Insurance: $${(shipment.insuranceCost/100).toFixed(2)})`);
              }
            } else {
              console.error(`Failed to deduct insurance cost for user ${shipment.userId}`);
            }
          } else {
            console.error(`Failed to deduct shipping cost for user ${shipment.userId}`);
          }
        } else {
          // Single or multiple deductions for shipment without insurance
          console.log(`🔄 ${isDDP && totalDDPCosts > 0 ? 'DUAL DEDUCTION' : 'SINGLE DEDUCTION'}: Processing total cost without insurance${isDDP ? ' + DDP costs' : ''}`);
          
          // Calculate total amount to deduct
          const totalDeductionAmount = shipment.totalPrice + totalDDPCosts;
          
          if (isDDP && totalDDPCosts > 0) {
            // Separate deductions for shipping and DDP costs
            console.log(`- Shipping Cost: ${shipment.totalPrice} cents ($${(shipment.totalPrice/100).toFixed(2)})`);
            console.log(`- DDP Costs: ${totalDDPCosts} cents ($${(totalDDPCosts/100).toFixed(2)})`);
            console.log(`- Total to be charged: ${totalDeductionAmount} cents ($${(totalDeductionAmount/100).toFixed(2)})`);
            
            // Deduct shipping cost first
            const userAfterShipping = await storage.updateUserBalance(shipment.userId, -shipment.totalPrice);
            
            if (userAfterShipping) {
              console.log(`🚢 Deducted shipping cost $${(shipment.totalPrice/100).toFixed(2)} from user ${userAfterShipping.id}'s balance`);
              console.log(`Balance after shipping deduction: ${userAfterShipping.balance} cents ($${(userAfterShipping.balance/100).toFixed(2)})`);
              
              // Create transaction record for shipping cost
              const shippingTransaction = await storage.createTransaction(
                shipment.userId,
                -shipment.totalPrice,
                `Shipping cost for shipment #${id} to ${shipment.receiverCity}, ${shipment.receiverCountry}`,
                shipment.id
              );
              
              console.log(`Created shipping transaction record ${shippingTransaction.id}`);
              
              // Deduct DDP costs separately (separated billing)
              // Get separated duty amounts from shipment
              const baseDutiesAmount = shipment.ddpBaseDutiesAmount || 0;
              const trumpTariffAmount = shipment.ddpTrumpTariffsAmount || 0;
              const processingFee = ddpProcessingFee;
              
              console.log(`🏛️ SEPARATED DDP BILLING: Base=$${(baseDutiesAmount/100).toFixed(2)}, Trump=$${(trumpTariffAmount/100).toFixed(2)}, Processing=$${(processingFee/100).toFixed(2)}`);
              
              let finalUser = null;
              
              // Deduct base customs duties if any
              if (baseDutiesAmount > 0) {
                const userAfterBaseDuties = await storage.updateUserBalance(shipment.userId, -baseDutiesAmount);
                if (userAfterBaseDuties) {
                  const baseDutiesTransaction = await storage.createTransaction(
                    shipment.userId,
                    -baseDutiesAmount,
                    `Base customs duties for shipment #${id}`,
                    shipment.id
                  );
                  console.log(`Created base duties transaction ${baseDutiesTransaction.id}`);
                  finalUser = userAfterBaseDuties;
                }
              }
              
              // Deduct Trump tariffs if any
              if (trumpTariffAmount > 0) {
                const userAfterTrumpTariff = await storage.updateUserBalance(shipment.userId, -trumpTariffAmount);
                if (userAfterTrumpTariff) {
                  const trumpTariffTransaction = await storage.createTransaction(
                    shipment.userId,
                    -trumpTariffAmount,
                    `Trump tariffs for shipment #${id} (15% additional tariff)`,
                    shipment.id
                  );
                  console.log(`Created Trump tariff transaction ${trumpTariffTransaction.id}`);
                  finalUser = userAfterTrumpTariff;
                }
              }
              
              // Deduct DDP processing fee
              if (processingFee > 0) {
                const userAfterProcessing = await storage.updateUserBalance(shipment.userId, -processingFee);
                if (userAfterProcessing) {
                  const processingTransaction = await storage.createTransaction(
                    shipment.userId,
                    -processingFee,
                    `DDP processing fee for shipment #${id}`,
                    shipment.id
                  );
                  console.log(`Created DDP processing transaction ${processingTransaction.id}`);
                  finalUser = userAfterProcessing;
                }
              }
              
              if (finalUser) {
                console.log(`Final balance: ${finalUser.balance} cents ($${(finalUser.balance/100).toFixed(2)})`);
              }
              
              console.log(`✅ DUAL DEDUCTION COMPLETE: Total deducted $${(totalDeductionAmount/100).toFixed(2)} (Shipping: $${(shipment.totalPrice/100).toFixed(2)} + DDP: $${(totalDDPCosts/100).toFixed(2)})`);
            } else {
              console.error(`Failed to deduct shipping cost for user ${shipment.userId}`);
            }
          } else {
            // Single deduction for DAP shipments or DDP shipments without costs
            const user = await storage.updateUserBalance(shipment.userId, -shipment.totalPrice);
            
            if (user) {
              console.log(`🔄 Deducted $${(shipment.totalPrice/100).toFixed(2)} from user ${user.id}'s balance for shipment ${id}`);
              console.log(`New balance: ${user.balance} cents ($${(user.balance/100).toFixed(2)})`);
              
              // Create a single transaction record
              const transaction = await storage.createTransaction(
                shipment.userId,
                -shipment.totalPrice,
                `Payment for shipment #${id} to ${shipment.receiverCity}, ${shipment.receiverCountry}`,
                shipment.id
              );
              
              console.log(`Created transaction record ${transaction.id} for payment`);
            } else {
              console.error(`Failed to update balance for user ${shipment.userId} - user not found or error occurred`);
            }
          }
        }
      } else {
        console.log(`Skipping balance deduction for shipment #${id} - Missing required data:`);
        console.log(`- User ID: ${shipment.userId || 'not set'}`);
        console.log(`- Total Price: ${shipment.totalPrice || 'not set'}`);
      }
    } catch (balanceError) {
      console.error('Error updating user balance:', balanceError);
      // Continue with approval even if balance update fails
    }
    
    // Send approval email to the user (skip during bulk operations)
    const skipEmail = req.body.skipEmail || false;
    
    if (!skipEmail) {
      try {
        // Import the email notification function
        const { sendShipmentApprovalEmail } = await import('../notification-emails');
        
        // Get the user who created the shipment
        if (shipment.userId) {
          const shipmentUser = await storage.getUser(shipment.userId);
          
          if (shipmentUser) {
            // Get the updated shipment to include the tracking number and label URL
            const approvedShipment = await storage.getShipment(parseInt(id));
            
            if (approvedShipment) {
              // Send email in background, don't block the response
              sendShipmentApprovalEmail(approvedShipment, shipmentUser)
                .then(result => {
                  if (result.success) {
                    console.log(`Shipment approval email sent successfully to user ${shipmentUser.email} for shipment ${id}`);
                  } else {
                    console.warn(`Failed to send shipment approval email to user ${shipmentUser.email} for shipment ${id}:`, result.error);
                  }
                })
                .catch(err => {
                  console.error(`Error sending shipment approval email to user ${shipmentUser.email} for shipment ${id}:`, err);
                });
            } else {
              console.warn(`Could not send shipment approval email: Updated shipment ${id} not found`);
            }
          } else {
            console.warn(`Could not send shipment approval email: User ${shipment.userId} not found`);
          }
        } else {
          console.warn(`Could not send shipment approval email: Shipment ${id} has no user ID`);
        }
      } catch (emailError) {
        console.error('Error sending shipment approval email:', emailError);
        // Continue even if email sending fails
      }
    } else {
      console.log(`📧 Skipping individual email for shipment ${id} during bulk operation`);
    }
    
    return res.status(200).json(updatedShipment);
  } catch (error) {
    console.error('Error approving shipment:', error);
    return res.status(500).json({ message: 'Failed to approve shipment' });
  }
};

/**
 * Reject a shipment (admin only)
 */
export const rejectShipment = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    const shipmentId = parseInt(id);
    
    // Get current shipment data before updating to check if refund needed
    const currentShipment = await storage.getShipment(shipmentId);
    
    if (!currentShipment) {
      return res.status(404).json({ message: 'Shipment not found' });
    }
    
    // Check if shipment was approved and needs refund
    const wasApproved = currentShipment.status === "approved";
    const needsRefund = wasApproved && currentShipment.totalPrice > 0;
    
    // Update shipment status to rejected
    const shipment = await storage.updateShipmentStatus(
      shipmentId,
      ShipmentStatus.REJECTED,
      undefined,
      undefined,
      reason
    );
    
    if (!shipment) {
      return res.status(404).json({ message: 'Shipment not found' });
    }
    
    // Process refund if needed
    let refundProcessed = null;
    if (needsRefund) {
      try {
        // Calculate refund amount (shipping + insurance)
        const shippingRefund = currentShipment.totalPrice;
        const insuranceRefund = currentShipment.insuranceCost || 0;
        const totalRefund = shippingRefund + insuranceRefund;
        
        // Update user balance
        const updatedUser = await storage.updateUserBalance(
          currentShipment.userId,
          totalRefund,
        );
        
        if (updatedUser) {
          // Create refund transaction for shipping cost
          if (shippingRefund > 0) {
            await storage.createTransaction(
              currentShipment.userId,
              shippingRefund,
              `Refund: Shipment #${shipmentId} rejected - shipping cost refunded`,
              shipmentId,
            );
          }
          
          // Create separate refund transaction for insurance if applicable
          if (insuranceRefund > 0) {
            await storage.createTransaction(
              currentShipment.userId,
              insuranceRefund,
              `Refund: Shipment #${shipmentId} rejected - insurance refunded`,
              shipmentId,
            );
          }
          
          refundProcessed = {
            shippingRefund: shippingRefund / 100,
            insuranceRefund: insuranceRefund / 100,
            totalRefund: totalRefund / 100,
            userId: currentShipment.userId
          };
          
          console.log(
            `💰 REFUND PROCESSED: Shipment #${shipmentId} rejected - User ${currentShipment.userId} refunded $${(totalRefund / 100).toFixed(2)} (Shipping: $${(shippingRefund / 100).toFixed(2)}, Insurance: $${(insuranceRefund / 100).toFixed(2)})`,
          );
        } else {
          console.error(
            `Failed to refund user ${currentShipment.userId} for shipment ${shipmentId}`,
          );
        }
      } catch (refundError) {
        console.error(
          `Error processing refund for shipment ${shipmentId}:`,
          refundError,
        );
        // Continue with rejection even if refund fails
      }
    }
    
    // Return response with refund information
    const response = { 
      ...shipment,
      refundProcessed
    };
    
    return res.status(200).json(response);
  } catch (error) {
    console.error('Error rejecting shipment:', error);
    return res.status(500).json({ message: 'Failed to reject shipment' });
  }
};

/**
 * Get shipping label for a shipment
 */
export const getShippingLabel = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const labelType = req.query.type?.toString() || 'moogship'; // Default to MoogShip label
    console.log(`🏷️ LABEL: Getting label for shipment ${id}, type: ${labelType}`);
    
    const shipment = await storage.getShipment(parseInt(id));
    
    if (!shipment) {
      console.log(`🏷️ LABEL: Shipment ${id} not found`);
      return res.status(404).json({ message: 'Shipment not found' });
    }
    
    // Handle both snake_case and camelCase field naming conventions
    const selectedService = (shipment as any).selectedService;
    const shippingProvider = (shipment as any).shippingProvider;
    const providerServiceCode = (shipment as any).providerServiceCode;
    
    console.log(`🏷️ LABEL: Shipment ${id} found:`, {
      selected_service: selectedService,
      shipping_provider: shippingProvider,
      provider_service_code: providerServiceCode,
      legacy_selectedService: (shipment as any).selectedService,
      legacy_shippingProvider: (shipment as any).shippingProvider,
      legacy_providerServiceCode: (shipment as any).providerServiceCode,
      labelUrl: shipment.labelUrl,
      labelPdf: !!shipment.labelPdf
    });
    
    // Check if requesting carrier label and if user has permission
    if (labelType === 'carrier') {
      // Get user info to check if they can access carrier labels
      const user = req.user as User;
      const canAccessCarrierLabels = user?.role === 'admin' || user?.canAccessCarrierLabels === true;
      
      if (!canAccessCarrierLabels) {
        return res.status(403).json({ message: 'You do not have permission to access carrier labels' });
      }
      
      if (shipment.carrierLabelPdf) {
        // Serve stored PDF data directly
        const pdfBuffer = Buffer.from(shipment.carrierLabelPdf, 'base64');
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `inline; filename="carrier-label-${id}.pdf"`);
        return res.send(pdfBuffer);
      } else if (shipment.carrierLabelUrl) {
        // Download PDF from URL and serve
        const pdfBase64 = await downloadPdfFromUrl(shipment.carrierLabelUrl);
        
        if (pdfBase64) {
          // Store for future use
          await storage.updateShipment(shipment.id, {
            carrierLabelPdf: pdfBase64
          });
          
          // Serve the PDF
          const pdfBuffer = Buffer.from(pdfBase64, 'base64');
          res.setHeader('Content-Type', 'application/pdf');
          res.setHeader('Content-Disposition', `inline; filename="carrier-label-${id}.pdf"`);
          return res.send(pdfBuffer);
        }
      }
      
      return res.status(404).json({ message: 'Carrier label not found' });
    }
    
    // Handle MoogShip label requests (default)
    if (!shipment.labelUrl && !shipment.labelPdf) {
      // Generate a label if one doesn't exist
      try {
        const labelResult = await generateShippingLabel(shipment);
        const labelUrl = getLabelUrl(labelResult.labelPath);
        
        // Update the shipment with the label URL and PDF data
        await storage.updateShipment(shipment.id, {
          labelUrl: labelUrl,
          labelPdf: labelResult.labelBase64
        });
        
        // Serve the newly generated PDF
        const pdfBuffer = Buffer.from(labelResult.labelBase64, 'base64');
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `inline; filename="label-${id}.pdf"`);
        return res.send(pdfBuffer);
      } catch (labelError) {
        return res.status(500).json({ 
          message: 'Failed to generate MoogShip label',
          error: labelError instanceof Error ? labelError.message : String(labelError)
        });
      }
    }
    
    // Serve existing MoogShip label
    if (shipment.labelPdf) {
      const pdfBuffer = Buffer.from(shipment.labelPdf, 'base64');
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `inline; filename="label-${id}.pdf"`);
      return res.send(pdfBuffer);
    } else if (shipment.labelUrl) {
      const filePath = path.join(process.cwd(), shipment.labelUrl);
      if (fs.existsSync(filePath)) {
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `inline; filename="label-${id}.pdf"`);
        return res.sendFile(filePath);
      }
    }
    
    // If we reach here, we couldn't find a valid PDF to serve
    // Try to generate a new label as a fallback
    console.log(`Label not found for shipment ${id}, attempting to generate new label`);
    try {
      const labelResult = await generateShippingLabel(shipment);
      const labelUrl = getLabelUrl(labelResult.labelPath);
      
      // Update the shipment with the new label URL and PDF data
      await storage.updateShipment(shipment.id, {
        status: shipment.status as ShipmentStatus,
        labelUrl: labelUrl,
        labelPdf: labelResult.labelBase64
      });
      
      // Serve the newly generated PDF file directly
      const filePath = path.join(process.cwd(), labelResult.labelPath);
      if (fs.existsSync(filePath)) {
        console.log(`Successfully generated and serving new label for shipment ${id}`);
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `inline; filename="label-${id}.pdf"`);
        return res.sendFile(filePath);
      }
    } catch (generateError) {
      console.error(`Failed to generate fallback label for shipment ${id}:`, generateError);
    }
    
    // Final fallback: return error message
    return res.status(404).json({ 
      message: 'Label PDF not found or could not be generated',
      labelUrl: shipment.labelUrl || null,
      labelPdf: null,
      labelType: 'moogship',
      trackingNumber: shipment.trackingNumber || 'No tracking number'
    });
  } catch (error) {
    console.error('Error getting shipping label:', error);
    return res.status(500).json({ message: 'Failed to get shipping label' });
  }
};

/**
 * Validate bulk shipments from an uploaded file without creating them
 */
/**
 * Request pickup for a shipment
 */
export const requestPickup = async (req: Request, res: Response) => {
  try {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: 'User not authenticated' });
    }
    
    const shipmentId = parseInt(req.params.id);
    if (isNaN(shipmentId)) {
      return res.status(400).json({ message: 'Invalid shipment ID' });
    }
    
    // Validate request body
    const { pickupDate, pickupNotes } = req.body;
    
    if (!pickupDate) {
      return res.status(400).json({ message: 'Pickup date is required' });
    }
    
    // Validate that the pickup date is not in the past
    const requestedDate = new Date(pickupDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    if (requestedDate < today) {
      return res.status(400).json({ message: 'Pickup date cannot be in the past' });
    }
    
    // Get the shipment
    const shipment = await storage.getShipment(shipmentId);
    if (!shipment) {
      return res.status(404).json({ message: 'Shipment not found' });
    }
    
    // Check if the user owns the shipment
    if (shipment.userId !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'You do not have permission to request pickup for this shipment' });
    }
    
    // Update the shipment with pickup request info
    const updatedShipment = await storage.updateShipment(shipmentId, {
      pickupRequested: true,
      pickupDate: requestedDate,
      pickupStatus: PickupStatus.PENDING,
      pickupNotes: pickupNotes || ''
    });
    
    return res.status(200).json({
      message: 'Pickup requested successfully',
      shipment: updatedShipment
    });
  } catch (error) {
    console.error('Error requesting pickup:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

/**
 * Get all pickup requests (admin only)
 */
export const getPickupRequests = async (req: Request, res: Response) => {
  try {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: 'User not authenticated' });
    }
    
    // Only admin can see all pickup requests
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'You do not have permission to access this resource' });
    }
    
    // Get all pickup requests from the actual pickup_requests table
    const pickupRequests = await storage.getAllPickupRequests();
    
    // For each pickup request, get all associated shipments
    const result = [];
    for (const pickupRequest of pickupRequests) {
      try {
        const { pickupRequest: pr, shipments } = 
          await storage.getPickupRequestWithShipments(pickupRequest.id);
        result.push({
          ...pr,
          shipments
        });
      } catch (err) {
        console.error(`Error getting details for pickup request ${pickupRequest.id}:`, err);
      }
    }
    
    console.log(`Returned ${result.length} pickup requests from database`);
    return res.status(200).json(result);
    
    // Old method that was causing issues:
    // Get all shipments with pickup requests
    // const shipments = await storage.getAllShipments();
    // Filter shipments that either have pickupRequested=true OR have a pickupStatus set
    // const pickupRequests = shipments.filter(shipment => 
    //   shipment.pickupRequested || (shipment.pickupStatus && shipment.pickupStatus !== "")
    // );
    
    // return res.status(200).json(pickupRequests);
  } catch (error) {
    console.error('Error getting pickup requests:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

/**
 * Cancel a shipment (can be done by the user who created it or by an admin)
 */
export const cancelShipment = async (req: Request, res: Response) => {
  try {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: 'User not authenticated' });
    }
    
    const shipmentId = parseInt(req.params.id);
    if (isNaN(shipmentId)) {
      return res.status(400).json({ message: 'Invalid shipment ID' });
    }
    
    // Get the shipment
    const shipment = await storage.getShipment(shipmentId);
    if (!shipment) {
      return res.status(404).json({ message: 'Shipment not found' });
    }
    
    // Check permission - only the owner or admin can cancel
    if (shipment.userId !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'You do not have permission to cancel this shipment' });
    }
    
    // Check if shipment can be cancelled
    if (shipment.status === ShipmentStatus.IN_TRANSIT || shipment.status === ShipmentStatus.DELIVERED) {
      return res.status(400).json({ 
        message: 'Shipment cannot be cancelled because it is already ' + 
                 (shipment.status === ShipmentStatus.IN_TRANSIT ? 'in transit' : 'delivered') 
      });
    }
    
    // If shipment was approved and payment was processed, we should refund the user
    let refundAmount = 0;
    let refundTransaction = null;
    
    if (shipment.status === ShipmentStatus.APPROVED && shipment.totalPrice) {
      refundAmount = shipment.totalPrice;
      
      // Create refund transaction
      refundTransaction = await storage.createTransaction(
        shipment.userId,
        refundAmount, // Positive amount for refund
        `Refund for cancelled shipment #${shipmentId}`
      );
      
      // Update user balance
      await storage.updateUserBalance(shipment.userId, refundAmount);
    }
    
    // Cancel the shipment
    const updatedShipment = await storage.updateShipment(shipmentId, {
      status: ShipmentStatus.CANCELLED
    });
    
    // Return success response with refund details if applicable
    return res.status(200).json({
      message: 'Shipment cancelled successfully',
      shipment: updatedShipment,
      refund: refundAmount > 0 ? {
        amount: refundAmount,
        transaction: refundTransaction
      } : null
    });
    
  } catch (error) {
    console.error('Error cancelling shipment:', error);
    return res.status(500).json({ message: 'Server error' });
  }
};

export const updatePickupStatus = async (req: Request, res: Response) => {
  try {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: 'User not authenticated' });
    }
    
    // Only admin can update pickup status
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'You do not have permission to update pickup status' });
    }
    
    const shipmentId = parseInt(req.params.id);
    if (isNaN(shipmentId)) {
      return res.status(400).json({ message: 'Invalid shipment ID' });
    }
    
    // Validate request body
    const { pickupStatus, pickupNotes, pickupDate } = req.body;
    
    if (!pickupStatus) {
      return res.status(400).json({ message: 'Pickup status is required' });
    }
    
    // Check if status is valid
    if (!Object.values(PickupStatus).includes(pickupStatus)) {
      return res.status(400).json({ message: 'Invalid pickup status' });
    }
    
    // Get the shipment
    const shipment = await storage.getShipment(shipmentId);
    if (!shipment) {
      return res.status(404).json({ message: 'Shipment not found' });
    }
    
    // Build update object
    const updateData: any = {
      pickupStatus,
      pickupRequested: true, // Make sure pickupRequested is set to true
      pickupNotes: pickupNotes || shipment.pickupNotes
    };
    
    // Add pickup date if provided
    if (pickupDate && pickupStatus === PickupStatus.SCHEDULED) {
      // Parse date string to Date object
      const parsedDate = new Date(pickupDate);
      if (isNaN(parsedDate.getTime())) {
        return res.status(400).json({ message: 'Invalid pickup date format' });
      }
      updateData.pickupDate = parsedDate;
      console.log(`Setting pickup date for shipment ${shipmentId} to:`, parsedDate);
    }
    
    // Update the pickup status and date
    const updatedShipment = await storage.updateShipment(shipmentId, updateData);
    
    return res.status(200).json({
      message: 'Pickup status updated successfully',
      shipment: updatedShipment
    });
  } catch (error) {
    console.error('Error updating pickup status:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

/**
 * Request a batch pickup for multiple shipments
 */
export const requestBatchPickup = async (req: Request, res: Response) => {
  try {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: 'User not authenticated' });
    }
    
    // Validate request body
    const { shipmentIds, pickupDate, pickupNotes, pickupAddress, pickupCity, pickupPostalCode } = req.body;
    
    if (!pickupDate) {
      return res.status(400).json({ message: 'Pickup date is required' });
    }
    
    if (!Array.isArray(shipmentIds) || shipmentIds.length === 0) {
      return res.status(400).json({ message: 'At least one shipment ID is required' });
    }
    
    const pickupDateTime = new Date(pickupDate);
    // Check if the date is valid and not in the past
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    if (isNaN(pickupDateTime.getTime()) || pickupDateTime < today) {
      return res.status(400).json({ message: 'Pickup date cannot be in the past' });
    }
    
    const userId = req.user?.id;
    
    // First verify all shipments are valid and accessible by this user
    const errors = [];
    const validShipmentIds = [];
    
    console.log(`Processing ${shipmentIds.length} shipment IDs for pickup: ${shipmentIds.join(', ')}`);
    
    for (const shipmentId of shipmentIds) {
      try {
        // Get the shipment
        const shipment = await storage.getShipment(shipmentId);
        console.log(`Shipment ${shipmentId} lookup result:`, shipment ? 'found' : 'not found');
        
        if (!shipment) {
          errors.push({ id: shipmentId, error: 'Shipment not found' });
          continue;
        }
        
        // Verify ownership or admin privileges
        console.log(`Shipment ${shipmentId} - User ID: ${shipment.userId}, Request User ID: ${userId}, User Role: ${req.user?.role}`);
        if (shipment.userId !== userId && req.user?.role !== 'admin') {
          errors.push({ id: shipmentId, error: 'Not authorized to request pickup for this shipment' });
          continue;
        }
        
        // Check if the shipment already has a pickup requested
        if (shipment.pickupRequested) {
          errors.push({ id: shipmentId, error: 'Shipment already has a pickup request' });
          continue;
        }
        
        // Check if the shipment is in a valid state for pickup
        // Allow pending shipments, but reject if already in rejected status
        if (shipment.status === ShipmentStatus.REJECTED) {
          errors.push({ id: shipmentId, error: 'Cannot request pickup for rejected shipments' });
          continue;
        }
        
        validShipmentIds.push(shipmentId);
      } catch (error) {
        console.error(`Error processing shipment ${shipmentId}:`, error);
        errors.push({ id: shipmentId, error: 'Internal server error' });
      }
    }
    
    // If we have no valid shipments, return early with errors
    if (validShipmentIds.length === 0) {
      return res.status(400).json({
        message: 'No valid shipments found for pickup',
        errors
      });
    }
    
    try {
      console.log(`Attempting to create pickup request for user ${userId} with ${validShipmentIds.length} shipments`);
      
      // Create pickup request in database (this will use user's address if not provided)
      const result = await storage.createPickupRequest(
        userId, 
        pickupDateTime,
        pickupNotes,
        pickupAddress,
        pickupCity,
        pickupPostalCode
      ).catch(error => {
        console.error("Failed to create pickup request:", error);
        throw error;
      });
      
      console.log(`Pickup request created with ID: ${result.pickupRequest.id}`);
      
      // Add shipments to the pickup request
      const addedShipments = await storage.addShipmentsToPickupRequest(
        result.pickupRequest.id,
        validShipmentIds
      ).catch(error => {
        console.error(`Failed to add shipments to pickup request ${result.pickupRequest.id}:`, error);
        throw error;
      });
      
      // Send notification email to administrators
      try {
        // Get user data for the notification
        const user = await storage.getUser(userId);
        
        if (user) {
          // Send email notification
          await sendPickupNotificationEmail({
            id: result.pickupRequest.id,
            userId: userId,
            userName: user.name || user.username,
            pickupDate: pickupDateTime,
            pickupAddress: pickupAddress || user.address,
            pickupCity: pickupCity || user.city,
            pickupPostalCode: pickupPostalCode || user.postalCode,
            pickupNotes: pickupNotes,
            shipmentCount: validShipmentIds.length
          }).then(emailResult => {
            if (emailResult.success) {
              console.log(`Pickup notification emails sent successfully for pickup ID: ${result.pickupRequest.id}`);
            } else {
              console.warn(`Some pickup notification emails failed for pickup ID: ${result.pickupRequest.id}:`, emailResult.error);
            }
          }).catch(emailError => {
            console.error(`Error sending pickup notification emails for pickup ID: ${result.pickupRequest.id}:`, emailError);
          });
        } else {
          console.warn(`Could not find user ${userId} for pickup notification email`);
        }
      } catch (emailError) {
        // Log error but don't fail the pickup creation if email sending fails
        console.error(`Error sending pickup notification emails: ${emailError}`);
      }
      
      return res.status(200).json({
        message: `Pickup requested for ${validShipmentIds.length} shipments`,
        pickupRequest: result.pickupRequest,
        shipments: addedShipments,
        errors: errors.length > 0 ? errors : undefined
      });
    } catch (error) {
      console.error('Error creating pickup request:', error);
      return res.status(500).json({ message: 'Error creating pickup request' });
    }
  } catch (error) {
    console.error('Error requesting batch pickup:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

/**
 * Generate a combined PDF with labels from multiple shipments
 */
export const getBatchLabels = async (req: Request, res: Response) => {
  try {
    const { shipmentIds } = req.body;
    
    if (!shipmentIds || !Array.isArray(shipmentIds) || shipmentIds.length === 0) {
      return res.status(400).json({ message: 'No shipment IDs provided' });
    }
    
    console.log(`Generating combined labels for ${shipmentIds.length} shipments`);
    const shipments = [];
    
    // Fetch all requested shipments and validate access
    for (const id of shipmentIds) {
      const shipment = await storage.getShipment(parseInt(id));
      
      if (!shipment) {
        console.log(`Shipment ${id} not found, skipping`);
        continue; // Skip shipments that don't exist
      }
      
      // Check if user is authorized to access this shipment
      if (!req.user || (req.user.id !== shipment.userId && req.user.role !== 'admin')) {
        console.log(`User not authorized to access shipment ${id}, skipping`);
        continue; // Skip unauthorized shipments
      }
      
      // If shipment doesn't have a label yet, generate one
      if (!shipment.labelUrl) {
        try {
          console.log(`Generating label for shipment ${id}`);
          const labelResult = await generateShippingLabel(shipment);
          const labelUrl = getLabelUrl(labelResult.labelPath);
          await storage.updateShipment(shipment.id, { 
            labelUrl: labelUrl,
            labelPdf: labelResult.labelBase64
          });
          shipment.labelUrl = labelUrl;
        } catch (labelError) {
          console.error(`Error generating label for shipment ${id}:`, labelError);
          continue; // Skip this shipment if label generation fails
        }
      }
      
      shipments.push(shipment);
    }
    
    if (shipments.length === 0) {
      return res.status(404).json({ message: 'No valid shipments found with the provided IDs' });
    }
    
    // Create a combined PDF with all labels
    
    // Debug info about shipments we're trying to print
    console.log(`Attempting to combine ${shipments.length} shipments with IDs: ${shipments.map(s => s.id).join(', ')}`);
    shipments.forEach(s => {
      console.log(`Shipment ${s.id} label URL: ${s.labelUrl}`);
    });
    
    // Make sure uploads directory exists
    const uploadsDir = path.join(process.cwd(), '/uploads');
    const labelsDir = path.join(process.cwd(), '/uploads/labels');
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
      console.log('Created uploads directory');
    }
    if (!fs.existsSync(labelsDir)) {
      fs.mkdirSync(labelsDir, { recursive: true });
      console.log('Created labels directory');
    }
    
    // Create a new PDF document
    const pdfDoc = await PDFDocument.create();
    
    // For each shipment, get its PDF data and copy pages to the combined PDF
    for (const shipment of shipments) {
      try {
        let labelBytes: Uint8Array;
        
        // First try to get PDF from database
        if (shipment.labelPdf) {
          console.log(`Using database PDF data for shipment ${shipment.id}`);
          labelBytes = Buffer.from(shipment.labelPdf, 'base64');
        } 
        // Fallback to file system if no database PDF
        else if (shipment.labelUrl) {
          const labelPath = path.join(process.cwd(), shipment.labelUrl as string);
          console.log(`Reading label from file: ${labelPath}`);
          labelBytes = fs.readFileSync(labelPath);
        } 
        // Skip if no label data available
        else {
          console.error(`No label data available for shipment ${shipment.id}, skipping`);
          continue;
        }
        
        const shipmentPdf = await PDFDocument.load(labelBytes);
        
        // Copy all pages from the shipment PDF to the combined PDF
        const copiedPages = await pdfDoc.copyPages(shipmentPdf, shipmentPdf.getPageIndices());
        copiedPages.forEach(page => pdfDoc.addPage(page));
        console.log(`Added ${copiedPages.length} pages from shipment ${shipment.id}`);
      } catch (err) {
        console.error(`Error processing label for shipment ${shipment.id}:`, err);
        // Continue with other shipments even if one fails
      }
    }
    
    // Save the combined PDF
    const combinedPdfBytes = await pdfDoc.save();
    const timestamp = Date.now();
    const combinedPdfPath = `/uploads/labels/combined-${timestamp}.pdf`;
    const fullPath = path.join(process.cwd(), combinedPdfPath);
    
    // Ensure the directory exists
    const dir = path.dirname(fullPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    
    fs.writeFileSync(fullPath, combinedPdfBytes);
    console.log(`Combined PDF saved to: ${combinedPdfPath}`);
    
    res.json({ labelUrl: combinedPdfPath });
  } catch (error) {
    console.error('Error generating combined labels:', error);
    res.status(500).json({ message: 'Failed to generate combined labels' });
  }
};

/**
 * Send shipments to ShipEntegra
 */
export const sendShipmentsToShipEntegra = async (req: Request, res: Response) => {
  try {
    console.log(`🔥 [ROUTE START] sendShipmentsToShipEntegra function called`);
    // Verify user is an admin
    if (!req.user || req.user.role !== 'admin') {
      console.log(`❌ [AUTH FAIL] User not authorized: ${req.user ? req.user.role : 'no user'}`);
      return res.status(403).json({ success: false, message: 'Not authorized to send shipments to ShipEntegra' });
    }
    console.log(`✅ [AUTH OK] Admin user verified`);
    
    
    const { shipmentIds } = req.body;
    
    // Validate request
    if (!shipmentIds || !Array.isArray(shipmentIds) || shipmentIds.length === 0) {
      return res.status(400).json({ success: false, message: 'No shipment IDs provided' });
    }
    
    console.log(`🚀 [PURCHASE LABEL] Button clicked - received request to send ${shipmentIds.length} shipments to ShipEntegra:`, shipmentIds);
    console.log(`🔍 [PURCHASE LABEL] Starting label purchase workflow...`);
    
    // Fetch the shipments from database
    console.log(`🔍 [PURCHASE LABEL] Fetching shipments from database for IDs: ${shipmentIds}`);
    const shipments = await storage.getShipmentsByIds(shipmentIds);
    
    if (!shipments || shipments.length === 0) {
        return res.status(404).json({ success: false, message: 'No shipments found with the provided IDs' });
    }
    
    // Helper function to generate a tracking number if needed
    const generateTrackingNumber = () => {
      const prefix = "MS"; // Moogship prefix
      const timestamp = Date.now().toString().slice(-8);
      const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
      return `${prefix}${timestamp}${random}`;
    };
    
    // Map the shipments to the format expected by the ShipEntegra service
    const shipmentData = shipments.map(shipment => {
      // Convert serviceLevel string to ServiceLevel enum
      let serviceLevelEnum: ServiceLevel;
      switch (shipment.serviceLevel) {
        case 'standard':
          serviceLevelEnum = ServiceLevel.STANDARD;
          break;
        case 'express':
          serviceLevelEnum = ServiceLevel.EXPRESS;
          break;
        case 'priority':
          serviceLevelEnum = ServiceLevel.PRIORITY;
          break;
        default:
          serviceLevelEnum = ServiceLevel.STANDARD; // Default to standard
      }
      
      // Convert status string to ShipmentStatus enum
      let statusEnum: ShipmentStatus;
      switch (shipment.status) {
        case 'pending':
          statusEnum = ShipmentStatus.PENDING;
          break;
        case 'approved':
          statusEnum = ShipmentStatus.APPROVED;
          break;
        case 'rejected':
          statusEnum = ShipmentStatus.REJECTED;
          break;
        case 'in_transit':
          statusEnum = ShipmentStatus.IN_TRANSIT;
          break;
        case 'delivered':
          statusEnum = ShipmentStatus.DELIVERED;
          break;
        default:
          statusEnum = ShipmentStatus.PENDING; // Default to pending
      }
      
      // Generate tracking number if not exists
      const trackingNumber = shipment.trackingNumber || generateTrackingNumber();
      
      // Get current label attempts from database
      const labelAttempts = shipment.labelAttempts || 0;
      
      // Debug print to verify label attempts are included
      console.log(`Shipment ${shipment.id} has ${labelAttempts} previous label attempts`);
      
      return {
        id: shipment.id,
        trackingNumber: trackingNumber,
        senderName: shipment.senderName,
        senderAddress: shipment.senderAddress || '', // Kept for backward compatibility
        senderAddress1: shipment.senderAddress1 || shipment.senderAddress || '', // Use structured field if available, fallback to legacy
        senderAddress2: shipment.senderAddress2 || '', // Use secondary address field if available
        senderCity: shipment.senderCity || '', // Ensure not null
        senderPostalCode: shipment.senderPostalCode || '', // Ensure not null
        senderEmail: shipment.senderEmail,
        senderPhone: shipment.senderPhone,
        receiverName: shipment.receiverName,
        receiverAddress: shipment.receiverAddress,
        receiverCity: shipment.receiverCity,
        receiverState: (shipment as any).receiverState || '', // Include state information
        receiverCountry: shipment.receiverCountry,
        receiverPostalCode: shipment.receiverPostalCode,
        receiverEmail: (shipment as any).receiverEmail || 'info@moogship.com', // Provide Moogship email as fallback
        receiverPhone: shipment.receiverPhone,
        packageWeight: shipment.packageWeight,
        packageLength: shipment.packageLength,
        packageWidth: shipment.packageWidth,
        packageHeight: shipment.packageHeight,
        packageContents: shipment.packageContents, // Include packageContents for ShipEntegra description
        customsValue: shipment.customsValue || shipment.totalPrice || 5000, // Use customs value or total price, or default to $50
        customsItemCount: shipment.customsItemCount || 1, // Use customs item count or default to 1
        serviceLevel: serviceLevelEnum,
        status: statusEnum,
        labelAttempts: labelAttempts, // Include label attempts for tracking number modification in API
        labelError: shipment.labelError, // Include previous error info for reference
        iossNumber: shipment.iossNumber, // Include IOSS number for EU shipments
        gtip: shipment.gtip, // Include GTIP/HS code for customs declaration
        selectedService: shipment.selectedService || (shipment as any).selected_service, // Include selected service for proper service detection
        providerServiceCode: shipment.providerServiceCode || (shipment as any).provider_service_code || undefined // Include provider service code for exact service matching
      };
    });
    
    console.log(`🔄 [SERVICE ROUTING] Starting service separation for ${shipmentData.length} shipments`);
    
    // Separate AFS, Aramex, and ShipEntegra shipments
    const afsShipments = shipmentData.filter(shipment => {
      const service = shipment.selectedService || shipment.providerServiceCode || '';
      const serviceLower = service.toLowerCase();
      // Check for AFS services: services starting with 'afs-' OR containing 'ecoafs' OR exact 'ecoafs' match OR containing 'gls'
      const isAFSService = service.startsWith('afs-') || 
                          serviceLower.includes('ecoafs') || 
                          serviceLower === 'ecoafs' ||
                          serviceLower.includes('gls');
      console.log(`🔍 [SERVICE ROUTING] Shipment ${shipment.id}: selectedService="${shipment.selectedService}", providerServiceCode="${shipment.providerServiceCode}", final service="${service}", serviceLower="${serviceLower}", isAFS: ${isAFSService}`);
      return isAFSService;
    });
    
    const aramexShipments = shipmentData.filter(shipment => {
      // Use providerServiceCode for routing logic, not selectedService
      const routingService = shipment.providerServiceCode || '';
      const serviceLower = routingService.toLowerCase();
      // Check for Aramex services: services starting with 'aramex-' OR exact 'aramex' match
      const isAramexService = routingService.startsWith('aramex-') || 
                             serviceLower === 'aramex';
      console.log(`🔍 [SERVICE ROUTING] Shipment ${shipment.id}: selectedService="${shipment.selectedService}", providerServiceCode="${shipment.providerServiceCode}", routing="${routingService}", isAramex: ${isAramexService}`);
      return isAramexService;
    });
    
    const shipentegraShipments = shipmentData.filter(shipment => {
      // Use providerServiceCode for routing logic, not selectedService
      const routingService = shipment.providerServiceCode || '';
      const serviceLower = routingService.toLowerCase();
      // Not AFS if service doesn't start with 'afs-' AND doesn't contain 'ecoafs' AND doesn't contain 'gls'
      const isAFSService = routingService.startsWith('afs-') || 
                          serviceLower.includes('ecoafs') || 
                          serviceLower === 'ecoafs' ||
                          serviceLower.includes('gls');
      // Not Aramex if service doesn't start with 'aramex-' AND doesn't equal 'aramex'
      const isAramexService = routingService.startsWith('aramex-') || 
                             serviceLower === 'aramex';
      return !isAFSService && !isAramexService;
    });
    
    console.log(`📊 [SERVICE ROUTING] Service separation complete: ${afsShipments.length} AFS, ${aramexShipments.length} Aramex, ${shipentegraShipments.length} ShipEntegra`);
    
    // Enhanced debugging for each shipment's routing
    shipmentData.forEach(shipment => {
      const routingService = shipment.providerServiceCode || '';
      const serviceLower = routingService.toLowerCase();
      const isAFS = routingService.startsWith('afs-') || serviceLower.includes('ecoafs') || serviceLower === 'ecoafs' || serviceLower.includes('gls');
      const isAramex = routingService.startsWith('aramex-') || serviceLower === 'aramex';
      let routedTo = 'ShipEntegra';
      if (isAFS) routedTo = 'AFS';
      if (isAramex) routedTo = 'Aramex';
      console.log(`📍 [DETAILED ROUTING] Shipment ${shipment.id}: providerServiceCode="${routingService}" → routed to ${routedTo}`);
    });
    
    // Process AFS shipments separately
    let afsResults: any = {
      success: true,
      message: '',
      shipmentIds: [],
      failedShipmentIds: [],
      trackingNumbers: {},
      carrierTrackingNumbers: {},
      labelUrls: {},
      labelPdfs: {},
      carrierLabelUrls: {},
      carrierLabelPdfs: {},
      shipmentErrors: {}
    };
    
    if (afsShipments.length > 0) {
      console.log(`🚛 Processing ${afsShipments.length} AFS Transport shipments...`);
      // Import and use AFS processing function
      const { processAFSShipments } = await import('../services/afstransport');
      afsResults = await processAFSShipments(afsShipments);
    }
    
    // Process Aramex shipments separately
    let aramexResults: any = {
      success: true,
      message: '',
      shipmentIds: [],
      failedShipmentIds: [],
      trackingNumbers: {},
      carrierTrackingNumbers: {},
      labelUrls: {},
      labelPdfs: {},
      carrierLabelUrls: {},
      carrierLabelPdfs: {},
      shipmentErrors: {}
    };
    
    if (aramexShipments.length > 0) {
      console.log(`📮 Processing ${aramexShipments.length} Aramex shipments...`);
      try {
        // Import and use Aramex processing function
        const { processAramexShipments } = await import('../services/aramex');
        console.log(`✅ CONTROLLER: Successfully imported processAramexShipments function`);
        
        aramexResults = await processAramexShipments(aramexShipments);
        console.log(`✅ CONTROLLER: processAramexShipments completed successfully`);
        console.log(`🔍 CONTROLLER RECEIVED FROM ARAMEX: carrierLabelPdfs containing ${Object.keys(aramexResults.carrierLabelPdfs || {}).length} entries`);
        console.log(`🔍 CONTROLLER RECEIVED FROM ARAMEX: carrierTrackingNumbers containing ${Object.keys(aramexResults.carrierTrackingNumbers || {}).length} entries`);
        console.log(`🔍 CONTROLLER RECEIVED FROM ARAMEX: Full aramexResults structure:`, JSON.stringify(aramexResults, null, 2));
      } catch (error) {
        console.error(`❌ CONTROLLER: Error processing Aramex shipments:`, error);
        aramexResults.shipmentErrors = { [aramexShipments[0].id]: `Controller error: ${error.message}` };
      }
    }
    
    // Process ShipEntegra shipments
    let shipentegraResults: any = {
      success: true,
      message: '',
      shipmentIds: [],
      failedShipmentIds: [],
      trackingNumbers: {},
      carrierTrackingNumbers: {},
      labelUrls: {},
      labelPdfs: {},
      carrierLabelUrls: {},
      carrierLabelPdfs: {},
      shipmentErrors: {}
    };
    
    if (shipentegraShipments.length > 0) {
      console.log(`📦 Processing ${shipentegraShipments.length} ShipEntegra shipments...`);
      shipentegraResults = await sendToShipEntegra(shipentegraShipments);
    }
    
    // Debug individual service results before combining
    console.log(`🔍 SERVICE RESULTS DEBUG:`);
    console.log(`AFS Results - carrierLabelPdfs: ${Object.keys(afsResults.carrierLabelPdfs || {}).length} entries`);
    console.log(`Aramex Results - carrierLabelPdfs: ${Object.keys(aramexResults.carrierLabelPdfs || {}).length} entries`);
    console.log(`ShipEntegra Results - carrierLabelPdfs: ${Object.keys(shipentegraResults.carrierLabelPdfs || {}).length} entries`);
    console.log(`🔍 IMPORTANT: Aramex shipments are processed by ShipEntegra service, so Aramex data appears in ShipEntegra results!`);
    
    if (Object.keys(aramexResults.carrierLabelPdfs || {}).length > 0) {
      console.log(`📄 ARAMEX carrierLabelPdfs details:`);
      for (const [id, pdfData] of Object.entries(aramexResults.carrierLabelPdfs || {})) {
        console.log(`  - Shipment ${id}: ${typeof pdfData === 'string' ? pdfData.length : typeof pdfData} characters`);
      }
    }

    // Combine results from all three services
    const result = {
      success: (afsResults.successfulShipmentIds?.length > 0 || aramexResults.shipmentIds?.length > 0 || shipentegraResults.successfulShipmentIds?.length > 0),
      message: 'Shipments processed',
      shipmentIds: [...(afsResults.successfulShipmentIds || []), ...(aramexResults.shipmentIds || []), ...(shipentegraResults.successfulShipmentIds || [])],
      failedShipmentIds: [...(afsResults.failedShipmentIds || []), ...(aramexResults.failedShipmentIds || []), ...(shipentegraResults.failedShipmentIds || [])],
      trackingNumbers: { ...afsResults.trackingNumbers, ...aramexResults.trackingNumbers, ...shipentegraResults.trackingNumbers },
      carrierTrackingNumbers: { ...afsResults.carrierTrackingNumbers, ...aramexResults.carrierTrackingNumbers, ...shipentegraResults.carrierTrackingNumbers },
      labelUrls: { ...afsResults.labelUrls, ...aramexResults.labelUrls, ...shipentegraResults.labelUrls },
      labelPdfs: { ...afsResults.labelPdfs, ...aramexResults.labelPdfs, ...shipentegraResults.labelPdfs },
      carrierLabelUrls: { ...afsResults.carrierLabelUrls, ...aramexResults.carrierLabelUrls, ...shipentegraResults.carrierLabelUrls },
      carrierLabelPdfs: { ...afsResults.carrierLabelPdfs, ...aramexResults.carrierLabelPdfs, ...shipentegraResults.carrierLabelPdfs },
      shipmentErrors: { ...afsResults.shipmentErrors, ...aramexResults.shipmentErrors, ...shipentegraResults.shipmentErrors }
    };
    
    console.log(`🔍 COMBINED RESULT DEBUG:`);
    console.log(`Combined carrierLabelPdfs: ${Object.keys(result.carrierLabelPdfs || {}).length} entries`);
    if (Object.keys(result.carrierLabelPdfs || {}).length > 0) {
      console.log(`📄 Combined carrierLabelPdfs details:`);
      for (const [id, pdfData] of Object.entries(result.carrierLabelPdfs || {})) {
        console.log(`  - Shipment ${id}: ${typeof pdfData === 'string' ? pdfData.length : typeof pdfData} characters`);
      }
    }
    
    // Update the shipments in the database (both successful and failed ones)
    if (result.shipmentIds.length > 0) {
      // Process successful shipments
      await Promise.all(result.shipmentIds.map(async (id) => {
        // Get current shipment to preserve or increment labelAttempts
        // Use getShipment instead of getShipmentById since it's the correct method
        const currentShipment = await storage.getShipment(id);
        const currentAttempts = currentShipment?.labelAttempts || 0;
        // Don't reset the counter after attempts, just increment or keep current value
        const updatedAttempts = currentAttempts > 0 ? currentAttempts + 1 : 1;
          
        console.log(`Shipment ${id} successful - preserving attempt count: ${currentAttempts} → ${updatedAttempts}`);
          
        const updateData: any = {
          sentToShipEntegra: true,
          sentToShipEntegraAt: new Date(),
          labelAttempts: updatedAttempts, // Preserve attempt history, don't reset
          labelError: null,  // Clear any previous errors
          // 🎯 CRITICAL STATUS UPDATE: Change from approved to pre_transit after successful label generation
          status: 'pre_transit'
        };
        
        // 🔧 CARRIER NAME FIX: Set correct carrier name based on service routing
        if (currentShipment) {
          const selectedService = currentShipment.selectedService || currentShipment.providerServiceCode || '';
          
          console.log(`\n🏷️ === CARRIER ASSIGNMENT PROCESS FOR SHIPMENT ${id} ===`);
          console.log(`📋 Selected Service: ${selectedService}`);
          console.log(`📊 Available Results:`, {
            aramex: !!aramexResults.shipmentIds?.includes(id),
            afs: !!afsResults.successfulShipmentIds?.includes(id),
            shipentegra: !!shipentegraResults.successfulShipmentIds?.includes(id)
          });
          
          // Determine correct carrier name based on service routing
          // 🔧 CRITICAL FIX: Check original service name for shipments processed via ShipEntegra
          const isAramexService = selectedService.startsWith('aramex-') || selectedService.toLowerCase() === 'aramex';
          const isAFSService = selectedService.startsWith('afs-') || 
                              selectedService.toLowerCase().includes('ecoafs') || 
                              selectedService.toLowerCase() === 'ecoafs' ||
                              selectedService.toLowerCase().includes('gls');
          
          if (isAramexService && shipentegraResults.successfulShipmentIds?.includes(id)) {
            // Aramex shipments processed via ShipEntegra service
            updateData.carrierName = 'Aramex';
            updateData.shippingProvider = 'aramex';
            console.log(`✅ ARAMEX (via ShipEntegra): Assigned carrier name: ${updateData.carrierName}`);
            console.log(`🔍 ARAMEX: Service "${selectedService}" detected as Aramex, processed via ShipEntegra`);
          } else if (aramexResults.shipmentIds?.includes(id)) {
            // Aramex shipments processed via direct controller (legacy path)
            updateData.carrierName = 'Aramex';
            updateData.shippingProvider = 'aramex';
            console.log(`✅ ARAMEX (direct): Assigned carrier name: ${updateData.carrierName}`);
          } else if (isAFSService && shipentegraResults.successfulShipmentIds?.includes(id)) {
            // AFS shipments processed via ShipEntegra service
            updateData.carrierName = 'AFS Transport';
            updateData.shippingProvider = 'afs';
            console.log(`✅ AFS (via ShipEntegra): Assigned carrier name: ${updateData.carrierName}`);
          } else if (afsResults.successfulShipmentIds?.includes(id)) {
            updateData.carrierName = 'AFS Transport';
            updateData.shippingProvider = 'afs';
            console.log(`✅ AFS: Assigned carrier name: ${updateData.carrierName}`);
          } else if (shipentegraResults.successfulShipmentIds?.includes(id)) {
            console.log(`🔍 SHIPENTEGRA: Starting carrier detection process...`);
            
            // For Shipentegra, detect actual carrier based on tracking number format
            const carrierTrackingNumber = result.carrierTrackingNumbers && result.carrierTrackingNumbers[id];
            
            console.log(`📦 Carrier Tracking Number: ${carrierTrackingNumber || 'NOT FOUND'}`);
            console.log(`📦 Available Carrier Data:`, {
              hasCarrierTrackingNumbers: !!result.carrierTrackingNumbers,
              trackingNumbersKeys: result.carrierTrackingNumbers ? Object.keys(result.carrierTrackingNumbers) : [],
              hasCarrierLabelPdfs: !!result.carrierLabelPdfs,
              labelPdfsKeys: result.carrierLabelPdfs ? Object.keys(result.carrierLabelPdfs) : []
            });
            
            if (carrierTrackingNumber) {
              console.log(`🧪 Testing tracking number patterns for: ${carrierTrackingNumber}`);
              
              // Detect carrier based on tracking number format
              if (/^1Z[A-Z0-9]{16}$/i.test(carrierTrackingNumber)) {
                // UPS format: 1Z + 16 alphanumeric characters
                updateData.carrierName = 'UPS';
                updateData.shippingProvider = 'moogship';
                console.log(`✅ UPS DETECTED: Pattern ^1Z[A-Z0-9]{16}$ matched`);
                console.log(`🔍 Detected UPS carrier from tracking number: ${carrierTrackingNumber}`);
              } else if (/^\d{10,30}$/.test(carrierTrackingNumber) && carrierTrackingNumber.length >= 20) {
                // DHL format: Long numeric (20-30 digits)
                updateData.carrierName = 'DHL';
                updateData.shippingProvider = 'moogship';
                console.log(`✅ DHL DETECTED: Pattern ^\\d{10,30}$ matched with length ${carrierTrackingNumber.length} >= 20`);
                console.log(`🔍 Detected DHL carrier from tracking number: ${carrierTrackingNumber}`);
              } else if (/^\d{12}$/.test(carrierTrackingNumber)) {
                // FedEx format: 12 digit numeric
                updateData.carrierName = 'FedEx';
                updateData.shippingProvider = 'moogship';
                console.log(`✅ FEDEX DETECTED: Pattern ^\\d{12}$ matched`);
                console.log(`🔍 Detected FedEx carrier from tracking number: ${carrierTrackingNumber}`);
              } else {
                // Default to Shipentegra if pattern doesn't match known carriers
                updateData.carrierName = 'Shipentegra';
                updateData.shippingProvider = 'moogship';
                console.log(`❓ NO PATTERN MATCH: Using default Shipentegra carrier`);
                console.log(`🔍 Pattern tests failed for tracking number: ${carrierTrackingNumber}`);
                console.log(`   - UPS test (^1Z[A-Z0-9]{16}$): ${/^1Z[A-Z0-9]{16}$/i.test(carrierTrackingNumber)}`);
                console.log(`   - DHL test (^\\d{10,30}$ && length >= 20): ${/^\d{10,30}$/.test(carrierTrackingNumber) && carrierTrackingNumber.length >= 20}`);
                console.log(`   - FedEx test (^\\d{12}$): ${/^\d{12}$/.test(carrierTrackingNumber)}`);
              }
            } else {
              // No carrier tracking number available, use default
              updateData.carrierName = 'Shipentegra';
              updateData.shippingProvider = 'shipentegra';
              console.log(`❌ NO TRACKING NUMBER: Using default Shipentegra carrier`);
              console.log(`❌ No carrier tracking number found in result data`);
            }
          } else {
            console.log(`❌ NO SERVICE MATCH: Shipment ${id} not found in any successful service results`);
          }
          
          console.log(`🏁 FINAL ASSIGNMENT: Shipment ${id} -> Carrier: ${updateData.carrierName}, Provider: ${updateData.shippingProvider}`);
        }
        
        // If tracking numbers and label URLs are provided, update those too
        if (result.trackingNumbers && result.trackingNumbers[id]) {
          updateData.trackingNumber = result.trackingNumbers[id];
          console.log(`Updating tracking number for shipment ${id} to ${result.trackingNumbers[id]}`);
        }
        
        if (result.carrierTrackingNumbers && result.carrierTrackingNumbers[id]) {
          updateData.carrierTrackingNumber = result.carrierTrackingNumbers[id];
          console.log(`💾 DATABASE: Updating carrier tracking number for shipment ${id} to ${result.carrierTrackingNumbers[id]}`);
        } else {
          console.log(`❌ DATABASE: No carrier tracking number to update for shipment ${id}`);
          console.log(`🔍 Available carrier tracking IDs: ${result.carrierTrackingNumbers ? Object.keys(result.carrierTrackingNumbers) : 'NONE'}`);
        }
        
        // Only update MoogShip labels if they are provided (otherwise keep the existing ones)
        if (result.labelUrls && result.labelUrls[id]) {
          updateData.labelUrl = result.labelUrls[id];
          console.log(`Updating MoogShip label URL for shipment ${id} to ${result.labelUrls[id]}`);
        }
        
        // Store the MoogShip PDF data if available
        if (result.labelPdfs && result.labelPdfs[id]) {
          updateData.labelPdf = result.labelPdfs[id];
          console.log(`Storing MoogShip PDF data for shipment ${id}`);
        }
        
        // Store carrier label URL separately
        if (result.carrierLabelUrls && result.carrierLabelUrls[id]) {
          updateData.carrierLabelUrl = result.carrierLabelUrls[id];
          console.log(`💾 DATABASE: Updating carrier label URL for shipment ${id} to ${result.carrierLabelUrls[id]}`);
        } else {
          console.log(`❌ DATABASE: No carrier label URL to update for shipment ${id}`);
        }
        
        // Store carrier PDF data separately
        if (result.carrierLabelPdfs && result.carrierLabelPdfs[id]) {
          updateData.carrierLabelPdf = result.carrierLabelPdfs[id];
          console.log(`📄 [CONTROLLER PDF] Storing carrier PDF data for shipment ${id}, size: ${result.carrierLabelPdfs[id].length} characters`);
          console.log(`📄 [CONTROLLER PDF] PDF preview: ${result.carrierLabelPdfs[id].substring(0, 50)}...`);
        } else {
          console.log(`❌ [CONTROLLER PDF] No carrier PDF data found for shipment ${id}`);
          console.log(`🔍 [CONTROLLER PDF] result.carrierLabelPdfs exists: ${!!result.carrierLabelPdfs}`);
          if (result.carrierLabelPdfs) {
            console.log(`🔍 [CONTROLLER PDF] Available IDs in carrierLabelPdfs: ${Object.keys(result.carrierLabelPdfs)}`);
            console.log(`🔍 [CONTROLLER PDF] carrierLabelPdfs content:`, JSON.stringify(result.carrierLabelPdfs, null, 2));
          }
          
          // If we have a carrier label URL but no PDF data, download the PDF
          if (result.carrierLabelUrls && result.carrierLabelUrls[id]) {
            try {
              console.log(`Downloading carrier label PDF from URL for shipment ${id}...`);
              const pdfResponse = await fetch(result.carrierLabelUrls[id]);
              
              if (pdfResponse.ok) {
                // Convert the PDF to a base64 string
                const pdfBuffer = await pdfResponse.arrayBuffer();
                const pdfBase64 = Buffer.from(pdfBuffer).toString('base64');
                updateData.carrierLabelPdf = pdfBase64;
                console.log(`Successfully downloaded and stored carrier label PDF for shipment ${id}`);
              } else {
                console.error(`Failed to download carrier label PDF for shipment ${id}: ${pdfResponse.status} - ${pdfResponse.statusText}`);
              }
            } catch (error) {
              console.error(`Error downloading carrier label PDF for shipment ${id}:`, error);
            }
          }
        }
        
        // Update the shipment with the new data
        console.log(`🔧 [STATUS UPDATE] Attempting to update shipment ${id} with status: ${updateData.status}`);
        console.log(`🔧 [STATUS UPDATE] Complete updateData for shipment ${id}:`, JSON.stringify(updateData, null, 2));
        
        // Log comprehensive update summary
        console.log(`\n💾 === FINAL DATABASE UPDATE SUMMARY FOR SHIPMENT ${id} ===`);
        console.log(`🏷️ Carrier Assignment:`);
        console.log(`   - Carrier Name: ${updateData.carrierName || 'NOT SET'}`);
        console.log(`   - Shipping Provider: ${updateData.shippingProvider || 'NOT SET'}`);
        console.log(`📞 Tracking Information:`);
        console.log(`   - Moogship Tracking: ${updateData.trackingNumber || 'NOT SET'}`);
        console.log(`   - Carrier Tracking: ${updateData.carrierTrackingNumber || 'NOT SET'}`);
        console.log(`📄 Label Information:`);
        console.log(`   - Moogship Label URL: ${updateData.labelUrl ? 'SET' : 'NOT SET'}`);
        console.log(`   - Moogship Label PDF: ${updateData.labelPdf ? `SET (${updateData.labelPdf.length} chars)` : 'NOT SET'}`);
        console.log(`   - Carrier Label URL: ${updateData.carrierLabelUrl ? 'SET' : 'NOT SET'}`);
        console.log(`   - Carrier Label PDF: ${updateData.carrierLabelPdf ? `SET (${updateData.carrierLabelPdf.length} chars)` : 'NOT SET'}`);
        console.log(`📈 Status: ${updateData.status || 'NOT CHANGED'}`);
        console.log(`💾 === WRITING TO DATABASE NOW ===\n`);
        
        try {
          const updatedShipment = await storage.updateShipment(id, updateData);
          
          if (updatedShipment) {
            console.log(`✅ [STATUS UPDATE] Successfully updated shipment ${id} to status: ${updatedShipment.status}`);
            
            // Log final verification of what was actually stored in database
            console.log(`\n🎯 === DATABASE VERIFICATION FOR SHIPMENT ${id} ===`);
            console.log(`📋 Final stored values:`);
            console.log(`   - Status: ${updatedShipment.status}`);
            console.log(`   - Carrier Name: ${updatedShipment.carrierName || 'NOT SET'}`);
            console.log(`   - Shipping Provider: ${updatedShipment.shippingProvider || 'NOT SET'}`);
            console.log(`   - Moogship Tracking: ${updatedShipment.trackingNumber || 'NOT SET'}`);
            console.log(`   - Carrier Tracking: ${updatedShipment.carrierTrackingNumber || 'NOT SET'}`);
            console.log(`   - Carrier Label URL: ${updatedShipment.carrierLabelUrl ? 'SET' : 'NOT SET'}`);
            console.log(`   - Carrier Label PDF: ${updatedShipment.carrierLabelPdf ? `SET (${updatedShipment.carrierLabelPdf.length} chars)` : 'NOT SET'}`);
            console.log(`🎯 === SHIPMENT ${id} PROCESSING COMPLETE ===\n`);
            
            // Verify the update was successful
            if (updatedShipment.status !== 'pre_transit') {
              console.error(`❌ [STATUS UPDATE] ERROR: Shipment ${id} status was not updated to pre_transit. Current status: ${updatedShipment.status}`);
            }
          } else {
            console.error(`❌ [STATUS UPDATE] ERROR: Failed to update shipment ${id} - updateShipment returned undefined`);
          }
        } catch (updateError) {
          console.error(`❌ [STATUS UPDATE] ERROR: Exception occurred while updating shipment ${id}:`, updateError);
          throw updateError; // Re-throw to handle in the outer try-catch
        }
        
        // Send tracking notification email if a carrier tracking number was added
        if (updateData.carrierTrackingNumber) {
          try {
            const { sendTrackingNumberNotification } = await import('../notification-emails');
            const updatedShipment = await storage.getShipment(id);
            const shipmentUser = await storage.getUser(updatedShipment.userId);
            
            if (shipmentUser && updatedShipment) {
              // Send notification in background, don't block the bulk processing
              sendTrackingNumberNotification(updatedShipment, shipmentUser)
                .then(result => {
                  if (result.success) {
                    console.log(`API tracking notification email sent successfully to ${shipmentUser.email} for shipment ${id}`);
                  } else {
                    console.warn(`Failed to send API tracking notification email for shipment ${id}:`, result.error);
                  }
                })
                .catch(err => {
                  console.error(`Error sending API tracking notification email for shipment ${id}:`, err);
                });
            } else {
              console.warn(`Could not send API tracking notification email for shipment ${id}: User or shipment not found`);
            }
          } catch (emailError) {
            console.error('Error sending API tracking notification email:', emailError);
            // Continue processing even if email sending fails
          }
        }
      }));
    }
    
    // Process failed shipments
    if (result.failedShipmentIds && result.failedShipmentIds.length > 0) {
      await Promise.all(result.failedShipmentIds.map(async (id) => {
        // Get current shipment to increment the attempt counter
        const currentShipment = await storage.getShipment(id);
        if (!currentShipment) {
          console.log(`Failed shipment ${id} not found in database, skipping update`);
          return; // Skip if shipment not found
        }
        
        const currentAttempts = currentShipment.labelAttempts || 0;
        const newAttemptCount = currentAttempts + 1;
        
        console.log(`Shipment ${id} failed - incrementing attempt count: ${currentAttempts} → ${newAttemptCount}`);
        console.log(`Current tracking number: ${currentShipment.trackingNumber}, orderNumber value might be: ORDER-${id}${newAttemptCount}-timestamp`);
        
        // Use the shipment-specific detailed error message if available
        let shipmentSpecificError = 'Failed to purchase label from ShipEntegra';
        
        if (result.shipmentErrors && result.shipmentErrors[id]) {
          shipmentSpecificError = result.shipmentErrors[id];
          console.log(`Using specific error message for shipment ${id}: ${shipmentSpecificError}`);
        } else if (result.message) {
          shipmentSpecificError = result.message;
          console.log(`Using general error message for shipment ${id}: ${shipmentSpecificError}`);
        }
        
        // Check for specific error patterns and provide better user messages
        if (shipmentSpecificError.includes("IOSS") && shipmentSpecificError.includes("required")) {
          shipmentSpecificError = "IOSS number is required for European shipments under 150 EUR. Please add an IOSS number and try again.";
          console.log(`Updated to user-friendly IOSS error for shipment ${id}`);
        }
        
        // Don't change the Moogship tracking number
        // The Shipentegra service will append a -counter suffix to the tracking number when sending to API
        
        const updateData: any = {
          sentToShipEntegra: true, // We did try to send it
          sentToShipEntegraAt: new Date(),
          labelAttempts: newAttemptCount, // Increment attempt counter
          labelError: shipmentSpecificError
          // Keep the original tracking number - don't update it
        };
        
        console.log(`Updating failed shipment ${id} with error: ${updateData.labelError}, attempts: ${updateData.labelAttempts}, tracking number: ${currentShipment.trackingNumber} (unchanged)`);
        
        // Update the shipment with error data
        await storage.updateShipment(id, updateData);
      }));
    }
    
    return res.status(200).json(result);
  } catch (error) {
    console.error('Error sending shipments to ShipEntegra:', error);
    return res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'An unexpected error occurred',
      shipmentIds: []
    });
  }
};

/**
 * Download missing carrier label PDFs
 * This function is for admins to force download all missing carrier label PDFs
 */

/**
 * Adds a manual tracking number to a shipment without purchasing through carrier API
 * This is for admins to manually add tracking after shipment is sent
 */
export const addManualTrackingNumber = async (req: Request, res: Response) => {
  try {
    const shipmentId = parseInt(req.params.id);
    console.log(`[DEBUG] Tracking number request for shipment ${shipmentId}`);
    
    if (isNaN(shipmentId)) {
      console.log(`[DEBUG] Invalid shipment ID: ${req.params.id}`);
      return res.status(400).json({ success: false, message: "Invalid shipment ID" });
    }
    
    // Validate request body
    const { trackingNumber, carrierName, trackingLink } = req.body;
    console.log(`[DEBUG] Request body:`, { trackingNumber, carrierName, trackingLink });
    
    if (!trackingNumber) {
      console.log(`[DEBUG] Missing tracking number in request body`);
      return res.status(400).json({ success: false, message: "Tracking number is required" });
    }
    
    // Auto-detect carrier if not provided
    let detectedCarrier = carrierName;
    if (!detectedCarrier) {
      const { detectCarrier } = await import('../utils/carrierDetection');
      const carrierType = detectCarrier(trackingNumber);
      
      switch (carrierType) {
        case 'UPS':
          detectedCarrier = 'UPS';
          break;
        case 'DHL':
          detectedCarrier = 'DHL';
          break;
        case 'AFS':
          detectedCarrier = 'AFS Transport';
          break;
        case 'ROYAL':
          detectedCarrier = 'Royal Mail';
          break;
        default:
          detectedCarrier = 'Manual Entry';
      }
      
      console.log(`[DEBUG] Auto-detected carrier: ${detectedCarrier} for tracking number: ${trackingNumber}`);
    }
    
    // Get the shipment
    const shipment = await storage.getShipment(shipmentId);
    console.log(`[DEBUG] Shipment found:`, { id: shipment?.id, status: shipment?.status, existingTracking: shipment?.carrierTrackingNumber });
    
    if (!shipment) {
      console.log(`[DEBUG] Shipment not found: ${shipmentId}`);
      return res.status(404).json({ success: false, message: "Shipment not found" });
    }
    
    // Admin can edit tracking numbers for shipments in any status
    console.log(`[DEBUG] Admin editing tracking number for shipment with status: ${shipment.status}`);
    
    console.log(`[DEBUG] Validation passed, proceeding with update`);
    
    // Update the shipment with manual tracking info
    const updateData: any = {
      manualTrackingNumber: trackingNumber,
      manualCarrierName: detectedCarrier,
      manualTrackingLink: trackingLink || null,
      updatedAt: new Date()
    };
    
    // Only change status to IN_TRANSIT if it's currently APPROVED
    if (shipment.status === ShipmentStatus.APPROVED) {
      updateData.status = ShipmentStatus.IN_TRANSIT;
    }
    
    const updatedShipment = await storage.updateShipment(shipmentId, updateData);
    
    if (!updatedShipment) {
      return res.status(500).json({ success: false, message: "Failed to update shipment" });
    }
    
    // Log the action
    console.log(`[MANUAL TRACKING] Admin ${req.user?.id} added tracking ${trackingNumber} to shipment ${shipmentId}`);
    
    // Send tracking notification email to user
    try {
      const { sendTrackingNumberNotification } = await import('../notification-emails');
      const shipmentUser = await storage.getUser(shipment.userId);
      
      if (shipmentUser) {
        // Send notification in background, don't block the response
        sendTrackingNumberNotification(updatedShipment, shipmentUser)
          .then(result => {
            if (result.success) {
              console.log(`Tracking notification email sent successfully to ${shipmentUser.email} for shipment ${shipmentId}`);
            } else {
              console.warn(`Failed to send tracking notification email for shipment ${shipmentId}:`, result.error);
            }
          })
          .catch(err => {
            console.error(`Error sending tracking notification email for shipment ${shipmentId}:`, err);
          });
      } else {
        console.warn(`Could not send tracking notification email for shipment ${shipmentId}: User ${shipment.userId} not found`);
      }
    } catch (emailError) {
      console.error('Error sending tracking notification email:', emailError);
      // Continue even if email sending fails
    }
    
    // Return success
    res.json({
      success: true,
      message: "Tracking number added successfully",
      shipment: updatedShipment
    });
  } catch (error) {
    console.error("Error adding manual tracking number:", error);
    res.status(500).json({ 
      success: false, 
      message: "Error adding manual tracking number" 
    });
  }
};

// Removed duplicate function declaration

export const validateBulkShipments = async (req: FileRequest, res: Response) => {
  console.log('🔍 VALIDATE BULK: Starting bulk shipments validation...');
  try {
    // Get user data from authenticated user
    const user = req.user;
    const userId = user?.id;
    
    console.log('🔍 VALIDATE BULK: User ID:', userId);
    
    if (!userId) {
      console.error('🔍 VALIDATE BULK: User not authenticated');
      return res.status(401).json({ message: 'User not authenticated' });
    }

    // Get user's price multiplier if available (use system default as fallback)
    const defaultMultiplier = await storage.getDefaultPriceMultiplier();
    const userPriceMultiplier = user?.priceMultiplier || defaultMultiplier;

    // Make sure we have a file in the request
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }
    
    // Read the uploaded file
    console.log('Validating uploaded file:', req.file.originalname);
    
    let shipmentsData = [];
    let validationErrors = [];
    let fileType = 'unknown';
    
    try {
      // Determine file type based on extension
      const fileName = req.file.originalname.toLowerCase();
      
      if (fileName.endsWith('.csv')) {
        // Check if this is an Etsy CSV file by looking for specific headers
        // Read file from disk since we're using disk storage in multer
        const csvString = fs.readFileSync(req.file.path, 'utf8');
        const firstLine = csvString.split('\n')[0].trim();
        
        // Check if this is an Etsy CSV by looking for key column patterns
        const isEtsyCsv = 
          (firstLine.toLowerCase().includes('sale date') || firstLine.toLowerCase().includes('order date')) &&
          ((firstLine.toLowerCase().includes('ship name') || firstLine.toLowerCase().includes('recipient')) ||
           (firstLine.toLowerCase().includes('buyer') && 
            (firstLine.toLowerCase().includes('address') || firstLine.toLowerCase().includes('city')))) &&
          (firstLine.toLowerCase().includes('order id') || firstLine.toLowerCase().includes('order #'));
          
        if (isEtsyCsv) {
          console.log('Detected Etsy orders CSV format');
          fileType = 'etsy-csv';
          
          // Parse Etsy CSV file using the file path
          shipmentsData = parseEtsyOrdersCsv(req.file.path, true);
        } else {
          fileType = 'generic-csv';
          // Regular CSV, handle as generic data
          const records = parse(csvString, {
            columns: true,
            skip_empty_lines: true,
            trim: true
          });
          
          shipmentsData = parseGenericShipmentData(records);
        }
      } else if (fileName.endsWith('.numbers')) {
        // Apple Numbers file - treat as Excel but log it
        console.log('Apple Numbers file detected - attempting to process');
        fileType = 'apple-numbers';
        try {
          // Try to read as Excel - might work if it's a compatible format
          const workbook = xlsx.readFile(req.file.path);
          const worksheet = workbook.Sheets[workbook.SheetNames[0]];
          const rawData = xlsx.utils.sheet_to_json(worksheet);
          
          // Process generic Excel data to extract recipient information
          shipmentsData = parseGenericShipmentData(rawData);
        } catch (numbersError) {
          console.error('Error reading Apple Numbers file:', numbersError);
          validationErrors.push('Apple Numbers files are not directly supported. Please export to CSV or Excel format.');
        }
      } else {
        fileType = 'excel';
        // Excel file
        const workbook = xlsx.readFile(req.file.path);
        const worksheet = workbook.Sheets[workbook.SheetNames[0]];
        const rawData = xlsx.utils.sheet_to_json(worksheet);
        
        shipmentsData = parseGenericShipmentData(rawData);
      }
    } catch (e) {
      console.error('Error processing file:', e);
      validationErrors.push(`Error processing file: ${e instanceof Error ? e.message : String(e)}`);
    }
    
    if (shipmentsData.length === 0 && validationErrors.length === 0) {
      validationErrors.push('The uploaded file contains no shipment data');
    }
    
    console.log(`Extracted ${shipmentsData.length} shipments from the uploaded file for validation`);
    
    // Apply default dimensions to each shipment and ensure numeric values
    shipmentsData = shipmentsData.map(shipment => {
      // Convert pieceCount from string to number if needed
      let pieceCount = shipment.pieceCount || 1;
      if (typeof pieceCount === 'string') {
        pieceCount = parseInt(pieceCount, 10) || 1;
      }
      
      return {
        ...shipment,
        length: shipment.length || 15,
        width: shipment.width || 10,
        height: shipment.height || 1,
        weight: shipment.weight || 0.5,
        pieceCount: pieceCount,
        serviceLevel: shipment.serviceLevel || 'standard', // Default service level
        senderPostalCode: shipment.senderPostalCode || '34000', // Default Istanbul code
        senderCity: shipment.senderCity || 'Istanbul'
      };
    });

    // Calculate prices for all shipments immediately with multiple service options
    try {
      // Import the MoogShip pricing service that returns multiple options
      const { calculateMoogShipPricing } = await import('../services/moogship-pricing');

      // Get user data for pricing calculations
      const user = req.user;
      const defaultMultiplier = await storage.getDefaultPriceMultiplier();
      const userPriceMultiplier = user?.priceMultiplier || defaultMultiplier;
      
      console.log(`🔍 Calculating pricing for ${shipmentsData.length} shipments with multiplier ${userPriceMultiplier}`);
      
      // Process each shipment in sequence to calculate prices
      for (const shipment of shipmentsData) {
        // Skip price calculation for shipments marked to be skipped
        if (shipment.skipImport) {
          continue;
        }
        
        // Call the MoogShip pricing service to get multiple service options
        try {
          const packages = [{
            length: shipment.length,
            width: shipment.width,
            height: shipment.height,
            weight: shipment.weight,
            contents: shipment.packageContents || 'General goods',
            productItems: shipment.productItems || []
          }];
          
          // Call calculateMoogShipPricing with user multiplier and userId for user-specific rules
          // calculateMoogShipPricing already applies the multiplier, so no manual multiplication needed
          const pricingData = await calculateMoogShipPricing(
            shipment.length,
            shipment.width,
            shipment.height,
            shipment.weight,
            shipment.receiverCountry,
            userPriceMultiplier,
            false, // skipMultiplier
            user?.id // userId for user-specific pricing rules
          );

          const pricingOptions = pricingData.success ? pricingData.options : [];

          console.log(`💰 Got ${pricingOptions?.length || 0} pricing options for shipment to ${shipment.receiverName}`);

          if (pricingOptions && pricingOptions.length > 0) {
            // Pricing options already have multiplier applied by calculateMoogShipPricing
            // Add pricing options directly to the shipment
            shipment.pricingOptions = pricingOptions;

            // Set the first (cheapest) option as default
            const defaultOption = pricingOptions[0];
            shipment.selectedServiceOption = defaultOption;
            shipment.basePrice = defaultOption.cargoPrice;
            shipment.totalPrice = defaultOption.totalPrice;
            shipment.estimatedDeliveryDays = parseInt(defaultOption.deliveryTime) || 7;
            shipment.selectedService = defaultOption.providerServiceCode || defaultOption.serviceName || defaultOption.displayName;
            
            console.log(`✅ Default service selected: ${defaultOption.displayName} - $${(defaultOption.totalPrice / 100).toFixed(2)} (with ${userPriceMultiplier}x multiplier)`);
          } else {
            console.log(`❌ No pricing options found for shipment to ${shipment.receiverName}`);
          }
        } catch (priceError) {
          console.error('Error calculating pricing options:', priceError);
          // Continue validation even if price calculation fails
        }
      }
    } catch (priceImportError) {
      console.error('Error importing MoogShip pricing service:', priceImportError);
      // Continue validation even if price calculation fails
    }
    
    // Validate each shipment
    shipmentsData.forEach((shipment, index) => {
      // Check required fields
      const missingFields = [];
      
      // Required receiver info
      if (!shipment.receiverName) missingFields.push('Recipient Name');
      if (!shipment.receiverAddress) missingFields.push('Address');
      if (!shipment.receiverCity) missingFields.push('City');
      if (!shipment.receiverCountry) missingFields.push('Country');
      
      // Add validation error for this shipment if fields are missing
      if (missingFields.length > 0) {
        validationErrors.push(`Shipment #${index + 1}: Missing required fields: ${missingFields.join(', ')}`);
      }
    });
    
    // Return the validated shipments along with any errors
    return res.status(200).json({
      message: validationErrors.length === 0 
        ? `Successfully validated ${shipmentsData.length} shipments`
        : `Found ${validationErrors.length} validation errors in ${shipmentsData.length} shipments`,
      fileType,
      shipments: shipmentsData,
      errors: validationErrors
    });
  } catch (error) {
    console.error('Error validating bulk shipments:', error);
    return res.status(500).json({ message: 'Failed to validate bulk shipments' });
  }
};

/**
 * Create bulk shipments from validated and priced data
 */
export const createBulkShipments = async (req: Request, res: Response) => {
  try {
    const user = req.user;
    const userId = user?.id;
    
    if (!userId) {
      return res.status(401).json({ message: 'User not authenticated' });
    }

    const { shipments } = req.body;
    
    if (!shipments || !Array.isArray(shipments)) {
      return res.status(400).json({ message: 'No shipments data provided' });
    }

    if (shipments.length === 0) {
      return res.status(400).json({ message: 'No shipments to create' });
    }

    console.log(`Creating ${shipments.length} bulk shipments for user ${userId}`);
    console.log('User object:', user);
    console.log('User ID variable:', userId);
    console.log('Sample shipment data:', JSON.stringify(shipments[0], null, 2));
    
    // Log ALL shipment data for debugging
    console.log('🔍 [BULK DEBUG] ALL SHIPMENT DATA:');
    shipments.forEach((shipment, index) => {
      console.log(`🔍 [BULK DEBUG] Shipment ${index + 1}:`, {
        receiverCountry: shipment.receiverCountry,
        iossNumber: shipment.iossNumber,
        hmrcNumber: shipment.hmrcNumber,
        taxId: shipment.taxId,
        hasSelectedServiceOption: !!shipment.selectedServiceOption
      });
    });

    const createdShipments = [];
    const errors = [];

    // Process each shipment
    for (let i = 0; i < shipments.length; i++) {
      const shipmentData = shipments[i];
      
      try {
        console.log(`Processing shipment ${i + 1}:`, {
          receiverName: shipmentData.receiverName,
          receiverAddress: shipmentData.receiverAddress,
          receiverCity: shipmentData.receiverCity,
          receiverCountry: shipmentData.receiverCountry,
          hasSelectedServiceOption: !!shipmentData.selectedServiceOption,
          serviceOptionKeys: shipmentData.selectedServiceOption ? Object.keys(shipmentData.selectedServiceOption) : []
        });

        // Validate required fields
        const requiredFields = ['receiverName', 'receiverAddress', 'receiverCity', 'receiverCountry'];
        const missingFields = requiredFields.filter(field => !shipmentData[field]);
        
        if (missingFields.length > 0) {
          console.log(`Shipment ${i + 1} validation failed: Missing fields:`, missingFields);
          errors.push(`Shipment ${i + 1}: Missing required fields: ${missingFields.join(', ')}`);
          continue;
        }

        // CRITICAL: Validate IOSS/HMRC numbers for European destinations
        const countryCode = convertCountryNameToCode(shipmentData.receiverCountry);
        const isEUDestination = isEUCountry(countryCode);
        const isHMRCDestination = isHMRCCountry(countryCode);
        
        // Helper function to check if a field has a valid value (not null, "null", undefined, "undefined", or empty)
        const hasValidValue = (value: any): boolean => {
          return value && 
                 value !== null && 
                 value !== 'null' && 
                 value !== undefined && 
                 value !== 'undefined' && 
                 typeof value === 'string' && 
                 value.trim() !== '';
        };
        
        // Check for IOSS number (EU destinations)
        const hasIossNumber = hasValidValue(shipmentData.iossNumber) || hasValidValue(shipmentData.taxId);
        
        // Check for HMRC number (UK/Sweden destinations)  
        const hasHmrcNumber = hasValidValue(shipmentData.hmrcNumber) || 
                             hasValidValue(shipmentData.iossNumber) || 
                             hasValidValue(shipmentData.taxId);
        
        console.log(`🆔 [BULK VALIDATION DEBUG] Shipment ${i + 1}: Country="${shipmentData.receiverCountry}" -> Code="${countryCode}", EU=${isEUDestination}, HMRC=${isHMRCDestination}`);
        console.log(`🆔 [BULK VALIDATION DEBUG] Available fields: iossNumber="${shipmentData.iossNumber}", hmrcNumber="${shipmentData.hmrcNumber}", taxId="${shipmentData.taxId}"`);
        console.log(`🆔 [BULK VALIDATION DEBUG] Valid field checks: iossNumber=${hasValidValue(shipmentData.iossNumber)}, hmrcNumber=${hasValidValue(shipmentData.hmrcNumber)}, taxId=${hasValidValue(shipmentData.taxId)}`);
        console.log(`🆔 [BULK VALIDATION DEBUG] Validation results: hasIossNumber=${hasIossNumber}, hasHmrcNumber=${hasHmrcNumber}`);
        
        // Enforce IOSS requirement for EU destinations (excluding HMRC countries)
        if (isEUDestination && !isHMRCDestination && !hasIossNumber) {
          console.log(`❌ [BULK IOSS VALIDATION] Shipment ${i + 1} to EU destination ${countryCode} requires IOSS number`);
          errors.push(`Shipment ${i + 1}: IOSS number is required for shipments to EU countries (${countryCode})`);
          continue;
        }

        // Validate DDP is only allowed for US destinations
        if (shipmentData.shippingTerms === 'ddp' && countryCode !== 'US') {
          console.log(`❌ [BULK DDP VALIDATION] DDP is only allowed for US destinations, but shipment ${i + 1} is to ${countryCode}`);
          errors.push(`Shipment ${i + 1}: DDP shipping terms are only available for US destinations`);
          continue;
        }

        // DDP duty calculation logic for bulk shipments
        let ddpDutiesAmount = null;
        let ddpProcessingFee = 0;
        
        if (shipmentData.shippingTerms === 'ddp' && countryCode === 'US') {
          try {
            console.log(`💰 [BULK DDP] Calculating duties for shipment ${i + 1} to ${countryCode}`);
            
            // Import duty calculation service
            const USITCDutyService = (await import('../services/usitc-duty-rates')).default;
            const usitcService = new USITCDutyService();
            
            // Calculate duties using USITC rates
            const dutyLookup = await usitcService.getDutyRate(
              shipmentData.gtip || '9999999999'
            );
            
            let dutyResult = null;
            if (dutyLookup && dutyLookup.dutyPercentage !== null) {
              const customsValueInDollars = (shipmentData.customsValue || 5000) / 100;
              const baseDuty = customsValueInDollars * (dutyLookup.dutyPercentage / 100);
              const trumpTariff = 0; // Would be calculated separately if applicable
              const totalDuty = baseDuty + trumpTariff;
              
              dutyResult = {
                available: true,
                totalDutyAmount: totalDuty,
                formattedTotalWithDDPFee: `$${(totalDuty + 4.50).toFixed(2)}`
              };
            }
            
            if (dutyResult && dutyResult.available) {
              ddpDutiesAmount = Math.round(dutyResult.totalDutyAmount * 100); // Convert to cents
              // Check if ECO shipping based on selectedService
              const isEcoShipping = shipmentData.selectedService && 
                (shipmentData.selectedService.toLowerCase().includes('eko') || 
                 shipmentData.selectedService.toLowerCase().includes('eco'));
              // ECO shipping: 45 cents, Standard shipping: $4.50 (450 cents)
              ddpProcessingFee = isEcoShipping ? 45 : 450;
              
              console.log(`💰 [BULK DDP] Calculated duties for shipment ${i + 1}: $${(ddpDutiesAmount / 100).toFixed(2)} + $${(ddpProcessingFee / 100).toFixed(2)} processing fee`);
            } else {
              console.log(`⚠️ [BULK DDP] Could not calculate duties for shipment ${i + 1} - duty service unavailable`);
            }
          } catch (dutyError) {
            console.error(`❌ [BULK DDP] Error calculating duties for shipment ${i + 1}:`, dutyError);
          }
        }
        
        // Enforce HMRC requirement for UK and Sweden
        if (isHMRCDestination && !hasHmrcNumber) {
          console.log(`❌ [BULK HMRC VALIDATION] Shipment ${i + 1} to HMRC destination ${countryCode} requires HMRC number`);
          errors.push(`Shipment ${i + 1}: HMRC number is required for shipments to ${countryCode === 'GB' ? 'United Kingdom' : 'Sweden'}`);
          continue;
        }
        
        console.log(`✅ [BULK CUSTOMS VALIDATION] Shipment ${i + 1}: Country=${countryCode}, EU=${isEUDestination}, HMRC=${isHMRCDestination}, HasIOSS=${hasIossNumber}, HasHMRC=${hasHmrcNumber}`);

        // Validate pricing information
        if (!shipmentData.selectedServiceOption || !shipmentData.selectedServiceOption.totalPrice) {
          console.log(`Shipment ${i + 1} validation failed: Missing pricing information`);
          console.log('Selected service option:', shipmentData.selectedServiceOption);
          errors.push(`Shipment ${i + 1}: Missing pricing information`);
          continue;
        }

        const selectedService = shipmentData.selectedServiceOption;

        // Prepare shipment data for creation - prioritize Excel data over user data for sender information
        // Use user's actual address from profile (no fallbacks unless user data is genuinely missing)
        const senderAddress = user?.address || '';
        
        const newShipment = {
          userId,
          status: ShipmentStatus.PENDING,
          
          // Sender information - use authenticated user data as sender (the person uploading the Excel)
          senderName: user?.companyName || user?.name || 'MoogShip User',
          senderEmail: user?.email || '',
          senderPhone: user?.phone || '',
          senderAddress: senderAddress,
          senderAddress1: senderAddress,
          senderAddress2: null,
          senderCity: user?.city || '',
          senderPostalCode: user?.postalCode || '',
          
          // Receiver information
          receiverName: shipmentData.receiverName,
          receiverEmail: shipmentData.receiverEmail || '',
          receiverPhone: shipmentData.receiverPhone || '',
          receiverAddress: shipmentData.receiverAddress,
          receiverAddress1: shipmentData.receiverAddress,
          receiverAddress2: shipmentData.receiverAddress2 || null,
          receiverCity: shipmentData.receiverCity,
          receiverState: shipmentData.receiverState || '',
          receiverPostalCode: shipmentData.receiverPostalCode || '',
          receiverCountry: convertCountryNameToCode(shipmentData.receiverCountry),
          
          // Package information
          packageWeight: shipmentData.packageWeight || 0.5,
          packageLength: shipmentData.packageLength || 10,
          packageWidth: shipmentData.packageWidth || 10,
          packageHeight: shipmentData.packageHeight || 5,
          packageContents: shipmentData.packageContents || 'General merchandise',
          packageValue: shipmentData.packageValue || selectedService.totalPrice,
          selectedService: selectedService.serviceCode || selectedService.displayName,
          serviceLevel: selectedService.serviceLevel || ServiceLevel.STANDARD,
          
          // Pricing fields - pricing API already returns values in cents
          // No conversion needed since pricing services multiply by 100
          basePrice: selectedService.cargoPrice || selectedService.basePrice || selectedService.totalPrice,
          fuelCharge: selectedService.fuelCost || selectedService.fuelCharge || 0,
          additionalFee: selectedService.additionalFee || 0,
          originalAdditionalFee: selectedService.additionalFee || 0,
          taxes: selectedService.taxes || 0,
          totalPrice: selectedService.totalPrice,
          originalTotalPrice: selectedService.originalTotalPrice || selectedService.totalPrice,
          appliedMultiplier: selectedService.appliedMultiplier || 1.25,
          
          // Additional fields
          currency: shipmentData.currency || 'USD',
          // Automatically set DDP for US destinations, DAP for others
          shippingTerms: (() => {
            const destCountry = convertCountryNameToCode(shipmentData.receiverCountry);
            const isUSDestination = destCountry === 'US' || destCountry === 'USA' || 
                                  shipmentData.receiverCountry === 'United States' ||
                                  shipmentData.receiverCountry === 'US' ||
                                  shipmentData.receiverCountry === 'USA';
            // US destinations always get DDP, others use provided value or default to DAP
            return isUSDestination ? 'ddp' : (shipmentData.shippingTerms || 'dap');
          })(),
          ddpDutiesAmount: ddpDutiesAmount, // Calculated duties for DDP shipments
          // Determine carrier name based on service characteristics instead of hardcoding
          carrierName: (() => {
            // If explicitly provided, use it
            if (selectedService.carrierName) {
              return selectedService.carrierName;
            }
            
            // Otherwise, detect based on service characteristics
            const serviceName = selectedService.serviceCode || selectedService.displayName || '';
            const displayName = selectedService.displayName || '';
            
            // Aramex services: return appropriate Aramex carrier name
            if (serviceName.toLowerCase().includes('aramex') || 
                displayName.toLowerCase().includes('aramex')) {
              return 'Aramex';
            }
            
            // AFS services: return appropriate AFS carrier name
            if (serviceName.toLowerCase().includes('afs-') || 
                serviceName.toLowerCase().includes('ecoafs')) {
              return 'AFS Transport';
            }
            
            // Default to MoogShip for other services
            return 'MoogShip';
          })(),
          // Determine shipping provider based on service name/code instead of hardcoding
          shippingProvider: (() => {
            // If explicitly provided, use it
            if (selectedService.shippingProvider) {
              return selectedService.shippingProvider;
            }
            
            // Otherwise, detect based on service characteristics
            const serviceName = selectedService.serviceCode || selectedService.displayName || '';
            const displayName = selectedService.displayName || '';
            const carrierName = selectedService.carrierName || '';
            
            // Aramex services: check for aramex in service names
            if (serviceName.toLowerCase().includes('aramex') || 
                displayName.toLowerCase().includes('aramex') ||
                carrierName.toLowerCase().includes('aramex')) {
              return 'aramex';
            }
            
            // AFS services: check for afs- prefix or EcoAFS in names
            if (serviceName.toLowerCase().includes('afs-') || 
                serviceName.toLowerCase().includes('ecoafs')) {
              return 'afs';
            }
            
            // Default to moogship for other services
            return 'moogship';
          })(),
          providerServiceCode: selectedService.serviceCode,
          estimatedDeliveryDays: selectedService.estimatedDeliveryDays || 7,
          
          // Insurance flag - simplified Boolean evaluation using frontend calculated values
          isInsured: (() => {
            const hasInsurance = shipmentData.hasInsurance;
            const insurance = shipmentData.insurance;
            const insuranceValue = Number(shipmentData.insuranceValue) || 0;
            
            console.log(`🛡️ INSURANCE DEBUG:`, {
              hasInsurance, insurance, insuranceValue,
              hasInsuranceType: typeof hasInsurance,
              insuranceType: typeof insurance
            });
            
            // Use Boolean() for comprehensive truthy evaluation
            const result = Boolean(hasInsurance) || Boolean(insurance) || (insuranceValue > 0);
            
            console.log(`🛡️ FINAL INSURANCE FLAG:`, result);
            return result;
          })(),
          insuranceValue: Number(shipmentData.insuranceValue) || 0,
          insuranceCost: await (async () => {
            // Calculate insurance cost if insurance is enabled
            const insuranceValue = Number(shipmentData.insuranceValue) || 0;
            const isInsured = (shipmentData.hasInsurance === true || shipmentData.hasInsurance === 'true') ||
                             (shipmentData.insurance === true || shipmentData.insurance === 'true') ||
                             (insuranceValue > 0);
            
            if (!isInsured || insuranceValue <= 0) {
              return 0;
            }
            
            try {
              // Get insurance ranges from database
              const insuranceRanges = await storage.getActiveInsuranceRanges();
              
              // Find the appropriate range for the value
              const applicableRange = insuranceRanges.find((range: any) => 
                insuranceValue >= range.minValue && insuranceValue <= range.maxValue
              );
              
              if (!applicableRange) {
                // Default calculation if no range found (2% of value with minimum $5)
                const calculatedCost = Math.max(Math.round(insuranceValue * 0.02), 500); // 2% minimum $5
                console.log(`🛡️ INSURANCE COST (default): ${calculatedCost} cents for value ${insuranceValue}`);
                return calculatedCost;
              }
              
              console.log(`🛡️ INSURANCE COST (range): ${applicableRange.insuranceCost} cents for value ${insuranceValue}`);
              return applicableRange.insuranceCost;
            } catch (error) {
              console.error('🛡️ Error calculating insurance cost:', error);
              // Use default calculation as fallback
              const fallbackCost = Math.max(Math.round(insuranceValue * 0.02), 500);
              console.log(`🛡️ INSURANCE COST (fallback): ${fallbackCost} cents`);
              return fallbackCost;
            }
          })(),
          
          // Tax ID mapping - route to IOSS or HMRC based on destination country
          iossNumber: (() => {
            // Convert country name to code first
            const countryCode = convertCountryNameToCode(shipmentData.receiverCountry);
            const isEU = isEUCountry(countryCode);
            const isHMRC = isHMRCCountry(countryCode);
            
            console.log(`🆔 IOSS Backend Debug - Country: "${shipmentData.receiverCountry}" -> Code: "${countryCode}", isEU: ${isEU}, isHMRC: ${isHMRC}`);
            console.log(`🆔 IOSS Fields - iossNumber: "${shipmentData.iossNumber}", taxId: "${shipmentData.taxId}"`);
            
            // If already has specific IOSS number, use it
            if (shipmentData.iossNumber) {
              console.log(`🆔 Using specific IOSS number: "${shipmentData.iossNumber}"`);
              return String(shipmentData.iossNumber).trim();
            }
            
            // If has generic taxId and destination is EU country, use it for IOSS
            if (shipmentData.taxId && countryCode && isEU) {
              console.log(`🆔 Using taxId for IOSS: "${shipmentData.taxId}"`);
              return String(shipmentData.taxId).trim();
            }
            
            console.log(`🆔 No IOSS number set`);
            return null;
          })(),
          
          hmrcNumber: (() => {
            // Convert country name to code first
            const countryCode = convertCountryNameToCode(shipmentData.receiverCountry);
            const isHMRC = isHMRCCountry(countryCode);
            
            console.log(`🆔 HMRC Backend Debug - Country: "${shipmentData.receiverCountry}" -> Code: "${countryCode}", isHMRC: ${isHMRC}`);
            console.log(`🆔 HMRC Fields - hmrcNumber: "${shipmentData.hmrcNumber}", taxId: "${shipmentData.taxId}"`);
            
            // If already has specific HMRC number, use it
            if (shipmentData.hmrcNumber) {
              console.log(`🆔 Using specific HMRC number: "${shipmentData.hmrcNumber}"`);
              return String(shipmentData.hmrcNumber).trim();
            }
            
            // If has generic taxId and destination is UK, use it for HMRC
            if (shipmentData.taxId && countryCode === 'GB') {
              console.log(`🆔 Using taxId for HMRC: "${shipmentData.taxId}"`);
              return String(shipmentData.taxId).trim();
            }
            
            console.log(`🆔 No HMRC number set`);
            return null;
          })(),
          
          // Additional customs fields for bulk uploads - ensure proper value mapping
          customsValue: shipmentData.customsValue || 5000, // Default 5000 cents = $50 for customs value
          customsItemCount: shipmentData.customsItemCount || 1,
          gtip: shipmentData.gtip || '9999999999', // Default GTIP for general merchandise
          
          // Bulk upload metadata
          createdAt: new Date(),
          updatedAt: new Date()
        };

        // Debug insurance and IOSS mapping - ENHANCED DEBUGGING
        const insuranceFlag = Boolean(shipmentData.hasInsurance || shipmentData.insurance || (Number(shipmentData.insuranceValue) > 0));
        console.log(`🛡️ ENHANCED INSURANCE DEBUG for shipment ${i + 1}:`, {
          'shipmentData.insurance': shipmentData.insurance,
          'shipmentData.hasInsurance': shipmentData.hasInsurance,  
          'shipmentData.insuranceValue': shipmentData.insuranceValue,
          'Number(shipmentData.insuranceValue)': Number(shipmentData.insuranceValue),
          'Number(shipmentData.insuranceValue) > 0': Number(shipmentData.insuranceValue) > 0,
          'shipmentData.hasInsurance || shipmentData.insurance || (Number(shipmentData.insuranceValue) > 0)': shipmentData.hasInsurance || shipmentData.insurance || (Number(shipmentData.insuranceValue) > 0),
          'Boolean() result': Boolean(shipmentData.hasInsurance || shipmentData.insurance || (Number(shipmentData.insuranceValue) > 0)),
          'calculated insurance boolean': insuranceFlag,
          'final isInsured value': insuranceFlag,
          'ALL_SHIPMENT_FIELDS': Object.keys(shipmentData),
          'SHIPMENT_DATA_SAMPLE': JSON.stringify(shipmentData, null, 2)
        });
        
        const countryCodeForDebug = convertCountryNameToCode(shipmentData.receiverCountry);
        console.log(`🆔 TAX ID MAPPING DEBUG for shipment ${i + 1}:`, {
          'shipmentData.taxId': shipmentData.taxId,
          'shipmentData.iossNumber': shipmentData.iossNumber,
          'shipmentData.hmrcNumber': shipmentData.hmrcNumber,
          'original receiverCountry': shipmentData.receiverCountry,
          'converted countryCode': countryCodeForDebug,
          'isEuropeanCountry': countryCodeForDebug ? isEUCountry(countryCodeForDebug) : false,
          'isUK': countryCodeForDebug === 'GB',
          'final iossNumber': newShipment.iossNumber,
          'final hmrcNumber': newShipment.hmrcNumber
        });
        
        console.log(`📊 RAW SHIPMENT DATA for shipment ${i + 1}:`, JSON.stringify(shipmentData, null, 2));

        // Debug the newShipment object before creation
        console.log(`About to create shipment ${i + 1} with data:`, {
          userId: newShipment.userId,
          status: newShipment.status,
          senderName: newShipment.senderName,
          receiverName: newShipment.receiverName
        });

        // Create the shipment in database - pass userId as separate parameter
        // Remove userId from newShipment object since it's passed separately
        const { userId: shipmentUserId, ...shipmentDataForStorage } = newShipment;
        const createdShipment = await storage.createShipment(shipmentDataForStorage, userId);
        
        console.log(`Created shipment ${createdShipment.id} for ${shipmentData.receiverName}`);
        
        // Create physical package records for bulk shipment - CRITICAL FIX
        try {
          console.log(`Creating physical package records for bulk shipment ${createdShipment.id}`);
          
          const pieceCount = shipmentData.pieceCount || 1;
          
          // Create physical packages with the dimensions from the shipment
          const packageDimensions = {
            weight: shipmentData.packageWeight || 0.5,
            length: shipmentData.packageLength || 10,
            width: shipmentData.packageWidth || 10,
            height: shipmentData.packageHeight || 5
          };
          
          await storage.createPhysicalPackagesForShipment(
            createdShipment.id,
            pieceCount,
            packageDimensions,
            "Main Package",  // name parameter
            `Package for shipment #${createdShipment.id}`  // description parameter
          );
          
          console.log(`Created ${pieceCount} physical package records for bulk shipment ${createdShipment.id}`);
        } catch (packageError) {
          console.error('Error creating physical package records for bulk shipment:', packageError);
          // Continue with the shipment creation even if package record creation fails
        }
        
        // Generate MoogShip label automatically for bulk shipments
        try {
          console.log(`📄 Generating MoogShip label for bulk shipment ${createdShipment.id}...`);
          
          // Get the complete shipment with user data for label generation
          const completeShipment = await storage.getShipment(createdShipment.id);
          if (!completeShipment) {
            throw new Error(`Could not retrieve shipment ${createdShipment.id} for label generation`);
          }
          
          const labelResult = await generateShippingLabel(completeShipment);
          const labelUrl = getLabelUrl(labelResult.labelPath);
          
          // Update shipment with label URL and PDF data
          await storage.updateShipment(createdShipment.id, {
            labelUrl: labelUrl,
            labelPdf: labelResult.labelBase64
          });
          
          console.log(`✅ MoogShip label generated and attached to shipment ${createdShipment.id}`);
          
          // Add the label info to the created shipment for response
          createdShipment.labelUrl = labelUrl;
          createdShipment.labelPdf = labelResult.labelBase64;
          
        } catch (labelError) {
          console.error(`❌ Error generating MoogShip label for shipment ${createdShipment.id}:`, labelError);
          // Don't fail the entire shipment creation if label generation fails
          // Just log the error and continue
        }
        
        createdShipments.push(createdShipment);

      } catch (error) {
        console.error(`Error creating shipment ${i + 1}:`, error);
        errors.push(`Shipment ${i + 1}: Failed to create - ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    // Count shipments with labels
    const shipmentsWithLabels = createdShipments.filter(s => s.labelUrl).length;
    
    // Send bilingual email notifications for bulk shipments
    if (createdShipments.length > 0 && user) {
      try {
        const totalValue = createdShipments.reduce((sum, shipment) => {
          return sum + (shipment.totalPrice || 0);
        }, 0);
        
        const shipmentIds = createdShipments.map(s => s.id);
        
        const emailData = {
          user: user,
          shipmentCount: createdShipments.length,
          shipmentIds: shipmentIds,
          totalValue: totalValue
        };
        
        // Send customer notification email (Turkish first, then English)
        const customerEmailSent = await sendBulkShipmentNotification(emailData);
        
        if (customerEmailSent) {
          console.log(`📧 Bilingual customer notification sent to ${user.email} for ${createdShipments.length} bulk shipments`);
        } else {
          console.log(`⚠️ Failed to send customer notification to ${user.email} for bulk shipments`);
        }
        
        // Send admin approval notification email
        const adminEmailSent = await sendAdminBulkApprovalNotification(emailData);
        
        if (adminEmailSent) {
          console.log(`📧 Admin approval notification sent for ${createdShipments.length} bulk shipments from ${user.email}`);
        } else {
          console.log(`⚠️ Failed to send admin approval notification for bulk shipments`);
        }
        
      } catch (emailError) {
        console.error('❌ Error sending bulk shipment email notifications:', emailError);
        // Don't fail the entire operation if email fails
      }
    }
    
    // Prepare response
    const response = {
      message: `Successfully created ${createdShipments.length} out of ${shipments.length} shipments`,
      created: createdShipments.length,
      total: shipments.length,
      labelsGenerated: shipmentsWithLabels,
      shipments: createdShipments,
      errors: errors.length > 0 ? errors : undefined
    };

    console.log(`Bulk creation completed: ${createdShipments.length}/${shipments.length} successful`);

    return res.status(201).json(response);

  } catch (error) {
    console.error('Error in createBulkShipments:', error);
    return res.status(500).json({ 
      message: 'Failed to create bulk shipments',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

