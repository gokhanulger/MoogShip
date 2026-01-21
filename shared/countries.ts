/**
 * Comprehensive country and state mapping system
 * Handles both full country names and ISO country codes
 */

// European Union countries and UK (for MoogShip GLS Eco service availability)
export const EUROPE_AND_UK_COUNTRIES = [
  'AT', 'BE', 'BG', 'HR', 'CY', 'CZ', 'DK', 'EE', 'FI', 'FR', 'DE', 'GR', 'HU', 'IE', 
  'IT', 'LV', 'LT', 'LU', 'MT', 'NL', 'PL', 'PT', 'RO', 'SK', 'SI', 'ES', 'SE', 'GB',
  'NO', 'CH', 'IS', 'LI', 'MC', 'SM', 'VA', 'AD', 'MD', 'ME', 'MK', 'AL', 'RS', 'BA'
];

/**
 * Check if a country is eligible for MoogShip GLS Eco service
 * @param countryCode - ISO country code
 * @returns boolean indicating if MoogShip GLS Eco is available
 */
export function isEuropeOrUK(countryCode: string): boolean {
  const normalizedCode = normalizeCountryCode(countryCode);
  return EUROPE_AND_UK_COUNTRIES.includes(normalizedCode);
}

export interface Country {
  code: string;
  name: string;
  hasStates: boolean;
  defaultState?: string;
}

export interface StateProvince {
  code: string;
  name: string;
  countryCode: string;
}

// Comprehensive country mapping
export const COUNTRIES: Country[] = [
  // Major countries with states/provinces
  { code: "US", name: "United States", hasStates: true, defaultState: "NY" },
  { code: "CA", name: "Canada", hasStates: true, defaultState: "ON" },
  { code: "AU", name: "Australia", hasStates: true, defaultState: "NSW" },
  { code: "BR", name: "Brazil", hasStates: true, defaultState: "SP" },
  { code: "IN", name: "India", hasStates: true, defaultState: "DL" },
  { code: "MX", name: "Mexico", hasStates: true, defaultState: "CMX" },
  
  // Major countries without states (use empty string)
  { code: "GB", name: "United Kingdom", hasStates: false },
  { code: "DE", name: "Germany", hasStates: false },
  { code: "FR", name: "France", hasStates: false },
  { code: "IT", name: "Italy", hasStates: false },
  { code: "ES", name: "Spain", hasStates: false },
  { code: "JP", name: "Japan", hasStates: false },
  { code: "CN", name: "China", hasStates: false },
  { code: "RU", name: "Russia", hasStates: false },
  { code: "KR", name: "South Korea", hasStates: false },
  
  // European countries
  { code: "NL", name: "Netherlands", hasStates: false },
  { code: "BE", name: "Belgium", hasStates: false },
  { code: "CH", name: "Switzerland", hasStates: false },
  { code: "AT", name: "Austria", hasStates: false },
  { code: "SE", name: "Sweden", hasStates: false },
  { code: "NO", name: "Norway", hasStates: false },
  { code: "DK", name: "Denmark", hasStates: false },
  { code: "FI", name: "Finland", hasStates: false },
  { code: "IE", name: "Ireland", hasStates: false },
  { code: "PT", name: "Portugal", hasStates: false },
  { code: "GR", name: "Greece", hasStates: false },
  { code: "PL", name: "Poland", hasStates: false },
  { code: "CZ", name: "Czech Republic", hasStates: false },
  { code: "HU", name: "Hungary", hasStates: false },
  { code: "RO", name: "Romania", hasStates: false },
  { code: "BG", name: "Bulgaria", hasStates: false },
  { code: "HR", name: "Croatia", hasStates: false },
  { code: "RS", name: "Serbia", hasStates: false },
  { code: "UA", name: "Ukraine", hasStates: false },
  { code: "TR", name: "Turkey", hasStates: false },
  
  // Middle East and Africa
  { code: "BH", name: "Bahrain", hasStates: false },
  { code: "AE", name: "United Arab Emirates", hasStates: false },
  { code: "SA", name: "Saudi Arabia", hasStates: false },
  { code: "IL", name: "Israel", hasStates: false },
  { code: "EG", name: "Egypt", hasStates: false },
  { code: "ZA", name: "South Africa", hasStates: false },
  { code: "NG", name: "Nigeria", hasStates: false },
  { code: "KE", name: "Kenya", hasStates: false },
  
  // Asia Pacific
  { code: "SG", name: "Singapore", hasStates: false },
  { code: "MY", name: "Malaysia", hasStates: false },
  { code: "TH", name: "Thailand", hasStates: false },
  { code: "ID", name: "Indonesia", hasStates: false },
  { code: "PH", name: "Philippines", hasStates: false },
  { code: "VN", name: "Vietnam", hasStates: false },
  { code: "KH", name: "Cambodia", hasStates: false },
  { code: "LA", name: "Laos", hasStates: false },
  { code: "MM", name: "Myanmar", hasStates: false },
  { code: "BN", name: "Brunei", hasStates: false },
  { code: "NZ", name: "New Zealand", hasStates: false },
  
  // Latin America
  { code: "AR", name: "Argentina", hasStates: false },
  { code: "CL", name: "Chile", hasStates: false },
  { code: "CO", name: "Colombia", hasStates: false },
  { code: "PE", name: "Peru", hasStates: false },
  { code: "VE", name: "Venezuela", hasStates: false },
  { code: "UY", name: "Uruguay", hasStates: false },
  { code: "PY", name: "Paraguay", hasStates: false },
  { code: "BO", name: "Bolivia", hasStates: false },
  { code: "EC", name: "Ecuador", hasStates: false },
  { code: "CR", name: "Costa Rica", hasStates: false },
  { code: "PA", name: "Panama", hasStates: false },
  { code: "GT", name: "Guatemala", hasStates: false },
  { code: "HN", name: "Honduras", hasStates: false },
  { code: "SV", name: "El Salvador", hasStates: false },
  { code: "NI", name: "Nicaragua", hasStates: false },
  { code: "BZ", name: "Belize", hasStates: false },
  { code: "CU", name: "Cuba", hasStates: false },
  { code: "DO", name: "Dominican Republic", hasStates: false },
  { code: "JM", name: "Jamaica", hasStates: false },
  { code: "TT", name: "Trinidad and Tobago", hasStates: false },
  { code: "BB", name: "Barbados", hasStates: false },

  // Additional European countries
  { code: "IS", name: "Iceland", hasStates: false },
  { code: "LU", name: "Luxembourg", hasStates: false },
  { code: "MT", name: "Malta", hasStates: false },
  { code: "CY", name: "Cyprus", hasStates: false },
  { code: "EE", name: "Estonia", hasStates: false },
  { code: "LV", name: "Latvia", hasStates: false },
  { code: "LT", name: "Lithuania", hasStates: false },
  { code: "SK", name: "Slovakia", hasStates: false },
  { code: "SI", name: "Slovenia", hasStates: false },
  { code: "MK", name: "North Macedonia", hasStates: false },
  { code: "BA", name: "Bosnia and Herzegovina", hasStates: false },
  { code: "ME", name: "Montenegro", hasStates: false },
  { code: "AL", name: "Albania", hasStates: false },
  { code: "MD", name: "Moldova", hasStates: false },
  { code: "BY", name: "Belarus", hasStates: false },

  // Additional Asian countries
  { code: "AF", name: "Afghanistan", hasStates: false },
  { code: "BD", name: "Bangladesh", hasStates: false },
  { code: "BT", name: "Bhutan", hasStates: false },
  { code: "MV", name: "Maldives", hasStates: false },
  { code: "NP", name: "Nepal", hasStates: false },
  { code: "LK", name: "Sri Lanka", hasStates: false },
  { code: "MN", name: "Mongolia", hasStates: false },
  { code: "KZ", name: "Kazakhstan", hasStates: false },
  { code: "KG", name: "Kyrgyzstan", hasStates: false },
  { code: "TJ", name: "Tajikistan", hasStates: false },
  { code: "TM", name: "Turkmenistan", hasStates: false },
  { code: "UZ", name: "Uzbekistan", hasStates: false },

  // Additional Middle East and Africa
  { code: "JO", name: "Jordan", hasStates: false },
  { code: "LB", name: "Lebanon", hasStates: false },
  { code: "SY", name: "Syria", hasStates: false },
  { code: "IQ", name: "Iraq", hasStates: false },
  { code: "IR", name: "Iran", hasStates: false },
  { code: "KW", name: "Kuwait", hasStates: false },
  { code: "OM", name: "Oman", hasStates: false },
  { code: "QA", name: "Qatar", hasStates: false },
  { code: "YE", name: "Yemen", hasStates: false },
  { code: "AM", name: "Armenia", hasStates: false },
  { code: "AZ", name: "Azerbaijan", hasStates: false },
  { code: "GE", name: "Georgia", hasStates: false },
  
  // African countries
  { code: "DZ", name: "Algeria", hasStates: false },
  { code: "AO", name: "Angola", hasStates: false },
  { code: "BJ", name: "Benin", hasStates: false },
  { code: "BW", name: "Botswana", hasStates: false },
  { code: "BF", name: "Burkina Faso", hasStates: false },
  { code: "BI", name: "Burundi", hasStates: false },
  { code: "CM", name: "Cameroon", hasStates: false },
  { code: "CV", name: "Cape Verde", hasStates: false },
  { code: "CF", name: "Central African Republic", hasStates: false },
  { code: "TD", name: "Chad", hasStates: false },
  { code: "KM", name: "Comoros", hasStates: false },
  { code: "CG", name: "Congo", hasStates: false },
  { code: "CD", name: "Democratic Republic of the Congo", hasStates: false },
  { code: "CI", name: "Côte d'Ivoire", hasStates: false },
  { code: "DJ", name: "Djibouti", hasStates: false },
  { code: "GQ", name: "Equatorial Guinea", hasStates: false },
  { code: "ER", name: "Eritrea", hasStates: false },
  { code: "ET", name: "Ethiopia", hasStates: false },
  { code: "GA", name: "Gabon", hasStates: false },
  { code: "GM", name: "Gambia", hasStates: false },
  { code: "GH", name: "Ghana", hasStates: false },
  { code: "GN", name: "Guinea", hasStates: false },
  { code: "GW", name: "Guinea-Bissau", hasStates: false },
  { code: "LR", name: "Liberia", hasStates: false },
  { code: "LY", name: "Libya", hasStates: false },
  { code: "MG", name: "Madagascar", hasStates: false },
  { code: "MW", name: "Malawi", hasStates: false },
  { code: "ML", name: "Mali", hasStates: false },
  { code: "MR", name: "Mauritania", hasStates: false },
  { code: "MU", name: "Mauritius", hasStates: false },
  { code: "MA", name: "Morocco", hasStates: false },
  { code: "MZ", name: "Mozambique", hasStates: false },
  { code: "NA", name: "Namibia", hasStates: false },
  { code: "NE", name: "Niger", hasStates: false },
  { code: "RW", name: "Rwanda", hasStates: false },
  { code: "ST", name: "São Tomé and Príncipe", hasStates: false },
  { code: "SN", name: "Senegal", hasStates: false },
  { code: "SC", name: "Seychelles", hasStates: false },
  { code: "SL", name: "Sierra Leone", hasStates: false },
  { code: "SO", name: "Somalia", hasStates: false },
  { code: "SS", name: "South Sudan", hasStates: false },
  { code: "SD", name: "Sudan", hasStates: false },
  { code: "SZ", name: "Eswatini", hasStates: false },
  { code: "TZ", name: "Tanzania", hasStates: false },
  { code: "TG", name: "Togo", hasStates: false },
  { code: "TN", name: "Tunisia", hasStates: false },
  { code: "UG", name: "Uganda", hasStates: false },
  { code: "ZM", name: "Zambia", hasStates: false },
  { code: "ZW", name: "Zimbabwe", hasStates: false },

  // Oceania
  { code: "FJ", name: "Fiji", hasStates: false },
  { code: "PG", name: "Papua New Guinea", hasStates: false },
  { code: "SB", name: "Solomon Islands", hasStates: false },
  { code: "VU", name: "Vanuatu", hasStates: false },
  { code: "WS", name: "Samoa", hasStates: false },
  { code: "TO", name: "Tonga", hasStates: false },
  { code: "TV", name: "Tuvalu", hasStates: false },
  { code: "KI", name: "Kiribati", hasStates: false },
  { code: "NR", name: "Nauru", hasStates: false },
  { code: "PW", name: "Palau", hasStates: false },
  { code: "MH", name: "Marshall Islands", hasStates: false },
  { code: "FM", name: "Micronesia", hasStates: false },
];

/**
 * Convert country name to country code for form compatibility
 * Used when bulk upload data contains full country names instead of codes
 */
export function convertCountryNameToCode(countryInput: string): string {
  if (!countryInput) return "";
  
  // If it's already a valid country code, return it
  const existingCountry = COUNTRIES.find(country => country.code === countryInput);
  if (existingCountry) {
    return countryInput;
  }
  
  // Try to find by exact name match first
  const directMatch = NAME_TO_CODE_MAP[countryInput];
  if (directMatch) {
    return directMatch;
  }
  
  // Try case-insensitive match
  const lowerInput = countryInput.toLowerCase();
  for (const [name, code] of Object.entries(NAME_TO_CODE_MAP)) {
    if (name.toLowerCase() === lowerInput) {
      return code;
    }
  }
  
  // Try partial match for common variations
  for (const [name, code] of Object.entries(NAME_TO_CODE_MAP)) {
    if (name.toLowerCase().includes(lowerInput) || lowerInput.includes(name.toLowerCase())) {
      return code;
    }
  }
  
  // If no match found, return the original input
  console.warn(`No country code mapping found for: "${countryInput}"`);
  return countryInput;
}

// Name to code mapping for normalization
export const NAME_TO_CODE_MAP: { [key: string]: string } = {
  // US variations
  "United States": "US",
  "USA": "US",
  "United States of America": "US",
  "US": "US",
  "Amerika Birlesik Devletleri": "US",
  "Amerika Birleşik Devletleri": "US",

  // Turkish country names (Navlungo)
  "Filistin": "PS",
  "Almanya": "DE",
  "Fransa": "FR",
  "Italya": "IT",
  "İtalya": "IT",
  "Ispanya": "ES",
  "İspanya": "ES",
  "Hollanda": "NL",
  "Belcika": "BE",
  "Belçika": "BE",
  "Isvicre": "CH",
  "İsviçre": "CH",
  "Avusturya": "AT",
  "Isvec": "SE",
  "İsveç": "SE",
  "Norvec": "NO",
  "Norveç": "NO",
  "Danimarka": "DK",
  "Finlandiya": "FI",
  "Irlanda": "IE",
  "İrlanda": "IE",
  "Portekiz": "PT",
  "Yunanistan": "GR",
  "Polonya": "PL",
  "Cek Cumhuriyeti": "CZ",
  "Çek Cumhuriyeti": "CZ",
  "Macaristan": "HU",
  "Romanya": "RO",
  "Bulgaristan": "BG",
  "Hirvatistan": "HR",
  "Hırvatistan": "HR",
  "Sirbistan": "RS",
  "Sırbistan": "RS",
  "Ukrayna": "UA",
  "Turkiye": "TR",
  "Türkiye": "TR",
  "Rusya": "RU",
  "Cin": "CN",
  "Çin": "CN",
  "Japonya": "JP",
  "Guney Kore": "KR",
  "Güney Kore": "KR",
  "Hindistan": "IN",
  "Brezilya": "BR",
  "Meksika": "MX",
  "Kanada": "CA",
  "Avustralya": "AU",
  "Yeni Zelanda": "NZ",
  "Guney Afrika": "ZA",
  "Güney Afrika": "ZA",
  "Misir": "EG",
  "Mısır": "EG",
  "Suudi Arabistan": "SA",
  "Birlesik Arap Emirlikleri": "AE",
  "Birleşik Arap Emirlikleri": "AE",
  "Israil": "IL",
  "İsrail": "IL",
  "Lubnan": "LB",
  "Lübnan": "LB",
  "Urdun": "JO",
  "Ürdün": "JO",
  "Irak": "IQ",
  "Irak": "IQ",
  "Iran": "IR",
  "İran": "IR",
  "Kuveyt": "KW",
  "Katar": "QA",
  "Umman": "OM",
  "Bahreyn": "BH",
  "Yemen": "YE",
  "Afganistan": "AF",
  "Pakistan": "PK",
  "Banglades": "BD",
  "Bangladeş": "BD",
  "Sri Lanka": "LK",
  "Nepal": "NP",
  "Singapur": "SG",
  "Malezya": "MY",
  "Tayland": "TH",
  "Endonezya": "ID",
  "Filipinler": "PH",
  "Vietnam": "VN",
  "Arjantin": "AR",
  "Sili": "CL",
  "Şili": "CL",
  "Kolombiya": "CO",
  "Peru": "PE",
  "Venezuela": "VE",
  "Ekvador": "EC",
  "Bolivya": "BO",
  "Paraguay": "PY",
  "Uruguay": "UY",
  "Kosta Rika": "CR",
  "Panama": "PA",
  "Küba": "CU",
  "Dominik Cumhuriyeti": "DO",
  "Jamaika": "JM",
  "Izlanda": "IS",
  "İzlanda": "IS",
  "Luksemburg": "LU",
  "Lüksemburg": "LU",
  "Malta": "MT",
  "Kibris": "CY",
  "Kıbrıs": "CY",
  "Estonya": "EE",
  "Letonya": "LV",
  "Litvanya": "LT",
  "Slovakya": "SK",
  "Slovenya": "SI",
  "Kuzey Makedonya": "MK",
  "Makedonya": "MK",
  "Bosna Hersek": "BA",
  "Karadag": "ME",
  "Karadağ": "ME",
  "Arnavutluk": "AL",
  "Moldova": "MD",
  "Belarus": "BY",
  "Gurcistan": "GE",
  "Gürcistan": "GE",
  "Ermenistan": "AM",
  "Azerbaycan": "AZ",
  "Kazakistan": "KZ",
  "Ozbekistan": "UZ",
  "Özbekistan": "UZ",
  "Turkmenistan": "TM",
  "Türkmenistan": "TM",
  "Kirgizistan": "KG",
  "Kırgızistan": "KG",
  "Tacikistan": "TJ",
  "Mogolistan": "MN",
  "Moğolistan": "MN",
  "Cezayir": "DZ",
  "Fas": "MA",
  "Tunus": "TN",
  "Libya": "LY",
  "Sudan": "SD",
  "Etiyopya": "ET",
  "Kenya": "KE",
  "Nijerya": "NG",
  "Gana": "GH",
  "Senegal": "SN",
  "Fildisi Sahili": "CI",
  "Fildişi Sahili": "CI",
  "Kamerun": "CM",
  "Tanzanya": "TZ",
  "Uganda": "UG",
  "Zambiya": "ZM",
  "Zimbabve": "ZW",
  "Mozambik": "MZ",
  "Angola": "AO",
  "Namibya": "NA",
  "Botsvana": "BW",
  "Amerika Kucuk Out. Adalari": "UM",
  "Amerika Küçük Out. Adaları": "UM",
  
  // UK variations
  "United Kingdom": "GB",
  "UK": "GB",
  "Great Britain": "GB",
  "GB": "GB",
  
  // Other common variations
  "Germany": "DE",
  "France": "FR",
  "Italy": "IT",
  "Spain": "ES",
  "Netherlands": "NL",
  "The Netherlands": "NL",
  "Japan": "JP",
  "China": "CN",
  "Canada": "CA",
  "Australia": "AU",
  "Brazil": "BR",
  "Mexico": "MX",
  "India": "IN",
  "Russia": "RU",
  "South Korea": "KR",
  "Belgium": "BE",
  "Switzerland": "CH",
  "Austria": "AT",
  "Sweden": "SE",
  "Norway": "NO",
  "Denmark": "DK",
  "Finland": "FI",
  "Ireland": "IE",
  "Portugal": "PT",
  "Greece": "GR",
  "Poland": "PL",
  "Czech Republic": "CZ",
  "Hungary": "HU",
  "Romania": "RO",
  "Bulgaria": "BG",
  "Croatia": "HR",
  "Serbia": "RS",
  "Ukraine": "UA",
  "Turkey": "TR",
  "Bahrain": "BH",
  "United Arab Emirates": "AE",
  "UAE": "AE",
  "Saudi Arabia": "SA",
  "Israel": "IL",
  "Egypt": "EG",
  "South Africa": "ZA",
  "Nigeria": "NG",
  "Kenya": "KE",
  "Singapore": "SG",
  "Malaysia": "MY",
  "Thailand": "TH",
  "Indonesia": "ID",
  "Philippines": "PH",
  "Vietnam": "VN",
  "Cambodia": "KH",
  "Laos": "LA",
  "Myanmar": "MM",
  "Brunei": "BN",
  "New Zealand": "NZ",
  "Argentina": "AR",
  "Chile": "CL",
  "Colombia": "CO",
  "Peru": "PE",
  "Venezuela": "VE",
  "Uruguay": "UY",
  "Paraguay": "PY",
  "Bolivia": "BO",
  "Ecuador": "EC",
  "Costa Rica": "CR",
  "Panama": "PA",
  "Guatemala": "GT",
  "Honduras": "HN",
  "El Salvador": "SV",
  "Nicaragua": "NI",
  "Belize": "BZ",
  "Cuba": "CU",
  "Dominican Republic": "DO",
  "Jamaica": "JM",
  "Trinidad and Tobago": "TT",
  "Barbados": "BB",
  "Iceland": "IS",
  "Luxembourg": "LU",
  "Malta": "MT",
  "Cyprus": "CY",
  "Estonia": "EE",
  "Latvia": "LV",
  "Lithuania": "LT",
  "Slovakia": "SK",
  "Slovenia": "SI",
  "North Macedonia": "MK",
  "Bosnia and Herzegovina": "BA",
  "Montenegro": "ME",
  "Albania": "AL",
  "Moldova": "MD",
  "Belarus": "BY",
  "Afghanistan": "AF",
  "Bangladesh": "BD",
  "Bhutan": "BT",
  "Maldives": "MV",
  "Nepal": "NP",
  "Sri Lanka": "LK",
  "Mongolia": "MN",
  "Kazakhstan": "KZ",
  "Kyrgyzstan": "KG",
  "Tajikistan": "TJ",
  "Turkmenistan": "TM",
  "Uzbekistan": "UZ",
  "Jordan": "JO",
  "Lebanon": "LB",
  "Syria": "SY",
  "Iraq": "IQ",
  "Iran": "IR",
  "Kuwait": "KW",
  "Oman": "OM",
  "Qatar": "QA",
  "Yemen": "YE",
  "Armenia": "AM",
  "Azerbaijan": "AZ",
  "Georgia": "GE",
  "Algeria": "DZ",
  "Angola": "AO",
  "Benin": "BJ",
  "Botswana": "BW",
  "Burkina Faso": "BF",
  "Burundi": "BI",
  "Cameroon": "CM",
  "Cape Verde": "CV",
  "Central African Republic": "CF",
  "Chad": "TD",
  "Comoros": "KM",
  "Congo": "CG",
  "Democratic Republic of the Congo": "CD",
  "Côte d'Ivoire": "CI",
  "Djibouti": "DJ",
  "Equatorial Guinea": "GQ",
  "Eritrea": "ER",
  "Ethiopia": "ET",
  "Gabon": "GA",
  "Gambia": "GM",
  "Ghana": "GH",
  "Guinea": "GN",
  "Guinea-Bissau": "GW",
  "Liberia": "LR",
  "Libya": "LY",
  "Madagascar": "MG",
  "Malawi": "MW",
  "Mali": "ML",
  "Mauritania": "MR",
  "Mauritius": "MU",
  "Morocco": "MA",
  "Mozambique": "MZ",
  "Namibia": "NA",
  "Niger": "NE",
  "Rwanda": "RW",
  "São Tomé and Príncipe": "ST",
  "Senegal": "SN",
  "Seychelles": "SC",
  "Sierra Leone": "SL",
  "Somalia": "SO",
  "South Sudan": "SS",
  "Sudan": "SD",
  "Eswatini": "SZ",
  "Tanzania": "TZ",
  "Togo": "TG",
  "Tunisia": "TN",
  "Uganda": "UG",
  "Zambia": "ZM",
  "Zimbabwe": "ZW",
  "Fiji": "FJ",
  "Papua New Guinea": "PG",
  "Solomon Islands": "SB",
  "Vanuatu": "VU",
  "Samoa": "WS",
  "Tonga": "TO",
  "Tuvalu": "TV",
  "Kiribati": "KI",
  "Nauru": "NR",
  "Palau": "PW",
  "Marshall Islands": "MH",
  "Micronesia": "FM",
};

// US States
export const US_STATES: StateProvince[] = [
  { code: "AL", name: "Alabama", countryCode: "US" },
  { code: "AK", name: "Alaska", countryCode: "US" },
  { code: "AZ", name: "Arizona", countryCode: "US" },
  { code: "AR", name: "Arkansas", countryCode: "US" },
  { code: "CA", name: "California", countryCode: "US" },
  { code: "CO", name: "Colorado", countryCode: "US" },
  { code: "CT", name: "Connecticut", countryCode: "US" },
  { code: "DE", name: "Delaware", countryCode: "US" },
  { code: "FL", name: "Florida", countryCode: "US" },
  { code: "GA", name: "Georgia", countryCode: "US" },
  { code: "HI", name: "Hawaii", countryCode: "US" },
  { code: "ID", name: "Idaho", countryCode: "US" },
  { code: "IL", name: "Illinois", countryCode: "US" },
  { code: "IN", name: "Indiana", countryCode: "US" },
  { code: "IA", name: "Iowa", countryCode: "US" },
  { code: "KS", name: "Kansas", countryCode: "US" },
  { code: "KY", name: "Kentucky", countryCode: "US" },
  { code: "LA", name: "Louisiana", countryCode: "US" },
  { code: "ME", name: "Maine", countryCode: "US" },
  { code: "MD", name: "Maryland", countryCode: "US" },
  { code: "MA", name: "Massachusetts", countryCode: "US" },
  { code: "MI", name: "Michigan", countryCode: "US" },
  { code: "MN", name: "Minnesota", countryCode: "US" },
  { code: "MS", name: "Mississippi", countryCode: "US" },
  { code: "MO", name: "Missouri", countryCode: "US" },
  { code: "MT", name: "Montana", countryCode: "US" },
  { code: "NE", name: "Nebraska", countryCode: "US" },
  { code: "NV", name: "Nevada", countryCode: "US" },
  { code: "NH", name: "New Hampshire", countryCode: "US" },
  { code: "NJ", name: "New Jersey", countryCode: "US" },
  { code: "NM", name: "New Mexico", countryCode: "US" },
  { code: "NY", name: "New York", countryCode: "US" },
  { code: "NC", name: "North Carolina", countryCode: "US" },
  { code: "ND", name: "North Dakota", countryCode: "US" },
  { code: "OH", name: "Ohio", countryCode: "US" },
  { code: "OK", name: "Oklahoma", countryCode: "US" },
  { code: "OR", name: "Oregon", countryCode: "US" },
  { code: "PA", name: "Pennsylvania", countryCode: "US" },
  { code: "RI", name: "Rhode Island", countryCode: "US" },
  { code: "SC", name: "South Carolina", countryCode: "US" },
  { code: "SD", name: "South Dakota", countryCode: "US" },
  { code: "TN", name: "Tennessee", countryCode: "US" },
  { code: "TX", name: "Texas", countryCode: "US" },
  { code: "UT", name: "Utah", countryCode: "US" },
  { code: "VT", name: "Vermont", countryCode: "US" },
  { code: "VA", name: "Virginia", countryCode: "US" },
  { code: "WA", name: "Washington", countryCode: "US" },
  { code: "WV", name: "West Virginia", countryCode: "US" },
  { code: "WI", name: "Wisconsin", countryCode: "US" },
  { code: "WY", name: "Wyoming", countryCode: "US" },
  { code: "DC", name: "District of Columbia", countryCode: "US" },
];

// Canadian Provinces
export const CANADA_PROVINCES: StateProvince[] = [
  { code: "AB", name: "Alberta", countryCode: "CA" },
  { code: "BC", name: "British Columbia", countryCode: "CA" },
  { code: "MB", name: "Manitoba", countryCode: "CA" },
  { code: "NB", name: "New Brunswick", countryCode: "CA" },
  { code: "NL", name: "Newfoundland and Labrador", countryCode: "CA" },
  { code: "NT", name: "Northwest Territories", countryCode: "CA" },
  { code: "NS", name: "Nova Scotia", countryCode: "CA" },
  { code: "NU", name: "Nunavut", countryCode: "CA" },
  { code: "ON", name: "Ontario", countryCode: "CA" },
  { code: "PE", name: "Prince Edward Island", countryCode: "CA" },
  { code: "QC", name: "Quebec", countryCode: "CA" },
  { code: "SK", name: "Saskatchewan", countryCode: "CA" },
  { code: "YT", name: "Yukon", countryCode: "CA" },
];

/**
 * Normalize a country name or code to ISO country code
 */
export function normalizeCountryCode(input: string): string {
  if (!input || typeof input !== 'string') {
    return 'US'; // Default fallback
  }

  const trimmed = input.trim();
  
  if (trimmed === '') {
    return 'US'; // Default fallback for empty string
  }
  
  // If already a valid 2-letter code, return it
  if (trimmed.length === 2) {
    const upperCode = trimmed.toUpperCase();
    const country = COUNTRIES.find(c => c.code === upperCode);
    if (country) {
      return upperCode;
    }
  }
  
  // Look up by name
  const code = NAME_TO_CODE_MAP[trimmed];
  if (code) {
    return code;
  }
  
  // Case-insensitive fallback
  const lowerInput = trimmed.toLowerCase();
  for (const [name, code] of Object.entries(NAME_TO_CODE_MAP)) {
    if (name.toLowerCase() === lowerInput) {
      return code;
    }
  }

  // Partial match fallback
  for (const [name, code] of Object.entries(NAME_TO_CODE_MAP)) {
    if (name.toLowerCase().includes(lowerInput) || lowerInput.includes(name.toLowerCase())) {
      console.log(`[Countries] Partial match: "${trimmed}" → ${code}`);
      return code;
    }
  }

  console.warn(`[Countries] Unknown country: "${trimmed}" - using as-is`);
  return trimmed.substring(0, 2).toUpperCase(); // Return first 2 chars as fallback code
}

/**
 * Get country information by code
 */
export function getCountryInfo(countryCode: string): Country | undefined {
  return COUNTRIES.find(c => c.code === countryCode);
}

/**
 * Check if a country has states/provinces
 */
export function hasStates(countryCode: string): boolean {
  const country = getCountryInfo(countryCode);
  return country?.hasStates ?? false;
}

/**
 * Normalize state/province for a given country
 */
export function normalizeStateCode(countryCode: string, state: string | null | undefined): string {
  if (!state || state.trim() === '') {
    // Use country's default state if it has states, otherwise empty
    const country = getCountryInfo(countryCode);
    return country?.hasStates ? (country.defaultState || '') : '';
  }
  
  const trimmed = state.trim();
  const country = getCountryInfo(countryCode);
  
  if (!country?.hasStates) {
    return ''; // Country doesn't use states
  }
  
  // Return the state as provided for countries with states
  return trimmed;
}

/**
 * Get states/provinces for a country
 */
export function getStatesForCountry(countryCode: string): StateProvince[] {
  switch (countryCode) {
    case 'US':
      return US_STATES;
    case 'CA':
      return CANADA_PROVINCES;
    default:
      return [];
  }
}

/**
 * Format address by replacing colons with dots
 */
export function formatAddressForAPI(address: string): string {
  if (!address) return address;
  return address.replace(/:/g, '.');
}

/**
 * Format city name by converting to uppercase and removing Turkish characters
 */
export function formatCityForAPI(city: string): string {
  if (!city) return city;
  
  // Convert to uppercase and replace Turkish characters
  return city
    .toUpperCase()
    .replace(/Ğ/g, 'G')
    .replace(/Ü/g, 'U')
    .replace(/Ş/g, 'S')
    .replace(/I/g, 'I')
    .replace(/İ/g, 'I')
    .replace(/Ö/g, 'O')
    .replace(/Ç/g, 'C');
}

/**
 * Get default city for a country code
 */
export function getDefaultCityForCountry(countryCode: string): string {
  const defaultCities: { [key: string]: string } = {
    AE: "Dubai",
    US: "New York",
    GB: "London",
    DE: "Berlin",
    FR: "Paris",
    TR: "Istanbul",
    CA: "Toronto",
    AU: "Sydney",
    BR: "São Paulo",
    MX: "Mexico City",
    IN: "Mumbai",
    JP: "Tokyo",
    CN: "Beijing",
    KR: "Seoul",
    SG: "Singapore",
    MY: "Kuala Lumpur",
    TH: "Bangkok",
    ID: "Jakarta",
    PH: "Manila",
    VN: "Ho Chi Minh City",
    SA: "Riyadh",
    EG: "Cairo",
    ZA: "Johannesburg",
    // Add more as needed
  };

  return defaultCities[countryCode] || "Default City";
}