/**
 * Utility functions for HS code handling
 * Provides consistent truncation and formatting for tax calculations
 */

/**
 * Truncates an HS code to 8 digits for tax calculation
 * Our tax system can only handle up to 8 digits
 * @param hsCode - The full HS code (can be 6, 8, 10, 12 digits with or without dots)
 * @returns The truncated 8-digit HS code without formatting
 */
export function truncateHSCodeForTax(hsCode: string | null | undefined): string {
  if (!hsCode) return '';
  
  // Remove all non-digit characters (dots, spaces, etc.)
  const cleanCode = hsCode.replace(/\D/g, '');
  
  // If the code is less than or equal to 8 digits, return as is
  if (cleanCode.length <= 8) {
    return cleanCode;
  }
  
  // Truncate to first 8 digits
  const truncated = cleanCode.substring(0, 8);
  
  console.log(`[HS Code] Truncated from ${cleanCode.length} digits (${cleanCode}) to 8 digits (${truncated}) for tax calculation`);
  
  return truncated;
}

/**
 * Formats an HS code for display (adds dots)
 * @param hsCode - The HS code without formatting
 * @returns Formatted HS code (e.g., "1234.56.78" or "1234.56.78.90")
 */
export function formatHSCodeForDisplay(hsCode: string | null | undefined): string {
  if (!hsCode) return '';
  
  // Remove all non-digit characters
  const digits = hsCode.replace(/\D/g, '');
  
  // Apply formatting based on length
  if (digits.length <= 4) {
    return digits;
  } else if (digits.length <= 6) {
    return `${digits.slice(0, 4)}.${digits.slice(4)}`;
  } else if (digits.length <= 8) {
    return `${digits.slice(0, 4)}.${digits.slice(4, 6)}.${digits.slice(6)}`;
  } else if (digits.length <= 10) {
    return `${digits.slice(0, 4)}.${digits.slice(4, 6)}.${digits.slice(6, 8)}.${digits.slice(8)}`;
  } else {
    // For codes longer than 10 digits
    return `${digits.slice(0, 4)}.${digits.slice(4, 6)}.${digits.slice(6, 8)}.${digits.slice(8, 10)}.${digits.slice(10)}`;
  }
}

/**
 * Checks if an HS code was truncated for tax calculation
 * @param originalCode - The original HS code
 * @returns True if the code will be truncated for tax calculation
 */
export function isHSCodeTruncated(originalCode: string | null | undefined): boolean {
  if (!originalCode) return false;
  const cleanCode = originalCode.replace(/\D/g, '');
  return cleanCode.length > 8;
}

/**
 * Gets the chapter (first 2 digits) from an HS code
 * @param hsCode - The HS code
 * @returns The chapter code (first 2 digits)
 */
export function getHSCodeChapter(hsCode: string | null | undefined): string {
  if (!hsCode) return '';
  const cleanCode = hsCode.replace(/\D/g, '');
  return cleanCode.substring(0, 2);
}

/**
 * Gets the heading (first 4 digits) from an HS code
 * @param hsCode - The HS code
 * @returns The heading code (first 4 digits)
 */
export function getHSCodeHeading(hsCode: string | null | undefined): string {
  if (!hsCode) return '';
  const cleanCode = hsCode.replace(/\D/g, '');
  return cleanCode.substring(0, 4);
}

/**
 * Validates if an HS code has a valid format
 * @param hsCode - The HS code to validate
 * @returns True if valid, false otherwise
 */
export function isValidHSCode(hsCode: string | null | undefined): boolean {
  if (!hsCode) return false;
  const cleanCode = hsCode.replace(/\D/g, '');
  // HS codes should be at least 6 digits and contain only numbers
  return cleanCode.length >= 6 && /^\d+$/.test(cleanCode);
}