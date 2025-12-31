/**
 * GTIP (Harmonized System) code validation utilities
 * Provides validation and formatting for HS/GTIP codes used in customs declarations
 */

export interface GTIPValidationResult {
  isValid: boolean;
  cleaned: string;
  message?: string;
  severity?: 'info' | 'warning' | 'error';
}

/**
 * Validates and cleans GTIP/HS code input
 * @param input - Raw GTIP code input
 * @returns Validation result with cleaned code and status
 */
export function validateGTIP(input: string): GTIPValidationResult {
  if (!input || typeof input !== 'string') {
    return {
      isValid: false,
      cleaned: '',
      message: 'GTIP code is required',
      severity: 'error'
    };
  }

  // Remove all non-alphanumeric characters
  const cleaned = input.replace(/[^a-zA-Z0-9]/g, '');

  if (cleaned.length === 0) {
    return {
      isValid: false,
      cleaned: '',
      message: 'GTIP code cannot be empty',
      severity: 'error'
    };
  }

  // Check if it's too short
  if (cleaned.length < 6) {
    return {
      isValid: false,
      cleaned,
      message: 'GTIP code must be at least 6 characters',
      severity: 'error'
    };
  }

  // Check if it's too long
  if (cleaned.length > 15) {
    return {
      isValid: false,
      cleaned: cleaned.substring(0, 15),
      message: 'GTIP code cannot exceed 15 characters',
      severity: 'error'
    };
  }

  // Valid length range (6-15 characters)
  if (cleaned.length >= 6 && cleaned.length <= 15) {
    return {
      isValid: true,
      cleaned,
      message: `Valid GTIP code (${cleaned.length} characters)`,
      severity: 'info'
    };
  }

  return {
    isValid: false,
    cleaned,
    message: 'Invalid GTIP code format',
    severity: 'error'
  };
}

/**
 * Formats GTIP code with standard punctuation for display
 * @param gtip - Cleaned GTIP code
 * @returns Formatted GTIP code with dots
 */
export function formatGTIPForDisplay(gtip: string): string {
  if (!gtip || gtip.length < 6) return gtip;

  // Standard HS code format: XXXX.XX.XX or longer variations
  if (gtip.length >= 8) {
    return `${gtip.substring(0, 4)}.${gtip.substring(4, 6)}.${gtip.substring(6)}`;
  } else if (gtip.length >= 6) {
    return `${gtip.substring(0, 4)}.${gtip.substring(4)}`;
  }

  return gtip;
}

/**
 * Auto-corrects common GTIP code issues
 * @param input - Raw GTIP input
 * @returns Corrected GTIP code
 */
export function autoCorrectGTIP(input: string): string {
  const validation = validateGTIP(input);
  let corrected = validation.cleaned;

  // If too short, pad with zeros to reach minimum viable length (10 digits)
  if (corrected.length > 0 && corrected.length < 10) {
    corrected = corrected.padEnd(10, '0');
  }

  return corrected;
}

/**
 * Gets GTIP validation status color for UI styling
 * @param validation - GTIP validation result
 * @returns CSS class name for styling
 */
export function getGTIPValidationColor(validation: GTIPValidationResult): string {
  switch (validation.severity) {
    case 'info':
      return 'text-green-600 border-green-300';
    case 'warning':
      return 'text-yellow-600 border-yellow-300';
    case 'error':
      return 'text-red-600 border-red-300';
    default:
      return 'text-gray-600 border-gray-300';
  }
}