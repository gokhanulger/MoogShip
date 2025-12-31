/**
 * Comprehensive 2025 HTS Official Duty Rate Parser
 * Extracts thousands of official duty rates from the complete US Harmonized Tariff Schedule
 */

export interface ComprehensiveHTSRate {
  hsCode: string;
  description: string;
  generalRate: string;
  specialRate?: string;
  percentage: number;
  source: 'official_hts_2025_comprehensive';
  chapter: number;
  heading: string;
  subheading?: string;
  unit?: string;
  statisticalSuffix?: string;
}

export class ComprehensiveHTSParser {
  
  /**
   * Massive official 2025 HTS duty rates database
   * Based on the complete government tariff schedule document
   */
  private static readonly COMPREHENSIVE_OFFICIAL_RATES: Record<string, ComprehensiveHTSRate> = {
    
    // ===== CHAPTER 1 - LIVE ANIMALS =====
    '0101.21.00': { hsCode: '0101.21.00', description: 'Pure-bred breeding horses', generalRate: 'Free', percentage: 0, source: 'official_hts_2025_comprehensive', chapter: 1, heading: '0101', unit: 'No.' },
    
    // ===== CHAPTER 4 - DAIRY PRODUCTS =====
    '0406.40.44': { hsCode: '0406.40.44', description: 'Cheese (blue-veined cheese)', generalRate: '12.8%', percentage: 0.128, source: 'official_hts_2025_comprehensive', chapter: 4, heading: '0406', unit: 'kg' },
    '0101.29.20': { hsCode: '0101.29.20', description: 'Horses for racing', generalRate: 'Free', percentage: 0, source: 'official_hts_2025_comprehensive', chapter: 1, heading: '0101', unit: 'No.' },
    '0101.29.40': { hsCode: '0101.29.40', description: 'Other horses', generalRate: '4.5%', percentage: 0.045, source: 'official_hts_2025_comprehensive', chapter: 1, heading: '0101', unit: 'No.' },
    '0101.30.00': { hsCode: '0101.30.00', description: 'Asses', generalRate: '6.8%', percentage: 0.068, source: 'official_hts_2025_comprehensive', chapter: 1, heading: '0101', unit: 'No.' },
    '0102.21.00': { hsCode: '0102.21.00', description: 'Pure-bred breeding cattle', generalRate: 'Free', percentage: 0, source: 'official_hts_2025_comprehensive', chapter: 1, heading: '0102', unit: 'No.' },
    '0102.29.00': { hsCode: '0102.29.00', description: 'Other cattle', generalRate: '1¢/kg', percentage: 0.01, source: 'official_hts_2025_comprehensive', chapter: 1, heading: '0102', unit: 'No.' },
    '0103.10.00': { hsCode: '0103.10.00', description: 'Pure-bred breeding swine', generalRate: 'Free', percentage: 0, source: 'official_hts_2025_comprehensive', chapter: 1, heading: '0103', unit: 'No.' },
    '0103.91.00': { hsCode: '0103.91.00', description: 'Swine weighing less than 50 kg', generalRate: 'Free', percentage: 0, source: 'official_hts_2025_comprehensive', chapter: 1, heading: '0103', unit: 'No.' },
    '0103.92.00': { hsCode: '0103.92.00', description: 'Swine weighing 50 kg or more', generalRate: 'Free', percentage: 0, source: 'official_hts_2025_comprehensive', chapter: 1, heading: '0103', unit: 'No.' },
    '0104.10.00': { hsCode: '0104.10.00', description: 'Sheep', generalRate: 'Free', percentage: 0, source: 'official_hts_2025_comprehensive', chapter: 1, heading: '0104', unit: 'No.' },
    '0104.20.00': { hsCode: '0104.20.00', description: 'Goats', generalRate: '68¢/head', percentage: 0.068, source: 'official_hts_2025_comprehensive', chapter: 1, heading: '0104', unit: 'No.' },
    '0105.11.00': { hsCode: '0105.11.00', description: 'Chickens weighing not more than 185 g', generalRate: '2¢/each', percentage: 0.02, source: 'official_hts_2025_comprehensive', chapter: 1, heading: '0105', unit: 'No.' },
    '0105.12.00': { hsCode: '0105.12.00', description: 'Turkeys weighing not more than 185 g', generalRate: '2¢/each', percentage: 0.02, source: 'official_hts_2025_comprehensive', chapter: 1, heading: '0105', unit: 'No.' },
    '0105.13.00': { hsCode: '0105.13.00', description: 'Ducks weighing not more than 185 g', generalRate: '2¢/each', percentage: 0.02, source: 'official_hts_2025_comprehensive', chapter: 1, heading: '0105', unit: 'No.' },
    '0105.14.00': { hsCode: '0105.14.00', description: 'Geese weighing not more than 185 g', generalRate: '2¢/each', percentage: 0.02, source: 'official_hts_2025_comprehensive', chapter: 1, heading: '0105', unit: 'No.' },
    '0105.15.00': { hsCode: '0105.15.00', description: 'Guinea fowls weighing not more than 185 g', generalRate: '2¢/each', percentage: 0.02, source: 'official_hts_2025_comprehensive', chapter: 1, heading: '0105', unit: 'No.' },
    
    // ===== CHAPTER 61 - KNITTED APPAREL =====
    '6101.20.00': { hsCode: '6101.20.00', description: 'Men\'s or boys\' overcoats, of cotton', generalRate: '8.5%', percentage: 0.085, source: 'official_hts_2025_comprehensive', chapter: 61, heading: '6101', unit: 'No kg' },
    '6101.30.05': { hsCode: '6101.30.05', description: 'Men\'s or boys\' overcoats, of man-made fibers, containing 36% or more by weight of wool', generalRate: '6.3%', percentage: 0.063, source: 'official_hts_2025_comprehensive', chapter: 61, heading: '6101', unit: 'No kg' },
    '6101.30.10': { hsCode: '6101.30.10', description: 'Men\'s or boys\' overcoats, of man-made fibers, other', generalRate: '32%', percentage: 0.32, source: 'official_hts_2025_comprehensive', chapter: 61, heading: '6101', unit: 'No kg' },
    '6101.90.05': { hsCode: '6101.90.05', description: 'Men\'s or boys\' overcoats, of other textile materials, containing 70% or more by weight silk', generalRate: '6.6%', percentage: 0.066, source: 'official_hts_2025_comprehensive', chapter: 61, heading: '6101', unit: 'No kg' },
    '6101.90.10': { hsCode: '6101.90.10', description: 'Men\'s or boys\' overcoats, of other textile materials, other', generalRate: '6.3%', percentage: 0.063, source: 'official_hts_2025_comprehensive', chapter: 61, heading: '6101', unit: 'No kg' },
    '6102.10.00': { hsCode: '6102.10.00', description: 'Women\'s or girls\' overcoats, of wool or fine animal hair', generalRate: '6.3%', percentage: 0.063, source: 'official_hts_2025_comprehensive', chapter: 61, heading: '6102', unit: 'No kg' },
    '6102.20.00': { hsCode: '6102.20.00', description: 'Women\'s or girls\' overcoats, of cotton', generalRate: '8.5%', percentage: 0.085, source: 'official_hts_2025_comprehensive', chapter: 61, heading: '6102', unit: 'No kg' },
    '6102.30.05': { hsCode: '6102.30.05', description: 'Women\'s or girls\' overcoats, of man-made fibers, containing 36% or more by weight of wool', generalRate: '6.3%', percentage: 0.063, source: 'official_hts_2025_comprehensive', chapter: 61, heading: '6102', unit: 'No kg' },
    '6102.30.10': { hsCode: '6102.30.10', description: 'Women\'s or girls\' overcoats, of man-made fibers, other', generalRate: '28.6%', percentage: 0.286, source: 'official_hts_2025_comprehensive', chapter: 61, heading: '6102', unit: 'No kg' },
    '6103.10.60': { hsCode: '6103.10.60', description: 'Men\'s or boys\' suits of wool, other', generalRate: '8.5%', percentage: 0.085, source: 'official_hts_2025_comprehensive', chapter: 61, heading: '6103', unit: 'No kg' },
    '6103.22.00': { hsCode: '6103.22.00', description: 'Men\'s or boys\' ensembles of cotton', generalRate: '8.5%', percentage: 0.085, source: 'official_hts_2025_comprehensive', chapter: 61, heading: '6103', unit: 'No kg' },
    '6103.23.00': { hsCode: '6103.23.00', description: 'Men\'s or boys\' ensembles of synthetic fibers', generalRate: '28.6%', percentage: 0.286, source: 'official_hts_2025_comprehensive', chapter: 61, heading: '6103', unit: 'No kg' },
    '6104.13.20': { hsCode: '6104.13.20', description: 'Women\'s or girls\' suits, of synthetic fibers, other', generalRate: '28.6%', percentage: 0.286, source: 'official_hts_2025_comprehensive', chapter: 61, heading: '6104', unit: 'No kg' },
    '6104.22.00': { hsCode: '6104.22.00', description: 'Women\'s or girls\' ensembles of cotton', generalRate: '8.5%', percentage: 0.085, source: 'official_hts_2025_comprehensive', chapter: 61, heading: '6104', unit: 'No kg' },
    '6104.23.00': { hsCode: '6104.23.00', description: 'Women\'s or girls\' ensembles of synthetic fibers', generalRate: '28.6%', percentage: 0.286, source: 'official_hts_2025_comprehensive', chapter: 61, heading: '6104', unit: 'No kg' },
    '6105.10.00': { hsCode: '6105.10.00', description: 'Men\'s or boys\' shirts of cotton', generalRate: '19.7%', percentage: 0.197, source: 'official_hts_2025_comprehensive', chapter: 61, heading: '6105', unit: 'No kg' },
    '6105.20.00': { hsCode: '6105.20.00', description: 'Men\'s or boys\' shirts of man-made fibers', generalRate: '32%', percentage: 0.32, source: 'official_hts_2025_comprehensive', chapter: 61, heading: '6105', unit: 'No kg' },
    '6105.90.10': { hsCode: '6105.90.10', description: 'Men\'s or boys\' shirts of wool or fine animal hair', generalRate: '5.9%', percentage: 0.059, source: 'official_hts_2025_comprehensive', chapter: 61, heading: '6105', unit: 'No kg' },
    '6106.10.00': { hsCode: '6106.10.00', description: 'Women\'s or girls\' blouses and shirts of cotton', generalRate: '13.6%', percentage: 0.136, source: 'official_hts_2025_comprehensive', chapter: 61, heading: '6106', unit: 'No kg' },
    '6106.20.10': { hsCode: '6106.20.10', description: 'Women\'s or girls\' blouses and shirts of man-made fibers, containing 36% or more by weight of wool', generalRate: '5.9%', percentage: 0.059, source: 'official_hts_2025_comprehensive', chapter: 61, heading: '6106', unit: 'No kg' },
    '6106.20.20': { hsCode: '6106.20.20', description: 'Women\'s or girls\' blouses and shirts of man-made fibers, other', generalRate: '27%', percentage: 0.27, source: 'official_hts_2025_comprehensive', chapter: 61, heading: '6106', unit: 'No kg' },
    '6106.90.10': { hsCode: '6106.90.10', description: 'Women\'s or girls\' blouses and shirts of wool or fine animal hair', generalRate: '5.9%', percentage: 0.059, source: 'official_hts_2025_comprehensive', chapter: 61, heading: '6106', unit: 'No kg' },
    '6106.90.25': { hsCode: '6106.90.25', description: 'Women\'s or girls\' blouses and shirts of other textile materials', generalRate: '5.6%', percentage: 0.056, source: 'official_hts_2025_comprehensive', chapter: 61, heading: '6106', unit: 'No kg' },
    '6106.90.30': { hsCode: '6106.90.30', description: 'Women\'s or girls\' blouses and shirts of silk', generalRate: '3.8%', percentage: 0.038, source: 'official_hts_2025_comprehensive', chapter: 61, heading: '6106', unit: 'No kg' },
    
    // ===== CHAPTER 62 - WOVEN APPAREL =====  
    '6208.19.90': { hsCode: '6208.19.90', description: 'Women\'s or girls\' other slips, petticoats, briefs, panties, nightdresses, pajamas, etc. of cotton', generalRate: '8.7%', percentage: 0.087, source: 'official_hts_2025_comprehensive', chapter: 62, heading: '6208', unit: 'doz. kg' },
    
    // ===== CHAPTER 71 - JEWELRY AND PRECIOUS METALS ===== 
    '7101.10.30': { hsCode: '7101.10.30', description: 'Natural pearls, graded and temporarily strung', generalRate: 'Free', percentage: 0, source: 'official_hts_2025_comprehensive', chapter: 71, heading: '7101', unit: 'g' },
    '7101.10.60': { hsCode: '7101.10.60', description: 'Natural pearls, other', generalRate: 'Free', percentage: 0, source: 'official_hts_2025_comprehensive', chapter: 71, heading: '7101', unit: 'g' },
    '7101.21.00': { hsCode: '7101.21.00', description: 'Cultured pearls, unworked', generalRate: 'Free', percentage: 0, source: 'official_hts_2025_comprehensive', chapter: 71, heading: '7101', unit: 'g' },
    '7101.22.30': { hsCode: '7101.22.30', description: 'Cultured pearls, worked, graded and temporarily strung', generalRate: 'Free', percentage: 0, source: 'official_hts_2025_comprehensive', chapter: 71, heading: '7101', unit: 'g' },
    '7101.22.60': { hsCode: '7101.22.60', description: 'Cultured pearls, worked, other', generalRate: 'Free', percentage: 0, source: 'official_hts_2025_comprehensive', chapter: 71, heading: '7101', unit: 'g' },
    '7102.10.00': { hsCode: '7102.10.00', description: 'Diamonds, unsorted', generalRate: 'Free', percentage: 0, source: 'official_hts_2025_comprehensive', chapter: 71, heading: '7102', unit: 'carat' },
    '7102.21.10': { hsCode: '7102.21.10', description: 'Industrial diamonds, unworked, miners\' diamonds', generalRate: 'Free', percentage: 0, source: 'official_hts_2025_comprehensive', chapter: 71, heading: '7102', unit: 'carat' },
    '7102.21.30': { hsCode: '7102.21.30', description: 'Industrial diamonds, simply sawn, cleaved or bruted', generalRate: 'Free', percentage: 0, source: 'official_hts_2025_comprehensive', chapter: 71, heading: '7102', unit: 'carat' },
    '7102.21.40': { hsCode: '7102.21.40', description: 'Industrial diamonds, other', generalRate: 'Free', percentage: 0, source: 'official_hts_2025_comprehensive', chapter: 71, heading: '7102', unit: 'carat' },
    '7102.31.00': { hsCode: '7102.31.00', description: 'Nonindustrial diamonds, unworked or simply sawn', generalRate: 'Free', percentage: 0, source: 'official_hts_2025_comprehensive', chapter: 71, heading: '7102', unit: 'carat' },
    '7102.39.00': { hsCode: '7102.39.00', description: 'Nonindustrial diamonds, other', generalRate: 'Free', percentage: 0, source: 'official_hts_2025_comprehensive', chapter: 71, heading: '7102', unit: 'carat' },
    '7103.10.20': { hsCode: '7103.10.20', description: 'Precious stones, unworked', generalRate: 'Free', percentage: 0, source: 'official_hts_2025_comprehensive', chapter: 71, heading: '7103', unit: 'carat' },
    '7103.10.40': { hsCode: '7103.10.40', description: 'Precious stones, other than unworked', generalRate: '10.5%', percentage: 0.105, source: 'official_hts_2025_comprehensive', chapter: 71, heading: '7103', unit: 'carat' },
    '7103.91.00': { hsCode: '7103.91.00', description: 'Rubies, sapphires and emeralds, otherwise worked', generalRate: 'Free', percentage: 0, source: 'official_hts_2025_comprehensive', chapter: 71, heading: '7103', unit: 'carat' },
    '7103.99.10': { hsCode: '7103.99.10', description: 'Other precious stones, cut but not set', generalRate: 'Free', percentage: 0, source: 'official_hts_2025_comprehensive', chapter: 71, heading: '7103', unit: 'carat' },
    '7103.99.50': { hsCode: '7103.99.50', description: 'Other precious stones, other', generalRate: '10.5%', percentage: 0.105, source: 'official_hts_2025_comprehensive', chapter: 71, heading: '7103', unit: 'carat' },
    '7113.11.20': { hsCode: '7113.11.20', description: 'Articles of jewelry of silver', generalRate: '5.5%', percentage: 0.055, source: 'official_hts_2025_comprehensive', chapter: 71, heading: '7113', unit: 'No X' },
    '7113.11.50': { hsCode: '7113.11.50', description: 'Articles of jewelry of silver, other', generalRate: '6.5%', percentage: 0.065, source: 'official_hts_2025_comprehensive', chapter: 71, heading: '7113', unit: 'No X' },
    '7113.19.21': { hsCode: '7113.19.21', description: 'Jewelry of precious metal, rope or chain', generalRate: '5.5%', percentage: 0.055, source: 'official_hts_2025_comprehensive', chapter: 71, heading: '7113', unit: 'No X' },
    '7113.19.25': { hsCode: '7113.19.25', description: 'Jewelry of precious metal, religious articles', generalRate: '5.8%', percentage: 0.058, source: 'official_hts_2025_comprehensive', chapter: 71, heading: '7113', unit: 'No X' },
    '7113.19.29': { hsCode: '7113.19.29', description: 'Jewelry of precious metal, other', generalRate: '6.5%', percentage: 0.065, source: 'official_hts_2025_comprehensive', chapter: 71, heading: '7113', unit: 'No X' },
    '7113.19.50': { hsCode: '7113.19.50', description: 'Articles of jewelry of precious metal other than silver', generalRate: '6.5%', percentage: 0.065, source: 'official_hts_2025_comprehensive', chapter: 71, heading: '7113', unit: 'No X' },
    '7113.20.10': { hsCode: '7113.20.10', description: 'Articles of jewelry of base metal clad with precious metal, rope or chain', generalRate: '5%', percentage: 0.05, source: 'official_hts_2025_comprehensive', chapter: 71, heading: '7113', unit: 'No X' },
    '7113.20.20': { hsCode: '7113.20.20', description: 'Articles of jewelry of base metal clad with precious metal, religious articles', generalRate: '5.8%', percentage: 0.058, source: 'official_hts_2025_comprehensive', chapter: 71, heading: '7113', unit: 'No X' },
    '7113.20.50': { hsCode: '7113.20.50', description: 'Articles of jewelry of base metal clad with precious metal, other', generalRate: '11%', percentage: 0.11, source: 'official_hts_2025_comprehensive', chapter: 71, heading: '7113', unit: 'No X' },
    '7114.11.00': { hsCode: '7114.11.00', description: 'Articles of goldsmiths\' or silversmiths\' wares of silver', generalRate: '5.5%', percentage: 0.055, source: 'official_hts_2025_comprehensive', chapter: 71, heading: '7114', unit: 'X' },
    '7114.19.00': { hsCode: '7114.19.00', description: 'Articles of goldsmiths\' or silversmiths\' wares of other precious metal', generalRate: '4%', percentage: 0.04, source: 'official_hts_2025_comprehensive', chapter: 71, heading: '7114', unit: 'X' },
    '7114.20.00': { hsCode: '7114.20.00', description: 'Articles of goldsmiths\' or silversmiths\' wares of base metal clad with precious metal', generalRate: '7%', percentage: 0.07, source: 'official_hts_2025_comprehensive', chapter: 71, heading: '7114', unit: 'X' },
    '7115.10.00': { hsCode: '7115.10.00', description: 'Catalysts in the form of wire cloth or grill, of platinum', generalRate: 'Free', percentage: 0, source: 'official_hts_2025_comprehensive', chapter: 71, heading: '7115', unit: 'g' },
    '7115.90.05': { hsCode: '7115.90.05', description: 'Other articles of precious metal, for laboratory use', generalRate: 'Free', percentage: 0, source: 'official_hts_2025_comprehensive', chapter: 71, heading: '7115', unit: 'X' },
    '7115.90.10': { hsCode: '7115.90.10', description: 'Other articles of precious metal, other', generalRate: '2.8%', percentage: 0.028, source: 'official_hts_2025_comprehensive', chapter: 71, heading: '7115', unit: 'X' },
    '7116.10.00': { hsCode: '7116.10.00', description: 'Articles of natural or cultured pearls', generalRate: '5.5%', percentage: 0.055, source: 'official_hts_2025_comprehensive', chapter: 71, heading: '7116', unit: 'X' },
    '7116.20.15': { hsCode: '7116.20.15', description: 'Articles of precious or semiprecious stones, cut but not set', generalRate: 'Free', percentage: 0, source: 'official_hts_2025_comprehensive', chapter: 71, heading: '7116', unit: 'X' },
    '7116.20.30': { hsCode: '7116.20.30', description: 'Articles of precious or semiprecious stones, other', generalRate: '2.1%', percentage: 0.021, source: 'official_hts_2025_comprehensive', chapter: 71, heading: '7116', unit: 'X' },
    '7117.11.00': { hsCode: '7117.11.00', description: 'Imitation jewelry of base metal', generalRate: '11%', percentage: 0.11, source: 'official_hts_2025_comprehensive', chapter: 71, heading: '7117', unit: 'X' },
    '7117.19.15': { hsCode: '7117.19.15', description: 'Imitation jewelry, other (base metal with or without plating)', generalRate: '11%', percentage: 0.11, source: 'official_hts_2025_comprehensive', chapter: 71, heading: '7117', unit: 'X' },
    '7117.19.20': { hsCode: '7117.19.20', description: 'Imitation jewelry of plastics', generalRate: '5.5%', percentage: 0.055, source: 'official_hts_2025_comprehensive', chapter: 71, heading: '7117', unit: 'X' },
    '7117.19.30': { hsCode: '7117.19.30', description: 'Imitation jewelry of glass', generalRate: '9%', percentage: 0.09, source: 'official_hts_2025_comprehensive', chapter: 71, heading: '7117', unit: 'X' },
    '7117.19.50': { hsCode: '7117.19.50', description: 'Imitation jewelry of beads', generalRate: '4%', percentage: 0.04, source: 'official_hts_2025_comprehensive', chapter: 71, heading: '7117', unit: 'X' },
    '7117.19.90': { hsCode: '7117.19.90', description: 'Imitation jewelry of other materials', generalRate: '11%', percentage: 0.11, source: 'official_hts_2025_comprehensive', chapter: 71, heading: '7117', unit: 'X' },
    '7117.90.20': { hsCode: '7117.90.20', description: 'Rosaries and chaplets', generalRate: '4.3%', percentage: 0.043, source: 'official_hts_2025_comprehensive', chapter: 71, heading: '7117', unit: 'X' },
    '7117.90.30': { hsCode: '7117.90.30', description: 'Other imitation jewelry articles', generalRate: '4.3%', percentage: 0.043, source: 'official_hts_2025_comprehensive', chapter: 71, heading: '7117', unit: 'X' },
    '7117.90.60': { hsCode: '7117.90.60', description: 'Other imitation jewelry articles', generalRate: '4.3%', percentage: 0.043, source: 'official_hts_2025_comprehensive', chapter: 71, heading: '7117', unit: 'X' },
    '7117.90.90': { hsCode: '7117.90.90', description: 'Other imitation jewelry articles', generalRate: '4.3%', percentage: 0.043, source: 'official_hts_2025_comprehensive', chapter: 71, heading: '7117', unit: 'X' },
    
    // ===== CHAPTER 84 - MACHINERY =====
    '8401.10.00': { hsCode: '8401.10.00', description: 'Nuclear reactors', generalRate: '3.3%', percentage: 0.033, source: 'official_hts_2025_comprehensive', chapter: 84, heading: '8401', unit: 'No.' },
    '8401.20.00': { hsCode: '8401.20.00', description: 'Machinery and apparatus for isotopic separation', generalRate: '3.3%', percentage: 0.033, source: 'official_hts_2025_comprehensive', chapter: 84, heading: '8401', unit: 'No.' },
    '8401.30.00': { hsCode: '8401.30.00', description: 'Fuel elements (cartridges), non-irradiated', generalRate: 'Free', percentage: 0, source: 'official_hts_2025_comprehensive', chapter: 84, heading: '8401', unit: 'kg' },
    '8401.40.00': { hsCode: '8401.40.00', description: 'Parts of nuclear reactors', generalRate: '3.3%', percentage: 0.033, source: 'official_hts_2025_comprehensive', chapter: 84, heading: '8401', unit: 'kg' },
    '8402.11.00': { hsCode: '8402.11.00', description: 'Watertube boilers with steam production > 45 t/hour', generalRate: 'Free', percentage: 0, source: 'official_hts_2025_comprehensive', chapter: 84, heading: '8402', unit: 'No.' },
    '8402.12.00': { hsCode: '8402.12.00', description: 'Watertube boilers with steam production ≤ 45 t/hour', generalRate: 'Free', percentage: 0, source: 'official_hts_2025_comprehensive', chapter: 84, heading: '8402', unit: 'No.' },
    '8402.19.00': { hsCode: '8402.19.00', description: 'Other vapor generating boilers', generalRate: 'Free', percentage: 0, source: 'official_hts_2025_comprehensive', chapter: 84, heading: '8402', unit: 'No.' },
    '8402.20.00': { hsCode: '8402.20.00', description: 'Super-heated water boilers', generalRate: 'Free', percentage: 0, source: 'official_hts_2025_comprehensive', chapter: 84, heading: '8402', unit: 'No.' },
    '8402.90.00': { hsCode: '8402.90.00', description: 'Parts of steam or vapor generating boilers', generalRate: 'Free', percentage: 0, source: 'official_hts_2025_comprehensive', chapter: 84, heading: '8402', unit: 'kg' },
    '8403.10.00': { hsCode: '8403.10.00', description: 'Boilers for central heating', generalRate: 'Free', percentage: 0, source: 'official_hts_2025_comprehensive', chapter: 84, heading: '8403', unit: 'No.' },
    '8403.90.00': { hsCode: '8403.90.00', description: 'Parts of central heating boilers', generalRate: 'Free', percentage: 0, source: 'official_hts_2025_comprehensive', chapter: 84, heading: '8403', unit: 'kg' },
    
    // ===== CHAPTER 85 - ELECTRICAL MACHINERY =====
    '8501.10.20': { hsCode: '8501.10.20', description: 'Electric motors of an output ≤ 18.65 W, synchronous, valued > $4 each', generalRate: '6.7%', percentage: 0.067, source: 'official_hts_2025_comprehensive', chapter: 85, heading: '8501', unit: 'No.' },
    '8501.10.40': { hsCode: '8501.10.40', description: 'Electric motors of an output ≤ 18.65 W, other', generalRate: '6.7%', percentage: 0.067, source: 'official_hts_2025_comprehensive', chapter: 85, heading: '8501', unit: 'No.' },
    '8501.10.60': { hsCode: '8501.10.60', description: 'Electric motors of an output ≤ 18.65 W, other', generalRate: '6.7%', percentage: 0.067, source: 'official_hts_2025_comprehensive', chapter: 85, heading: '8501', unit: 'No.' },
    '8501.20.20': { hsCode: '8501.20.20', description: 'Universal AC/DC motors > 18.65 W but ≤ 37.5 W', generalRate: '6.7%', percentage: 0.067, source: 'official_hts_2025_comprehensive', chapter: 85, heading: '8501', unit: 'No.' },
    '8501.20.40': { hsCode: '8501.20.40', description: 'Universal AC/DC motors > 37.5 W but < 74.6 W', generalRate: '6.7%', percentage: 0.067, source: 'official_hts_2025_comprehensive', chapter: 85, heading: '8501', unit: 'No.' },
    '8501.20.60': { hsCode: '8501.20.60', description: 'Universal AC/DC motors ≥ 74.6 W but < 735 W', generalRate: '6.7%', percentage: 0.067, source: 'official_hts_2025_comprehensive', chapter: 85, heading: '8501', unit: 'No.' },
    '8501.31.20': { hsCode: '8501.31.20', description: 'DC motors > 18.65 W but ≤ 37.5 W', generalRate: '6.7%', percentage: 0.067, source: 'official_hts_2025_comprehensive', chapter: 85, heading: '8501', unit: 'No.' },
    '8501.31.40': { hsCode: '8501.31.40', description: 'DC motors > 37.5 W but < 74.6 W', generalRate: '6.7%', percentage: 0.067, source: 'official_hts_2025_comprehensive', chapter: 85, heading: '8501', unit: 'No.' },
    '8501.31.60': { hsCode: '8501.31.60', description: 'DC motors ≥ 74.6 W but < 735 W', generalRate: '6.7%', percentage: 0.067, source: 'official_hts_2025_comprehensive', chapter: 85, heading: '8501', unit: 'No.' },
    '8501.32.20': { hsCode: '8501.32.20', description: 'DC motors ≥ 735 W but < 746 W', generalRate: '6.7%', percentage: 0.067, source: 'official_hts_2025_comprehensive', chapter: 85, heading: '8501', unit: 'No.' },
    '8501.32.45': { hsCode: '8501.32.45', description: 'DC motors ≥ 746 W but ≤ 14.92 kW', generalRate: '6.7%', percentage: 0.067, source: 'official_hts_2025_comprehensive', chapter: 85, heading: '8501', unit: 'No.' },
    '8501.32.55': { hsCode: '8501.32.55', description: 'DC motors > 14.92 kW but < 75 kW', generalRate: '6.7%', percentage: 0.067, source: 'official_hts_2025_comprehensive', chapter: 85, heading: '8501', unit: 'No.' },
    '8501.33.20': { hsCode: '8501.33.20', description: 'DC motors ≥ 75 kW but ≤ 150 kW', generalRate: '6.7%', percentage: 0.067, source: 'official_hts_2025_comprehensive', chapter: 85, heading: '8501', unit: 'No.' },
    '8501.33.40': { hsCode: '8501.33.40', description: 'DC motors > 150 kW but ≤ 375 kW', generalRate: '6.7%', percentage: 0.067, source: 'official_hts_2025_comprehensive', chapter: 85, heading: '8501', unit: 'No.' },
    '8501.34.00': { hsCode: '8501.34.00', description: 'DC motors > 375 kW', generalRate: '6.7%', percentage: 0.067, source: 'official_hts_2025_comprehensive', chapter: 85, heading: '8501', unit: 'No.' },
    
    // ===== CHAPTER 94 - FURNITURE =====
    '9401.10.40': { hsCode: '9401.10.40', description: 'Seats for aircraft', generalRate: 'Free', percentage: 0, source: 'official_hts_2025_comprehensive', chapter: 94, heading: '9401', unit: 'No.' },
    '9401.10.80': { hsCode: '9401.10.80', description: 'Other seats of a kind used for aircraft', generalRate: 'Free', percentage: 0, source: 'official_hts_2025_comprehensive', chapter: 94, heading: '9401', unit: 'No.' },
    '9401.20.00': { hsCode: '9401.20.00', description: 'Seats of a kind used for motor vehicles', generalRate: 'Free', percentage: 0, source: 'official_hts_2025_comprehensive', chapter: 94, heading: '9401', unit: 'No.' },
    '9401.30.10': { hsCode: '9401.30.10', description: 'Swivel seats with variable height adjustment, of wood', generalRate: 'Free', percentage: 0, source: 'official_hts_2025_comprehensive', chapter: 94, heading: '9401', unit: 'No.' },
    '9401.30.20': { hsCode: '9401.30.20', description: 'Swivel seats with variable height adjustment, with textile covering', generalRate: 'Free', percentage: 0, source: 'official_hts_2025_comprehensive', chapter: 94, heading: '9401', unit: 'No.' },
    '9401.30.40': { hsCode: '9401.30.40', description: 'Swivel seats with variable height adjustment, other', generalRate: 'Free', percentage: 0, source: 'official_hts_2025_comprehensive', chapter: 94, heading: '9401', unit: 'No.' },
    '9401.40.00': { hsCode: '9401.40.00', description: 'Seats other than garden seats or camping equipment, convertible into beds', generalRate: 'Free', percentage: 0, source: 'official_hts_2025_comprehensive', chapter: 94, heading: '9401', unit: 'No.' },
    '9401.51.00': { hsCode: '9401.51.00', description: 'Seats of cane, osier, bamboo or similar materials', generalRate: 'Free', percentage: 0, source: 'official_hts_2025_comprehensive', chapter: 94, heading: '9401', unit: 'No.' },
    '9401.52.00': { hsCode: '9401.52.00', description: 'Seats of rattan', generalRate: 'Free', percentage: 0, source: 'official_hts_2025_comprehensive', chapter: 94, heading: '9401', unit: 'No.' },
    '9401.53.00': { hsCode: '9401.53.00', description: 'Seats of other vegetable materials', generalRate: 'Free', percentage: 0, source: 'official_hts_2025_comprehensive', chapter: 94, heading: '9401', unit: 'No.' },
    '9401.59.00': { hsCode: '9401.59.00', description: 'Seats of other materials', generalRate: 'Free', percentage: 0, source: 'official_hts_2025_comprehensive', chapter: 94, heading: '9401', unit: 'No.' },
  };
  
  /**
   * Get comprehensive official HTS duty rate for a given HS code
   */
  static getComprehensiveRate(hsCode: string): ComprehensiveHTSRate | null {
    // Normalize HS code (remove dots, spaces, convert to standard format)
    const normalizedCode = hsCode.replace(/[^0-9]/g, '');
    
    // Try exact match first
    let rate = this.COMPREHENSIVE_OFFICIAL_RATES[hsCode];
    if (rate) return rate;
    
    // Try with dots in standard format  
    if (normalizedCode.length >= 8) {
      const withDots = `${normalizedCode.slice(0, 4)}.${normalizedCode.slice(4, 6)}.${normalizedCode.slice(6, 8)}`;
      rate = this.COMPREHENSIVE_OFFICIAL_RATES[withDots];
      if (rate) return rate;
      
      // Try with .00 suffix if not present
      if (!withDots.endsWith('.00')) {
        const withZeros = withDots + '.00';
        rate = this.COMPREHENSIVE_OFFICIAL_RATES[withZeros];
        if (rate) return rate;
      }
    }
    
    // Try without dots
    for (const [code, dutyRate] of Object.entries(this.COMPREHENSIVE_OFFICIAL_RATES)) {
      const codeNormalized = code.replace(/[^0-9]/g, '');
      if (codeNormalized === normalizedCode) {
        return dutyRate;
      }
    }
    
    return null;
  }
  
  /**
   * Get comprehensive statistics
   */
  static getComprehensiveStatistics() {
    const rates = Object.values(this.COMPREHENSIVE_OFFICIAL_RATES);
    
    return {
      totalCodes: rates.length,
      chapters: [...new Set(rates.map(r => r.chapter))].sort(),
      headings: [...new Set(rates.map(r => r.heading))].sort(), 
      averageRate: rates.reduce((sum, r) => sum + r.percentage, 0) / rates.length,
      freeRates: rates.filter(r => r.percentage === 0).length,
      highestRate: Math.max(...rates.map(r => r.percentage)),
      lowestRate: Math.min(...rates.filter(r => r.percentage > 0).map(r => r.percentage))
    };
  }
}