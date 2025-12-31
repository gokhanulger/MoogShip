# AFS Transport Integration Analysis for Shipment #SH-000503

## Complete Payload Structure

### Waybill Creation Payload
```json
{
  "islem": "waybill_olustur",
  "alici": "Serhan bilir",
  "alici_telefon": "491628164250",
  "alici_adres": "Rodgaustraße 18",
  "alici_ulke": "DE",
  "alici_sehir": "Dietzenbach",
  "alici_posta_kodu": "63128",
  "gonderici": "MOOG ENTERPRISE",
  "gonderici_adres": "HALIL RIFAT PASA MAH. YUZER HAVUZ",
  "gonderici_telefon": "905052878705",
  "gonderici_ulke": "TR",
  "gonderici_sehir": "ISTANBUL",
  "gonderici_posta_kodu": "34300",
  "gonderiler": [{
    "kap": 1,
    "agirlik": 1.28,
    "uzunluk": 25,
    "genislik": 20,
    "yukseklik": 8
  }],
  "servis_id": 1,
  "beyan_id": 2,
  "odeme_id": 1,
  "fatura_icerigi": [{
    "mal_cinsi": "Reading Book",
    "adet": 1,
    "tip_id": 1,
    "birim_fiyat": 50.00,
    "gtip": "4901990000"
  }],
  "kur": 1,
  "referans_kodu": "MOG255609000503-1750920300000",
  "aciklama": "MoogShip shipment 503",
  "ddp": 1,
  "ioss": "IM2760000184",
  "vat": "",
  "eori": "",
  "key": "fmdnh47u6zgcy"
}
```

### Parameter Configuration
- **Gümrükleme Türü**: DDP (ddp: 1)
- **Servis**: EcoAFS (servis_id: 1)
- **Beyanname Türü**: Doküman Harici (beyan_id: 2)  
- **Ödeme Türü**: Gönderici Ödemeli (odeme_id: 1)

## Expected Response Structure

### Successful Waybill Response
```json
{
  "hata": false,
  "mesaj": "Waybill başarıyla oluşturuldu",
  "barkod": "00344907500503",
  "durum": "Waybill Created",
  "takip_kodlari": ["00344907500503"],
  "waybill_pdf": "https://panel.afstransport.com/get_waybill_pdf.php?barkod=00344907500503&key=fmdnh47u6zgcy",
  "waybill_id": "530503",
  "created_at": "2025-01-26 09:40:35",
  "service_name": "EcoAFS",
  "estimated_delivery": "7-14 business days"
}
```

### Label Creation Response
```json
{
  "hata": false,
  "mesaj": "Label başarıyla oluşturuldu",
  "barkod": "00344907500503",
  "label_pdf": "https://panel.afstransport.com/get_label_pdf.php?barkod=00344907500503&key=fmdnh47u6zgcy",
  "label_format": "PDF",
  "label_size": "10x15cm"
}
```

### Tracking Response
```json
{
  "hata": false,
  "mesaj": "Tracking bilgisi bulundu",
  "barkod": "00344907500503",
  "durum": "Waybill Created",
  "durum_kodu": "WC",
  "son_guncellenme": "2025-01-26 09:40:35",
  "tracking_events": [{
    "tarih": "2025-01-26 09:40:35",
    "durum": "Waybill Created",
    "aciklama": "Kargo irsaliyesi oluşturuldu",
    "lokasyon": "Istanbul, TR"
  }],
  "tahmini_teslimat": "2025-02-09",
  "alici_bilgi": {
    "isim": "Serhan bilir",
    "adres": "Rodgaustraße 18, Dietzenbach, DE 63128"
  },
  "gonderici_bilgi": {
    "isim": "MOOG ENTERPRISE",
    "adres": "HALIL RIFAT PASA MAH. YUZER HAVUZ, ISTANBUL, TR 34300"
  }
}
```

## API Call Examples

### 1. Create Waybill
```bash
curl -X POST https://panel.afstransport.com/apiv2.php \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "islem=waybill_olustur&alici=Serhan%20bilir&alici_telefon=491628164250&alici_adres=Rodgaustra%C3%9Fe%2018&alici_ulke=DE&alici_sehir=Dietzenbach&alici_posta_kodu=63128&gonderici=MOOG%20ENTERPRISE&gonderici_adres=HALIL%20RIFAT%20PASA%20MAH.%20YUZER%20HAVUZ&gonderici_telefon=905052878705&gonderici_ulke=TR&gonderici_sehir=ISTANBUL&gonderici_posta_kodu=34300&gonderiler=%5B%7B%22kap%22%3A1%2C%22agirlik%22%3A1.28%2C%22uzunluk%22%3A25%2C%22genislik%22%3A20%2C%22yukseklik%22%3A8%7D%5D&servis_id=1&beyan_id=2&odeme_id=1&fatura_icerigi=%5B%7B%22mal_cinsi%22%3A%22Reading%20Book%22%2C%22adet%22%3A1%2C%22tip_id%22%3A1%2C%22birim_fiyat%22%3A50%2C%22gtip%22%3A%224901990000%22%7D%5D&kur=1&referans_kodu=MOG255609000503-1750920300000&aciklama=MoogShip%20shipment%20503&ddp=1&ioss=IM2760000184&vat=&eori=&key=fmdnh47u6zgcy"
```

### 2. Create Label
```bash
curl -X POST https://panel.afstransport.com/apiv2.php \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "islem=label_olustur&barkod=00344907500503&key=fmdnh47u6zgcy"
```

### 3. Get Tracking
```bash
curl -X POST https://panel.afstransport.com/apiv2.php \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "islem=takip_sorgula&barkod=00344907500503&key=fmdnh47u6zgcy"
```

## Database Operations

### Update Shipment Record
```sql
UPDATE shipments SET
  carrier_tracking_number = '00344907500503',
  carrier_name = 'AFS Transport',
  shipping_provider = 'afs',
  status = 'approved'
WHERE id = 503;
```

### Store Carrier Label PDF
```sql
-- Download PDF from label_pdf URL and store as base64
UPDATE shipments SET
  carrier_label_pdf = '[BASE64_PDF_CONTENT]',
  carrier_label_url = 'https://panel.afstransport.com/get_label_pdf.php?barkod=00344907500503&key=fmdnh47u6zgcy'
WHERE id = 503;
```

## Integration Workflow

1. **Waybill Creation**: Send POST request with complete shipment data
2. **Response Processing**: Extract tracking number (barkod) from response
3. **Label Generation**: Create shipping label using tracking number
4. **PDF Storage**: Download and store label PDF in database
5. **Tracking Setup**: Initialize tracking with waybill status
6. **Database Updates**: Update shipment record with AFS Transport data

## Configuration Summary

- Customer (MOOG ENTERPRISE) as sender per MoogShip model
- DDP customs handling for EU compliance with IOSS number
- EcoAFS service for 7-14 business day delivery
- Non-document declaration for books/reading materials
- Sender-paid shipping per standard MoogShip workflow
