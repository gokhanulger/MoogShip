import { SiWhatsapp } from 'react-icons/si';
import { Mail, Phone, MessageCircle } from 'lucide-react';

export default function SupportPage() {
  const handleWhatsAppContact = () => {
    const phoneNumber = "905407447911";
    const message = "Merhaba, MoogShip hakkında yardım almak istiyorum.";
    window.open(`https://wa.me/${phoneNumber}?text=${encodeURIComponent(message)}`, '_blank');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-white">
      {/* Header */}
      <div className="bg-blue-600 text-white py-16">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h1 className="text-4xl font-bold mb-4">MoogShip Destek</h1>
          <p className="text-xl text-blue-100">Size yardımcı olmak için buradayız</p>
        </div>
      </div>

      {/* Contact Methods */}
      <div className="max-w-4xl mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

          {/* WhatsApp */}
          <div className="bg-white rounded-xl shadow-lg p-6 text-center hover:shadow-xl transition-shadow">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <SiWhatsapp className="w-8 h-8 text-green-600" />
            </div>
            <h3 className="text-xl font-semibold mb-2">WhatsApp</h3>
            <p className="text-gray-600 mb-4">7/24 anlık destek</p>
            <button
              onClick={handleWhatsAppContact}
              className="w-full bg-green-600 text-white py-3 rounded-lg hover:bg-green-700 transition-colors"
            >
              WhatsApp'ta Yaz
            </button>
          </div>

          {/* Email */}
          <div className="bg-white rounded-xl shadow-lg p-6 text-center hover:shadow-xl transition-shadow">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Mail className="w-8 h-8 text-blue-600" />
            </div>
            <h3 className="text-xl font-semibold mb-2">E-posta</h3>
            <p className="text-gray-600 mb-4">Detaylı sorular için</p>
            <a
              href="mailto:info@moogship.com"
              className="block w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 transition-colors"
            >
              E-posta Gönder
            </a>
          </div>

          {/* Phone */}
          <div className="bg-white rounded-xl shadow-lg p-6 text-center hover:shadow-xl transition-shadow">
            <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Phone className="w-8 h-8 text-purple-600" />
            </div>
            <h3 className="text-xl font-semibold mb-2">Telefon</h3>
            <p className="text-gray-600 mb-4">+90 540 744 79 11</p>
            <a
              href="tel:+905407447911"
              className="block w-full bg-purple-600 text-white py-3 rounded-lg hover:bg-purple-700 transition-colors"
            >
              Ara
            </a>
          </div>
        </div>

        {/* FAQ Section */}
        <div className="mt-16">
          <h2 className="text-2xl font-bold text-center mb-8">Sık Sorulan Sorular</h2>

          <div className="space-y-4">
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="font-semibold text-lg mb-2">Kargo göndermek için hesap açmam gerekli mi?</h3>
              <p className="text-gray-600">Evet, güvenli ve takip edilebilir kargo hizmeti için ücretsiz hesap oluşturmanız gerekmektedir.</p>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="font-semibold text-lg mb-2">Hangi ülkelere kargo gönderebilirim?</h3>
              <p className="text-gray-600">MoogShip ile 190'dan fazla ülkeye güvenli kargo gönderimi yapabilirsiniz.</p>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="font-semibold text-lg mb-2">Kargo fiyatları nasıl hesaplanır?</h3>
              <p className="text-gray-600">Fiyatlar paket boyutu, ağırlığı, varış ülkesi ve seçilen hizmet türüne göre hesaplanır.</p>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="font-semibold text-lg mb-2">Paketimi takip edebilir miyim?</h3>
              <p className="text-gray-600">Evet, takip numaranız ile paketinizi gerçek zamanlı olarak takip edebilirsiniz.</p>
            </div>
          </div>
        </div>

        {/* Contact Info */}
        <div className="mt-16 bg-white rounded-xl shadow-lg p-8">
          <h2 className="text-2xl font-bold mb-6 text-center">İletişim Bilgileri</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div>
              <h3 className="font-semibold mb-2">🇹🇷 Türkiye Ofisi</h3>
              <p className="text-gray-600 text-sm">
                HALİL RIFAT PAŞA MAH. YÜZER HAVUZ SK.<br/>
                PERPA TİC MER B BLOK NO: 1/1 İÇ KAPI NO: 159<br/>
                İstanbul, Türkiye 34384<br/>
                +90 540 744 79 11
              </p>
            </div>

            <div>
              <h3 className="font-semibold mb-2">🇺🇸 ABD Ofisi</h3>
              <p className="text-gray-600 text-sm">
                6825 176th Ave NE Ste 135<br/>
                Redmond, WA 98052<br/>
                United States
              </p>
            </div>
          </div>

          <div className="mt-6 text-center">
            <p className="text-gray-600">E-posta: <a href="mailto:info@moogship.com" className="text-blue-600">info@moogship.com</a></p>
          </div>
        </div>

        {/* Back to App */}
        <div className="mt-8 text-center">
          <a
            href="/auth"
            className="inline-block bg-blue-600 text-white px-8 py-3 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Uygulamaya Dön
          </a>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-8 mt-16">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <p className="text-gray-400">&copy; 2025 MoogShip. Tüm hakları saklıdır.</p>
          <div className="mt-4 space-x-4">
            <a href="/privacy" className="text-gray-400 hover:text-white">Gizlilik Politikası</a>
            <a href="/terms" className="text-gray-400 hover:text-white">Kullanım Şartları</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
