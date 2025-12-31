import { saveAs } from 'file-saver';
import { ShipmentStatus, ServiceLevel, TransactionType } from '@shared/schema';
import { formatDate } from './shipment-utils';

/**
 * Export data to CSV file
 * @param data Array of objects to export
 * @param fileName Name of the file to be downloaded (without extension)
 */
export function exportToExcel(data: any[], fileName: string) {
  try {
   
    
    // Ensure we have data to export
    if (!data || !Array.isArray(data) || data.length === 0) {
      console.error('Invalid data format for export:', data);
      throw new Error('Invalid data format');
    }
    
    // Deep clone the data to avoid mutating original objects
    const exportData = JSON.parse(JSON.stringify(data));
    
    
    
    // Get headers from the first object
    const headers = Object.keys(exportData[0]);
    
    // Create CSV string with headers
    let csvContent = headers.join(',') + '\n';
    
    // Add data rows
    exportData.forEach((row) => {
      const values = headers.map(header => {
        const value = row[header];
        
        // Handle null, undefined, and empty values
        if (value === null || value === undefined) {
          return '';
        }
        
        // Handle strings with commas by wrapping in quotes
        if (typeof value === 'string' && (value.includes(',') || value.includes('"') || value.includes('\n'))) {
          return `"${value.replace(/"/g, '""')}"`;
        }
        
        return value;
      });
      
      csvContent += values.join(',') + '\n';
    });
    
    // Create a Blob from the CSV string
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8' });
    
    
    
    // Use FileSaver to save the blob
    saveAs(blob, `${fileName}.csv`);
    
    
    
  } catch (error) {
    console.error('Error exporting to CSV:', error);
    throw new Error('Failed to export data');
  }
}

/**
 * Format a shipment object for export by removing complex objects,
 * formatting nested properties, and removing admin-specific data and attachments
 */
export function formatShipmentForExport(shipment: any, isAdmin: boolean = false) {
  // Deep clone to avoid modifying the original
  const clone = JSON.parse(JSON.stringify(shipment));
  
  try {
    // Create a clean export object with only the essential fields
    const cleanExport: any = {
      formattedId: `SHIP-${String(clone.id).padStart(6, '0')}`,
      id: clone.id,
      status: clone.status ? formatEnumValue(clone.status) : '',
      createdAt: clone.createdAt ? formatDate(clone.createdAt) : '',
      
      // Sender information
      senderName: clone.senderName || '',
      senderAddress1: clone.senderAddress1 || '',
      senderCity: clone.senderCity || '',
      senderPostalCode: clone.senderPostalCode || '',
      senderCountry: clone.senderCountry || '',
      
      // Receiver information
      receiverName: clone.receiverName || '',
      receiverAddress1: clone.receiverAddress1 || '',
      receiverCity: clone.receiverCity || '',
      receiverPostalCode: clone.receiverPostalCode || '',
      receiverCountry: clone.receiverCountry || '',
      
      // Basic shipment details
      serviceLevel: clone.serviceLevel ? formatEnumValue(clone.serviceLevel) : '',
      totalPrice: clone.totalPrice !== undefined ? (clone.totalPrice / 100).toFixed(2) : '',
      trackingNumber: clone.trackingNumber || '',
    };
    
    // Package details (but not attachments)
    if (clone.packageWeight !== undefined) {
      cleanExport.packageWeight = `${clone.packageWeight} kg`;
    }
    
    if (clone.packageLength && clone.packageWidth && clone.packageHeight) {
      cleanExport.packageDimensions = `${clone.packageLength} × ${clone.packageWidth} × ${clone.packageHeight} cm`;
    }
    
    // Only add contents description if present, no actual attachment data
    if (clone.packageContents) {
      cleanExport.packageContents = clone.packageContents;
    }
    
    // Add admin-only price columns
    if (isAdmin) {
      cleanExport.costPrice = clone.originalTotalPrice !== undefined ? (clone.originalTotalPrice / 100).toFixed(2) : '';
      cleanExport.customerPrice = clone.totalPrice !== undefined ? (clone.totalPrice / 100).toFixed(2) : '';
      cleanExport.priceMultiplier = clone.appliedMultiplier !== undefined ? clone.appliedMultiplier.toFixed(2) : '';
    }
    
    return cleanExport;
  } catch (error) {
    console.error('Error formatting shipment for export:', error);
    // Return a minimal safe version if formatting fails
    return {
      id: shipment.id,
      formattedId: `SHIP-${String(shipment.id).padStart(6, '0')}`,
      status: shipment.status || ''
    };
  }
}

/**
 * Format a user object for export, removing admin-specific data
 */
export function formatUserForExport(user: any) {
  // Deep clone to avoid modifying the original
  const clone = JSON.parse(JSON.stringify(user));
  
  try {
    // Create a clean export object with only the essential fields
    const cleanExport: any = {
      id: clone.id,
      username: clone.username || '',
      name: clone.name || '',
      email: clone.email || '',
      companyName: clone.companyName || '',
      phone: clone.phone || '',
      country: clone.country || '',
      status: clone.isApproved ? 'Approved' : 
              clone.rejectionReason ? 'Rejected' : 'Pending',
      createdAt: clone.createdAt ? formatDate(clone.createdAt) : '',
    };
    
    // Format balance if present
    if (clone.balance !== undefined) {
      cleanExport.formattedBalance = `$${(clone.balance / 100).toFixed(2)}`;
    }
    
    // Only include essential address information, no attachments
    if (clone.address1) {
      cleanExport.address = clone.address1;
    }
    
    if (clone.city) {
      cleanExport.city = clone.city;
    }
    
    if (clone.postalCode) {
      cleanExport.postalCode = clone.postalCode;
    }
    
    return cleanExport;
  } catch (error) {
    console.error('Error formatting user for export:', error);
    // Return a minimal safe version if formatting fails
    return {
      id: user.id,
      username: user.username || '',
      name: user.name || ''
    };
  }
}

/**
 * Format a transaction object for export, removing admin-specific data
 */
export function formatTransactionForExport(transaction: any) {
  // Deep clone to avoid modifying the original
  const clone = JSON.parse(JSON.stringify(transaction));
  
  try {
    // Create a clean export object with only the essential fields
    const cleanExport: any = {
      id: clone.id,
      type: clone.type ? formatEnumValue(clone.type) : '',
      createdAt: clone.createdAt ? formatDate(clone.createdAt) : '',
      description: clone.description || '',
    };
    
    // Format amount and add sign indicator
    if (clone.amount !== undefined) {
      const isDeposit = clone.type === 'Deposit' || clone.type === TransactionType.DEPOSIT;
      cleanExport.formattedAmount = `${isDeposit ? '+' : '-'}$${Math.abs(clone.amount / 100).toFixed(2)}`;
      cleanExport.amount = (clone.amount / 100).toFixed(2);
    }
    
    // Format related shipment ID if exists
    if (clone.relatedShipmentId) {
      cleanExport.formattedShipmentId = `SHIP-${String(clone.relatedShipmentId).padStart(6, '0')}`;
      cleanExport.relatedShipmentId = clone.relatedShipmentId;
    }
    
    return cleanExport;
  } catch (error) {
    console.error('Error formatting transaction for export:', error);
    // Return a minimal safe version if formatting fails
    return {
      id: transaction.id,
      type: transaction.type || '',
      createdAt: transaction.createdAt || ''
    };
  }
}

/**
 * Helper function to format enum values for better readability
 */
function formatEnumValue(value: string): string {
  if (!value) return '';
  
  // Handle various enum types
  switch (value) {
    // ShipmentStatus
    case ShipmentStatus.PENDING:
      return 'Pending';
    case ShipmentStatus.APPROVED:
      return 'Approved';
    case ShipmentStatus.REJECTED:
      return 'Rejected';
    case ShipmentStatus.IN_TRANSIT:
      return 'In Transit';
    case ShipmentStatus.DELIVERED:
      return 'Delivered';
      
    // ServiceLevel
    case ServiceLevel.STANDARD:
      return 'Standard';
    case ServiceLevel.EXPRESS:
      return 'Express';
    case ServiceLevel.PRIORITY:
      return 'Priority';
      
    // TransactionType
    case TransactionType.DEPOSIT:
      return 'Deposit';
    case TransactionType.PURCHASE:
      return 'Purchase';
    case TransactionType.REFUND:
      return 'Refund';
      
    default:
      // Convert snake_case or kebab-case to Title Case
      return value
        .replace(/_|-/g, ' ')
        .split(' ')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join(' ');
  }
}