/**
 * Import prices from CSV to production database via API
 *
 * Usage: node scripts/import-prices-to-production.js
 */

const fs = require('fs');
const path = require('path');

const CSV_FILE = '/Users/gokhanulger/Downloads/navlungo-fiyatlar-1768845033268.csv';
const API_URL = 'https://app.moogship.com/api/external-pricing/prices/batch';
const BATCH_SIZE = 1000; // Send 1000 prices at a time

// Turkish to ISO country code mapping
const COUNTRY_MAP = {
  'ABD': 'US', 'Amerika Birleşik Devletleri': 'US', 'Abd': 'US',
  'Almanya': 'DE', 'Fransa': 'FR', 'İngiltere': 'GB', 'Birleşik Krallık': 'GB',
  'İtalya': 'IT', 'İspanya': 'ES', 'Hollanda': 'NL', 'Belçika': 'BE',
  'Avusturya': 'AT', 'İsviçre': 'CH', 'Polonya': 'PL', 'Çekya': 'CZ',
  'Portekiz': 'PT', 'İrlanda': 'IE', 'Danimarka': 'DK', 'İsveç': 'SE',
  'Norveç': 'NO', 'Finlandiya': 'FI', 'Yunanistan': 'GR', 'Macaristan': 'HU',
  'Romanya': 'RO', 'Bulgaristan': 'BG', 'Hırvatistan': 'HR', 'Slovenya': 'SI',
  'Slovakya': 'SK', 'Estonya': 'EE', 'Letonya': 'LV', 'Litvanya': 'LT',
  'Lüksemburg': 'LU', 'Malta': 'MT', 'Kıbrıs': 'CY', 'Kanada': 'CA',
  'Meksika': 'MX', 'Brezilya': 'BR', 'Arjantin': 'AR', 'Şili': 'CL',
  'Kolombiya': 'CO', 'Peru': 'PE', 'Venezuela': 'VE', 'Ekvador': 'EC',
  'Japonya': 'JP', 'Çin': 'CN', 'Güney Kore': 'KR', 'Kore': 'KR',
  'Hindistan': 'IN', 'Avustralya': 'AU', 'Yeni Zelanda': 'NZ',
  'Singapur': 'SG', 'Hong Kong': 'HK', 'Tayvan': 'TW', 'Malezya': 'MY',
  'Tayland': 'TH', 'Vietnam': 'VN', 'Endonezya': 'ID', 'Filipinler': 'PH',
  'Birleşik Arap Emirlikleri': 'AE', 'BAE': 'AE', 'Suudi Arabistan': 'SA',
  'İsrail': 'IL', 'Türkiye': 'TR', 'Rusya': 'RU', 'Ukrayna': 'UA',
  'Gürcistan': 'GE', 'Azerbaycan': 'AZ', 'Kazakistan': 'KZ',
  'Güney Afrika': 'ZA', 'Mısır': 'EG', 'Fas': 'MA', 'Tunus': 'TN',
  'Kenya': 'KE', 'Nijerya': 'NG', 'Gana': 'GH', 'Pakistan': 'PK',
  'Bangladeş': 'BD', 'Sri Lanka': 'LK', 'Nepal': 'NP',
  'Afganistan': 'AF', 'Arnavutluk': 'AL', 'Cezayir': 'DZ', 'Andorra': 'AD',
  'Angola': 'AO', 'Antigua ve Barbuda': 'AG', 'Ermenistan': 'AM',
  'Bahamalar': 'BS', 'Bahreyn': 'BH', 'Barbados': 'BB', 'Belarus': 'BY',
  'Belize': 'BZ', 'Benin': 'BJ', 'Bermuda': 'BM', 'Bhutan': 'BT',
  'Bolivya': 'BO', 'Bosna Hersek': 'BA', 'Botsvana': 'BW', 'Brunei': 'BN',
  'Burkina Faso': 'BF', 'Burundi': 'BI', 'Kamboçya': 'KH', 'Kamerun': 'CM',
  'Cape Verde': 'CV', 'Yeşil Burun Adaları': 'CV', 'Orta Afrika Cumhuriyeti': 'CF',
  'Çad': 'TD', 'Komorlar': 'KM', 'Kongo': 'CG', 'Kongo Demokratik Cumhuriyeti': 'CD',
  'Kosta Rika': 'CR', 'Fildişi Sahili': 'CI', 'Küba': 'CU', 'Cibuti': 'DJ',
  'Dominika': 'DM', 'Dominik Cumhuriyeti': 'DO', 'Doğu Timor': 'TL',
  'El Salvador': 'SV', 'Ekvator Ginesi': 'GQ', 'Eritre': 'ER', 'Etiyopya': 'ET',
  'Fiji': 'FJ', 'Gabon': 'GA', 'Gambiya': 'GM', 'Grenada': 'GD',
  'Guatemala': 'GT', 'Gine': 'GN', 'Gine-Bissau': 'GW', 'Guyana': 'GY',
  'Haiti': 'HT', 'Honduras': 'HN', 'İzlanda': 'IS', 'Irak': 'IQ', 'İran': 'IR',
  'Jamaika': 'JM', 'Ürdün': 'JO', 'Kırgızistan': 'KG', 'Kuveyt': 'KW',
  'Laos': 'LA', 'Lübnan': 'LB', 'Lesotho': 'LS', 'Liberya': 'LR', 'Libya': 'LY',
  'Liechtenstein': 'LI', 'Kuzey Makedonya': 'MK', 'Makedonya': 'MK',
  'Madagaskar': 'MG', 'Malavi': 'MW', 'Maldivler': 'MV', 'Mali': 'ML',
  'Mauritanya': 'MR', 'Mauritius': 'MU', 'Moldovya': 'MD', 'Moldova': 'MD',
  'Monako': 'MC', 'Moğolistan': 'MN', 'Karadağ': 'ME', 'Mozambik': 'MZ',
  'Myanmar': 'MM', 'Burma': 'MM', 'Namibya': 'NA', 'Nauru': 'NR',
  'Nikaragua': 'NI', 'Nijer': 'NE', 'Kuzey Kore': 'KP', 'Umman': 'OM',
  'Panama': 'PA', 'Papua Yeni Gine': 'PG', 'Paraguay': 'PY', 'Katar': 'QA',
  'Ruanda': 'RW', 'Saint Kitts ve Nevis': 'KN', 'Saint Lucia': 'LC',
  'Saint Vincent ve Grenadinler': 'VC', 'Samoa': 'WS', 'San Marino': 'SM',
  'São Tomé ve Príncipe': 'ST', 'Senegal': 'SN', 'Sırbistan': 'RS',
  'Seyşeller': 'SC', 'Sierra Leone': 'SL', 'Solomon Adaları': 'SB',
  'Somali': 'SO', 'Güney Sudan': 'SS', 'Sudan': 'SD', 'Surinam': 'SR',
  'Esvati̇ni̇': 'SZ', 'Svaziland': 'SZ', 'Suriye': 'SY', 'Tacikistan': 'TJ',
  'Tanzanya': 'TZ', 'Togo': 'TG', 'Tonga': 'TO', 'Trinidad ve Tobago': 'TT',
  'Türkmenistan': 'TM', 'Tuvalu': 'TV', 'Uganda': 'UG', 'Uruguay': 'UY',
  'Özbekistan': 'UZ', 'Vanuatu': 'VU', 'Vatikan': 'VA', 'Yemen': 'YE',
  'Zambiya': 'ZM', 'Zimbabve': 'ZW', 'Filistin': 'PS', 'Kosova': 'XK',
  'Güney Kıbrıs': 'CY', 'Kuzey Kıbrıs': 'CY', 'Aruba': 'AW', 'Curaçao': 'CW',
  'Guadeloupe': 'GP', 'Martinique': 'MQ', 'Réunion': 'RE', 'Porto Riko': 'PR',
  'Guam': 'GU', 'Amerika Samoası': 'AS', 'Kayman Adaları': 'KY',
  'Virgin Adaları (ABD)': 'VI', 'Virgin Adaları (İngiliz)': 'VG',
  'Falkland Adaları': 'FK', 'Faroe Adaları': 'FO', 'Grönland': 'GL',
  'Cebelitarık': 'GI', 'Makao': 'MO', 'Yeni Kaledonya': 'NC',
  'Fransız Polinezyası': 'PF', 'Montserrat': 'MS', 'Sint Maarten': 'SX',
  'Turks ve Caicos Adaları': 'TC', 'Anguilla': 'AI'
};

function getCountryCode(countryName) {
  // Direct match
  if (COUNTRY_MAP[countryName]) {
    return COUNTRY_MAP[countryName];
  }

  // Try normalized (lowercase, trimmed)
  const normalized = countryName.trim();
  for (const [name, code] of Object.entries(COUNTRY_MAP)) {
    if (name.toLowerCase() === normalized.toLowerCase()) {
      return code;
    }
  }

  // If it's already a 2-letter code
  if (countryName.length === 2 && /^[A-Z]{2}$/.test(countryName.toUpperCase())) {
    return countryName.toUpperCase();
  }

  return null;
}

function parseCSV(content) {
  const lines = content.split('\n');
  const header = lines[0];
  const prices = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    // Parse CSV line with quotes
    const match = line.match(/^"?([^"]*)"?,([^,]+),"?([^"]*)"?,"?([^"]*)"?,([^,]+),"?([^"]*)"?,"?([^"]*)"?$/);
    if (!match) {
      // Try simpler pattern
      const parts = line.split(',');
      if (parts.length >= 6) {
        const country = parts[0].replace(/"/g, '').trim();
        const weight = parseFloat(parts[1]);
        const carrier = parts[2].replace(/"/g, '').trim();
        const service = parts[3].replace(/"/g, '').trim();
        const price = parseFloat(parts[4]);
        const currency = parts[5].replace(/"/g, '').trim();
        const transitDays = parts[6] ? parts[6].replace(/"/g, '').trim() : '';

        const countryCode = getCountryCode(country);
        if (countryCode && !isNaN(weight) && !isNaN(price)) {
          prices.push({
            country: countryCode,
            countryName: country,
            weight,
            carrier,
            service: service || 'Standard',
            price,
            currency,
            transitDays: transitDays || null
          });
        }
      }
      continue;
    }

    const [, country, weightStr, carrier, service, priceStr, currency, transitDays] = match;
    const weight = parseFloat(weightStr);
    const price = parseFloat(priceStr);
    const countryCode = getCountryCode(country);

    if (countryCode && !isNaN(weight) && !isNaN(price)) {
      prices.push({
        country: countryCode,
        countryName: country,
        weight,
        carrier,
        service: service || 'Standard',
        price,
        currency,
        transitDays: transitDays || null
      });
    }
  }

  return prices;
}

async function sendBatch(prices, batchNum) {
  console.log(`Sending batch ${batchNum} with ${prices.length} prices...`);

  const response = await fetch(API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      prices,
      source: 'csv-import'
    })
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`API error: ${response.status} - ${text}`);
  }

  const result = await response.json();
  console.log(`Batch ${batchNum} result:`, result);
  return result;
}

async function main() {
  console.log('Reading CSV file...');
  const content = fs.readFileSync(CSV_FILE, 'utf-8');

  console.log('Parsing prices...');
  const prices = parseCSV(content);
  console.log(`Parsed ${prices.length} prices`);

  if (prices.length === 0) {
    console.error('No valid prices found in CSV');
    process.exit(1);
  }

  // Show sample
  console.log('Sample prices:', prices.slice(0, 3));

  // Send in batches
  const totalBatches = Math.ceil(prices.length / BATCH_SIZE);
  console.log(`Sending ${totalBatches} batches of ${BATCH_SIZE} prices each...`);

  for (let i = 0; i < totalBatches; i++) {
    const start = i * BATCH_SIZE;
    const end = Math.min(start + BATCH_SIZE, prices.length);
    const batch = prices.slice(start, end);

    try {
      await sendBatch(batch, i + 1);
      console.log(`Progress: ${end}/${prices.length} prices sent`);
    } catch (error) {
      console.error(`Error sending batch ${i + 1}:`, error.message);
      // Continue with next batch
    }

    // Small delay between batches
    if (i < totalBatches - 1) {
      await new Promise(r => setTimeout(r, 500));
    }
  }

  console.log('Done! All prices sent to production API.');
  console.log('Go to https://app.moogship.com/admin-fiyat-yonetimi and approve the batches.');
}

main().catch(console.error);
