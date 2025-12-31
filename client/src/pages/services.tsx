import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Globe, 
  Truck, 
  Shield, 
  Clock, 
  FileText, 
  Package, 
  Calculator,
  Headphones,
  CheckCircle,
  ArrowRight
} from 'lucide-react';
import { SharedMarketingLayout } from '../components/shared-marketing-layout';

export default function ServicesPage() {
  const { i18n } = useTranslation();

  const mainServices = [
    {
      icon: <Globe className="w-8 h-8" />,
      title: i18n.language === 'tr' ? 'Küresel Kargo' : 'Global Shipping',
      description: i18n.language === 'tr' ? '190+ ülkeye güvenli ve hızlı kargo hizmeti' : 'Safe and fast shipping service to 190+ countries',
      features: [
        i18n.language === 'tr' ? 'Express ve ekonomik seçenekler' : 'Express and economy options',
        i18n.language === 'tr' ? 'Kapıdan kapıya teslimat' : 'Door-to-door delivery',
        i18n.language === 'tr' ? 'Gerçek zamanlı takip' : 'Real-time tracking',
        i18n.language === 'tr' ? 'Sigorta ve güvenlik garantisi' : 'Insurance and security guarantee'
      ],
      color: 'blue'
    },
    {
      icon: <FileText className="w-8 h-8" />,
      title: i18n.language === 'tr' ? 'Gümrük İşlemleri' : 'Customs Clearance',
      description: i18n.language === 'tr' ? 'Uluslararası gümrük süreçlerini sizin için yönetiyoruz' : 'We manage international customs processes for you',
      features: [
        i18n.language === 'tr' ? 'Otomatik belge hazırlama' : 'Automatic document preparation',
        i18n.language === 'tr' ? 'Gümrük beyannamesi' : 'Customs declaration',
        i18n.language === 'tr' ? 'Vergi hesaplama' : 'Tax calculation',
        i18n.language === 'tr' ? 'Yasal uyumluluk kontrolü' : 'Legal compliance check'
      ],
      color: 'green'
    },
    {
      icon: <Package className="w-8 h-8" />,
      title: i18n.language === 'tr' ? 'Paketleme Hizmetleri' : 'Packaging Services',
      description: i18n.language === 'tr' ? 'Profesyonel paketleme ve etiketleme' : 'Professional packaging and labeling',
      features: [
        i18n.language === 'tr' ? 'Güvenli paketleme malzemeleri' : 'Safe packaging materials',
        i18n.language === 'tr' ? 'Özel boyut kutu hazırlama' : 'Custom size box preparation',
        i18n.language === 'tr' ? 'Kırılabilir ürün koruması' : 'Fragile product protection',
        i18n.language === 'tr' ? 'Uluslararası standartlara uygun' : 'International standards compliant'
      ],
      color: 'purple'
    },
    {
      icon: <Calculator className="w-8 h-8" />,
      title: i18n.language === 'tr' ? 'Fiyat Hesaplama' : 'Price Calculation',
      description: i18n.language === 'tr' ? 'Anlık ve şeffaf fiyat hesaplama' : 'Instant and transparent price calculation',
      features: [
        i18n.language === 'tr' ? 'Çoklu kargo şirketi karşılaştırması' : 'Multi-carrier comparison',
        i18n.language === 'tr' ? 'Hacimsel ağırlık hesaplama' : 'Volumetric weight calculation',
        i18n.language === 'tr' ? 'Gümrük ücreti tahmini' : 'Customs fee estimation',
        i18n.language === 'tr' ? 'Özel indirim oranları' : 'Special discount rates'
      ],
      color: 'orange'
    }
  ];

  const additionalServices = [
    {
      icon: <Shield className="w-6 h-6" />,
      title: i18n.language === 'tr' ? 'Kargo Sigortası' : 'Shipping Insurance',
      description: i18n.language === 'tr' ? 'Paketinizin güvenliği için kapsamlı sigorta seçenekleri' : 'Comprehensive insurance options for your package security'
    },
    {
      icon: <Clock className="w-6 h-6" />,
      title: i18n.language === 'tr' ? 'Express Teslimat' : 'Express Delivery',
      description: i18n.language === 'tr' ? '1-3 iş günü içinde acil teslimat hizmeti' : 'Urgent delivery service within 1-3 business days'
    },
    {
      icon: <Truck className="w-6 h-6" />,
      title: i18n.language === 'tr' ? 'Adres Toplama' : 'Pickup Service',
      description: i18n.language === 'tr' ? 'Paketinizi adresinizden alıyoruz' : 'We collect your package from your address'
    },
    {
      icon: <Headphones className="w-6 h-6" />,
      title: i18n.language === 'tr' ? '7/24 Destek' : '24/7 Support',
      description: i18n.language === 'tr' ? 'Sürekli müşteri desteği ve takip hizmeti' : 'Continuous customer support and tracking service'
    }
  ];

  const pricingPlans = [
    {
      name: i18n.language === 'tr' ? 'Temel' : 'Basic',
      description: i18n.language === 'tr' ? 'Bireysel kullanıcılar için' : 'For individual users',
      price: i18n.language === 'tr' ? 'Gönderi Başına' : 'Per Shipment',
      features: [
        i18n.language === 'tr' ? 'Temel kargo hizmetleri' : 'Basic shipping services',
        i18n.language === 'tr' ? 'Online takip' : 'Online tracking',
        i18n.language === 'tr' ? 'E-posta desteği' : 'Email support',
        i18n.language === 'tr' ? 'Temel sigorta' : 'Basic insurance'
      ],
      recommended: false
    },
    {
      name: i18n.language === 'tr' ? 'İşletme' : 'Business',
      description: i18n.language === 'tr' ? 'Küçük ve orta işletmeler için' : 'For small and medium businesses',
      price: i18n.language === 'tr' ? 'İndirimli Oranlar' : 'Discounted Rates',
      features: [
        i18n.language === 'tr' ? 'Tüm temel özellikler' : 'All basic features',
        i18n.language === 'tr' ? 'Toplu gönderim indirimleri' : 'Bulk shipping discounts',
        i18n.language === 'tr' ? 'Öncelikli destek' : 'Priority support',
        i18n.language === 'tr' ? 'Gelişmiş raporlama' : 'Advanced reporting',
        i18n.language === 'tr' ? 'API erişimi' : 'API access'
      ],
      recommended: true
    },
    {
      name: i18n.language === 'tr' ? 'Kurumsal' : 'Enterprise',
      description: i18n.language === 'tr' ? 'Büyük şirketler için' : 'For large companies',
      price: i18n.language === 'tr' ? 'Özel Fiyatlandırma' : 'Custom Pricing',
      features: [
        i18n.language === 'tr' ? 'Tüm işletme özellikleri' : 'All business features',
        i18n.language === 'tr' ? 'Özel hesap yöneticisi' : 'Dedicated account manager',
        i18n.language === 'tr' ? 'Özel entegrasyon' : 'Custom integration',
        i18n.language === 'tr' ? 'SLA garantisi' : 'SLA guarantee',
        i18n.language === 'tr' ? 'Özel raporlama' : 'Custom reporting',
        i18n.language === 'tr' ? 'Fatura ödeme seçeneği' : 'Invoice payment option'
      ],
      recommended: false
    }
  ];

  const getColorClasses = (color: string) => {
    const colorMap = {
      blue: 'bg-blue-100 text-blue-600',
      green: 'bg-green-100 text-green-600',
      purple: 'bg-purple-100 text-purple-600',
      orange: 'bg-orange-100 text-orange-600'
    };
    return colorMap[color as keyof typeof colorMap] || 'bg-blue-100 text-blue-600';
  };

  return (
    <SharedMarketingLayout key={i18n.language}>
      {/* Hero Section */}
      <div className="bg-gradient-to-br from-blue-600 via-blue-700 to-blue-800 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
          <div className="text-center">
            <h1 className="text-4xl md:text-5xl font-bold mb-6">
              {i18n.language === 'tr' ? 'Küresel Kargo Hizmetlerimiz' : 'Our Global Shipping Services'}
            </h1>
            <p className="text-xl md:text-2xl text-blue-100 max-w-3xl mx-auto leading-relaxed">
              {i18n.language === 'tr' 
                ? 'Uluslararası ticaret ihtiyaçlarınız için kapsamlı lojistik çözümleri. Paketinizden teslimata kadar her aşamada yanınızdayız.'
                : 'Comprehensive logistics solutions for your international trade needs. We are with you at every stage from package to delivery.'
              }
            </p>
          </div>
        </div>
      </div>

      {/* Main Services */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            {i18n.language === 'tr' ? 'Ana Hizmetlerimiz' : 'Our Main Services'}
          </h2>
          <p className="text-lg text-gray-600 max-w-3xl mx-auto">
            {i18n.language === 'tr' 
              ? 'Uluslararası kargo sürecinizin her aşamasında ihtiyacınız olan tüm hizmetler'
              : 'All the services you need at every stage of your international shipping process'
            }
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {mainServices.map((service, index) => (
            <Card key={index} className="border-0 shadow-lg hover:shadow-xl transition-all">
              <CardHeader>
                <div className={`w-16 h-16 rounded-full flex items-center justify-center mb-4 ${getColorClasses(service.color)}`}>
                  {service.icon}
                </div>
                <CardTitle className="text-xl mb-2">{service.title}</CardTitle>
                <p className="text-gray-600">{service.description}</p>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {service.features.map((feature, featureIndex) => (
                    <li key={featureIndex} className="flex items-start">
                      <CheckCircle className="w-4 h-4 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                      <span className="text-gray-600 text-sm">{feature}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Additional Services */}
      <div className="bg-white py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              {i18n.language === 'tr' ? 'Ek Hizmetler' : 'Additional Services'}
            </h2>
            <p className="text-lg text-gray-600 max-w-3xl mx-auto">
              {i18n.language === 'tr' ? 'Kargo deneyiminizi geliştiren değer katmalı hizmetler' : 'Value-added services that enhance your shipping experience'}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {additionalServices.map((service, index) => (
              <Card key={index} className="border border-gray-200 hover:border-blue-300 hover:shadow-md transition-all text-center">
                <CardContent className="p-6">
                  <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <div className="text-blue-600">
                      {service.icon}
                    </div>
                  </div>
                  <h3 className="text-lg font-bold text-gray-900 mb-2">{service.title}</h3>
                  <p className="text-gray-600 text-sm">{service.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>

      {/* Pricing Plans */}
      <div className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              {i18n.language === 'tr' ? 'Hizmet Paketleri' : 'Service Packages'}
            </h2>
            <p className="text-lg text-gray-600 max-w-3xl mx-auto">
              {i18n.language === 'tr' ? 'İhtiyaçlarınıza uygun esnek fiyatlandırma seçenekleri' : 'Flexible pricing options tailored to your needs'}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {pricingPlans.map((plan, index) => (
              <Card key={index} className={`border-2 ${plan.recommended ? 'border-blue-500 shadow-xl' : 'border-gray-200'} hover:shadow-lg transition-all relative`}>
                {plan.recommended && (
                  <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                    <Badge className="bg-blue-500 text-white px-4 py-1">
                      {i18n.language === 'tr' ? 'Önerilen' : 'Recommended'}
                    </Badge>
                  </div>
                )}
                <CardHeader className="text-center">
                  <CardTitle className="text-2xl mb-2">{plan.name}</CardTitle>
                  <p className="text-gray-600 mb-4">{plan.description}</p>
                  <div className="text-3xl font-bold text-blue-600">{plan.price}</div>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-3 mb-6">
                    {plan.features.map((feature, featureIndex) => (
                      <li key={featureIndex} className="flex items-start">
                        <CheckCircle className="w-4 h-4 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                        <span className="text-gray-600 text-sm">{feature}</span>
                      </li>
                    ))}
                  </ul>
                  <Button 
                    className={`w-full ${plan.recommended ? 'bg-blue-600 hover:bg-blue-700' : 'bg-gray-600 hover:bg-gray-700'}`}
                    onClick={() => window.location.href = '/auth'}
                  >
                    {i18n.language === 'tr' ? 'Başlayın' : 'Get Started'}
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>

      {/* Process Section */}
      <div className="bg-white py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              {i18n.language === 'tr' ? 'Nasıl Çalışır?' : 'How It Works?'}
            </h2>
            <p className="text-lg text-gray-600 max-w-3xl mx-auto">
              {i18n.language === 'tr' ? 'Basit adımlarla uluslararası kargo gönderimi' : 'International shipping in simple steps'}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div className="text-center">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl font-bold text-blue-600">1</span>
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">
                {i18n.language === 'tr' ? 'Hesap Oluştur' : 'Create Account'}
              </h3>
              <p className="text-gray-600 text-sm">
                {i18n.language === 'tr' ? 'Ücretsiz hesabınızı oluşturun ve platformumuza giriş yapın' : 'Create your free account and login to our platform'}
              </p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl font-bold text-blue-600">2</span>
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">
                {i18n.language === 'tr' ? 'Gönderi Oluştur' : 'Create Shipment'}
              </h3>
              <p className="text-gray-600 text-sm">
                {i18n.language === 'tr' ? 'Paket bilgilerini girin ve fiyatları karşılaştırın' : 'Enter package details and compare prices'}
              </p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl font-bold text-blue-600">3</span>
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">
                {i18n.language === 'tr' ? 'Paket Hazırla' : 'Prepare Package'}
              </h3>
              <p className="text-gray-600 text-sm">
                {i18n.language === 'tr' ? 'Etiketi yazdırın, paketi hazırlayın veya toplama talep edin' : 'Print label, prepare package or request pickup'}
              </p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl font-bold text-green-600">4</span>
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">
                {i18n.language === 'tr' ? 'Takip Et' : 'Track Package'}
              </h3>
              <p className="text-gray-600 text-sm">
                {i18n.language === 'tr' ? 'Paketinizi gerçek zamanlı olarak takip edin' : 'Track your package in real-time'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 py-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            {i18n.language === 'tr' ? 'Hemen Başlayın' : 'Get Started Today'}
          </h2>
          <p className="text-lg text-gray-600 mb-8">
            {i18n.language === 'tr' ? 'Ücretsiz hesap oluşturun ve ilk gönderiniz için özel indirim kazanın' : 'Create a free account and get special discount for your first shipment'}
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button 
              onClick={() => window.location.href = '/auth'}
              className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 text-lg"
            >
              {i18n.language === 'tr' ? 'Ücretsiz Kaydol' : 'Sign Up Free'}
            </Button>
            <Button 
              variant="outline"
              onClick={() => window.location.href = '/marketing-price-calculator'}
              className="border-blue-300 text-blue-600 hover:bg-blue-50 px-8 py-3 text-lg"
            >
              {i18n.language === 'tr' ? 'Fiyat Hesapla' : 'Calculate Price'}
            </Button>
          </div>
        </div>
      </div>
    </SharedMarketingLayout>
  );
}