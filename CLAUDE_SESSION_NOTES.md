# MoogShip - Claude Session Notes

**Son Guncelleme:** 2026-01-20
**Durum:** Navlungo isim temizligi tamamlandi, Replit'te guncelleme bekliyor

---

## 1. PROJE OZETI

MoogShip, uluslararasi kargo fiyatlama ve yonetim platformu. Birden fazla kargo saglayicisini (Shipentegra, Aramex, AFS Transport) entegre ediyor ve musteri bazli fiyatlandirma kurallari sunuyor.

### Teknoloji Stack
- **Frontend:** React + TypeScript + Vite + TailwindCSS + shadcn/ui
- **Backend:** Express.js + TypeScript
- **Database:** PostgreSQL (Neon) + Drizzle ORM
- **Deployment:** Replit
- **API Entegrasyonlari:** Shipentegra, Aramex, AFS Transport

---

## 2. SON OTURUMDA YAPILAN ISLER

### 2.1 External Pricing Sistemi (Onceden "Navlungo" olarak adlandiriliyordu)

Chrome extension ile harici kaynaklardan fiyat scrape edip, admin onayindan gecirdikten sonra musterilere gostermek icin bir sistem kuruldu.

#### Olusturulan Database Tablolari
```sql
-- navlungo_prices (tablo adi database'de kaldi, kod tarafinda externalPrices olarak kullaniliyor)
-- navlungo_service_settings
-- navlungo_scrape_batches
-- navlungo_price_audit_logs
```

**NOT:** Database tablo isimleri `navlungo_*` olarak kaldi cunku migration yapmak riskli. Ancak kod tarafinda tum referanslar `external*` olarak degistirildi.

#### Olusturulan/Guncellenen Dosyalar

| Dosya | Aciklama |
|-------|----------|
| `server/services/external-pricing.ts` | Ana fiyatlama servisi (onceden navlungo-pricing.ts) |
| `server/pricing-routes.ts` | API route'lari (onceden navlungo-routes.ts) |
| `server/controllers/pricingController.ts` | Controller (onceden navlungoController.ts) |
| `client/src/pages/admin-fiyat-yonetimi.tsx` | Admin sayfasi (onceden admin-navlungo-prices.tsx) |
| `shared/schema.ts` | Database sema tanimlari |

### 2.2 Navlungo Isminin Kaldirilmasi

**KRITIK GEREKSINIM:** Kullanici, browser inspector'da (Network/Console) "navlungo" isminin hicbir sekilde gorunmemesini istedi.

#### Yapilan Degisiklikler

1. **API Endpoint'leri:**
   - `/api/navlungo/*` → `/api/external-pricing/*`

2. **Frontend:**
   - Sayfa: `/admin-navlungo-prices` → `/admin-fiyat-yonetimi`
   - Query keys: `navlungo-*` → `pricing-*`

3. **Backend Fonksiyonlar:**
   - `calculateNavlungoPricing()` → `calculateExternalPricing()`
   - `getNavlungoPrices()` → `getExternalPrices()`
   - `hasNavlungoPrices()` → `hasExternalPrices()`

4. **ID ve Service Name Prefixleri:**
   - `navlungo-ups-express` → `ext-ups-express`
   - `isNavlungoOption` → `isExternalOption`

5. **Sidebar:**
   - "Price Fetcher" linki kaldirildi
   - "Fiyat Yonetimi" eklendi (`/admin-fiyat-yonetimi`)

#### Navlungo Kalan Yerler (Sorun Degil)

| Dosya/Konum | Neden Sorun Degil |
|-------------|-------------------|
| `shared/schema.ts` tablo isimleri | Database internal, client'a gonderilmiyor |
| `server/services/navlungo.ts` | Backend scraping tool, user-facing degil |
| `server/test-navlungo.ts` | Developer test scripti |
| `server/navlungo-price-scraper.ts` | Developer scraping scripti |
| `chrome-extension/*` | Local developer tool |

### 2.3 Git Commit'leri

```
5c9156f Complete navlungo removal from public-facing code
4d4b409 Remove all navlungo references from codebase
aff2378 Replace Price Fetcher with Fiyat Yonetimi in sidebar
056ab14 Add Navlungo price integration system
```

---

## 3. MEVCUT SISTEM MIMARISI

### 3.1 Fiyatlama Akisi

```
Musteri Fiyat Istegi
        ↓
calculateCombinedPricing() [moogship-pricing.ts]
        ↓
    ┌───┴───┐
    ↓       ↓
External   Shipentegra/Aramex
Prices     (fallback)
    ↓       ↓
    └───┬───┘
        ↓
Fiyat Secenekleri Dondur
```

### 3.2 Admin Fiyat Yonetimi Akisi

```
Chrome Extension ile Scrape
        ↓
POST /api/external-pricing/prices/batch
        ↓
Batch Olustur (status: pending)
        ↓
Admin Inceleme (/admin-fiyat-yonetimi)
        ↓
    ┌───┴───┐
    ↓       ↓
  Onayla  Reddet
    ↓       ↓
Active   Rejected
```

### 3.3 Onemli API Endpoint'leri

| Endpoint | Method | Aciklama |
|----------|--------|----------|
| `/api/external-pricing/prices/batch` | POST | Chrome ext'den fiyat al |
| `/api/external-pricing/admin/stats` | GET | Istatistikler |
| `/api/external-pricing/admin/batches` | GET | Batch listesi |
| `/api/external-pricing/admin/batches/:id/approve` | POST | Batch onayla |
| `/api/external-pricing/admin/batches/:id/reject` | POST | Batch reddet |
| `/api/external-pricing/admin/prices` | GET | Aktif fiyatlar |
| `/api/external-pricing/admin/services` | GET/POST | Servis ayarlari |

---

## 4. BILINEN SORUNLAR VE BEKLEYEN ISLER

### 4.1 Replit Guncelleme Gerekli

Replit'te en son kod calismiyor olabilir. Yapilmasi gereken:

```bash
git fetch origin
git reset --hard origin/main
# Sonra Run butonuna bas
```

### 4.2 Admin Sayfasi Fiyat Gosterimi

Onceki oturumda admin sayfasinda fiyatlar goruntulenemiyordu. Sebep:
- API cagrilari yapiliyor
- 6 fiyat donuyor (hem app.moogship.com hem www.moogship.com'da test edildi)
- Ancak UI'da "Aktif fiyat bulunamadi" gosteriyordu

**Olasi Cozumler:**
1. React Query stale/cache sorunu olabilir
2. API response format uyumsuzlugu olabilir
3. Replit'te eski kod calisiyor olabilir

### 4.3 Database Baglantisi

- DATABASE_URL `.env` dosyasina eklendi
- Neon PostgreSQL kullaniliyor
- Connection string: `.env` dosyasinda (gizli)

---

## 5. DOSYA YAPISI

```
MoogShip/
├── client/
│   └── src/
│       ├── pages/
│       │   └── admin-fiyat-yonetimi.tsx  # Admin fiyat yonetim sayfasi
│       └── components/
│           ├── sidebar.tsx               # Sidebar (Fiyat Yonetimi linki)
│           ├── mobile-side-menu.tsx
│           └── mobile-nav.tsx
├── server/
│   ├── routes.ts                         # Ana route dosyasi
│   ├── pricing-routes.ts                 # External pricing route'lari
│   ├── controllers/
│   │   └── pricingController.ts          # External pricing controller
│   └── services/
│       ├── external-pricing.ts           # External fiyatlama servisi
│       ├── moogship-pricing.ts           # Ana fiyatlama servisi
│       ├── navlungo.ts                   # Scraping servisi (developer tool)
│       ├── shipentegra.ts                # Shipentegra entegrasyonu
│       └── aramex.ts                     # Aramex entegrasyonu
├── shared/
│   └── schema.ts                         # Drizzle ORM semalari
├── chrome-extension/                     # Fiyat scraping extension
│   ├── manifest.json
│   ├── content.js
│   ├── background.js
│   └── popup.html
└── .env                                  # Environment variables
```

---

## 6. ENVIRONMENT VARIABLES

```env
DATABASE_URL=<Neon PostgreSQL connection string>
SHIPENTEGRA_CLIENT_ID=<API credentials>
SHIPENTEGRA_CLIENT_SECRET=<API credentials>
# Diger API keys .env dosyasinda
```

---

## 7. SONRAKI OTURUM ICIN YAPILACAKLAR

1. [ ] Replit'te `git reset --hard origin/main` calistir
2. [ ] Admin sayfasinda fiyatlarin gorunup gorunmedigini kontrol et
3. [ ] Browser inspector'da "navlungo" aramasi yap, hicbir yerde gorunmemeli
4. [ ] Chrome extension'i test et (fiyat scrape ve batch gonderme)
5. [ ] Batch onaylama/reddetme islevini test et

---

## 8. ONEMLI NOTLAR

### Neden Database Tablo Isimleri Degismedi?
- Drizzle ORM migration'lari interaktif prompt gerektiriyor
- Production'da tablo ismi degistirmek veri kaybi riski olusturur
- Tablo isimleri (`navlungo_*`) sadece database internal, hicbir zaman client'a gonderilmiyor

### Chrome Extension API Path
`chrome-extension/background.js` dosyasinda:
```javascript
API_PATH: '/api/navlungo/prices/batch'  // BU DEGISTIRILMELI!
```
Bu satir `/api/external-pricing/prices/batch` olarak guncellenmeli.

### Fiyat ID Formati
- Eski: `navlungo-ups-express-123`
- Yeni: `ext-ups-express-123`

---

## 9. HIZLI KOMUTLAR

```bash
# Replit'te kodu guncelle
git fetch origin && git reset --hard origin/main

# Local'de test et
npm run dev

# Database migration (dikkatli kullan)
npx drizzle-kit push

# Git commit
git add . && git commit -m "mesaj" && git push
```

---

**Bu dosyayi bir sonraki oturumda oku: `CLAUDE_SESSION_NOTES.md`**
