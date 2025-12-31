import { ShipmentStatus } from "@shared/schema";

// Helper function to get status badge color class
export const getStatusBadgeColor = (status: string): string => {
  switch (status) {
    case ShipmentStatus.PENDING:
      return "bg-yellow-100 text-yellow-800";
    case ShipmentStatus.APPROVED:
      return "bg-green-100 text-green-800";
    case ShipmentStatus.REJECTED:
      return "bg-red-100 text-red-800";
    case ShipmentStatus.IN_TRANSIT:
      return "bg-blue-100 text-blue-800";
    case ShipmentStatus.DELIVERED:
      return "bg-green-100 text-green-800";
    default:
      return "bg-gray-100 text-gray-800";
  }
};

// Helper function to format dates
export const formatDate = (dateString: string | Date | null | undefined) => {
  if (!dateString) return 'N/A';
  
  try {
    const date = new Date(dateString);
    
    // Check if date is valid (not Invalid Date)
    if (isNaN(date.getTime())) {
      return 'Invalid date';
    }
    
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    }).format(date);
  } catch (error) {
    console.error('Error formatting date:', error);
    return 'Invalid date';
  }
};

// Helper function to generate a shipment ID display format
export const formatShipmentId = (id: number) => {
  return `#SH-${String(id).padStart(6, '0')}`;
};

// Helper function to generate mock tracking data
export const generateMockTrackingData = (shipmentId: number, status: string) => {
  const events = [];
  const now = new Date();
  
  // Add initial event - package accepted
  events.push({
    timestamp: new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString(),
    status: 'Package accepted by carrier',
    location: 'Istanbul, Turkey'
  });
  
  // If approved or further along, add more events
  if ([ShipmentStatus.APPROVED, ShipmentStatus.IN_TRANSIT, ShipmentStatus.DELIVERED].includes(status as ShipmentStatus)) {
    events.push({
      timestamp: new Date(now.getTime() - 18 * 60 * 60 * 1000).toISOString(),
      status: 'Processed at origin facility',
      location: 'Istanbul, Turkey'
    });
  }
  
  // If in transit or delivered, add transit events
  if ([ShipmentStatus.IN_TRANSIT, ShipmentStatus.DELIVERED].includes(status as ShipmentStatus)) {
    events.push({
      timestamp: new Date(now.getTime() - 12 * 60 * 60 * 1000).toISOString(),
      status: 'In transit',
      location: 'International shipment release'
    });
    
    events.push({
      timestamp: new Date(now.getTime() - 6 * 60 * 60 * 1000).toISOString(),
      status: 'Arrived at destination facility',
      location: 'Berlin, Germany'
    });
  }
  
  // If delivered, add delivery event
  if (status === ShipmentStatus.DELIVERED) {
    events.push({
      timestamp: new Date().toISOString(),
      status: 'Delivered',
      location: 'Berlin, Germany'
    });
  }
  
  return events;
};

// Function to generate a mock label URL
export const generateMockLabelUrl = (trackingNumber: string) => {
  return `https://moogship.com/labels/${trackingNumber}.pdf`;
};

// Helper function to generate a mock tracking number
export const generateMockTrackingNumber = (shipmentId: number) => {
  return `MG${shipmentId.toString().padStart(6, '0')}TK`;
};
