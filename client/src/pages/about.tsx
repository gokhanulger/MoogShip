import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Globe, Truck, Shield, Users } from 'lucide-react';
import { SharedMarketingLayout } from '../components/shared-marketing-layout';

export default function AboutPage() {
  const { t, i18n } = useTranslation();

  return (
    <SharedMarketingLayout key={i18n.language}>

      {/* Hero Section */}
      <div className="bg-gradient-to-br from-blue-600 via-blue-700 to-blue-800 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
          <div className="text-center">
            <h1 className="text-4xl md:text-5xl font-bold mb-6">
              {i18n.language === 'tr' ? 'Hakkımızda' : 'About Us'}
            </h1>
            <p className="text-xl md:text-2xl text-blue-100 max-w-3xl mx-auto leading-relaxed">
              {i18n.language === 'tr' ? 'Küresel kargo ve lojistik çözümlerinde güvenilir ortağınız. 2020 yılından bu yana uluslararası ticareti kolaylaştırıyoruz.' : 'Your trusted partner in global shipping and logistics solutions. Simplifying international trade since 2020.'}
            </p>
          </div>
        </div>
      </div>

      {/* Mission & Vision Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 bg-gray-50">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div>
            <h2 className="text-3xl font-bold text-gray-900 mb-6">
              {i18n.language === 'tr' ? 'Misyonumuz' : 'Our Mission'}
            </h2>
            <p className="text-lg text-gray-600 mb-6 leading-relaxed">
              {i18n.language === 'tr' ? 'MoogShip olarak, dünya çapında paket gönderimi konusunda işletmelere ve bireylere güvenilir, hızlı ve ekonomik çözümler sunarak uluslararası ticareti herkes için erişilebilir kılmayı hedefliyoruz.' : 'At MoogShip, we aim to make international trade accessible to everyone by providing businesses and individuals with reliable, fast, and economical solutions for worldwide package shipping.'}
            </p>
            <h3 className="text-2xl font-bold text-gray-900 mb-4">
              {i18n.language === 'tr' ? 'Vizyonumuz' : 'Our Vision'}
            </h3>
            <p className="text-lg text-gray-600 leading-relaxed">
              {i18n.language === 'tr' ? 'Küresel lojistikte öncü olmak ve müşterilerimizin uluslararası başarılarına katkıda bulunmak için sürekli olarak yenilikçi teknolojiler ve hizmetler geliştirmek.' : 'To be a pioneer in global logistics and continuously develop innovative technologies and services to contribute to our customers\' international success.'}
            </p>
          </div>
          <div className="relative">
            <div className="bg-white rounded-2xl shadow-xl p-8">
              <div className="grid grid-cols-2 gap-6">
                <div className="text-center">
                  <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Globe className="w-8 h-8 text-blue-600" />
                  </div>
                  <h4 className="font-bold text-gray-900">190+</h4>
                  <p className="text-sm text-gray-600">{i18n.language === 'tr' ? 'Ülke' : 'Countries'}</p>
                </div>
                <div className="text-center">
                  <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Truck className="w-8 h-8 text-green-600" />
                  </div>
                  <h4 className="font-bold text-gray-900">50K+</h4>
                  <p className="text-sm text-gray-600">{i18n.language === 'tr' ? 'Gönderi' : 'Shipments'}</p>
                </div>
                <div className="text-center">
                  <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Shield className="w-8 h-8 text-yellow-600" />
                  </div>
                  <h4 className="font-bold text-gray-900">99.9%</h4>
                  <p className="text-sm text-gray-600">{i18n.language === 'tr' ? 'Güvenilirlik' : 'Reliability'}</p>
                </div>
                <div className="text-center">
                  <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Users className="w-8 h-8 text-purple-600" />
                  </div>
                  <h4 className="font-bold text-gray-900">5K+</h4>
                  <p className="text-sm text-gray-600">{i18n.language === 'tr' ? 'Müşteri' : 'Customers'}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Values Section */}
      <div className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              {i18n.language === 'tr' ? 'Değerlerimiz' : 'Our Values'}
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              {i18n.language === 'tr' ? 'Başarımızın temelinde yatan değerler' : 'The values that form the foundation of our success'}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            <Card className="border-0 shadow-lg hover:shadow-xl transition-shadow">
              <CardHeader className="text-center">
                <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Globe className="w-8 h-8 text-blue-600" />
                </div>
                <CardTitle className="text-xl">
                  {i18n.language === 'tr' ? 'İnovasyon' : 'Innovation'}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600 text-center">
                  {i18n.language === 'tr' ? 'Sürekli gelişim ve yenilikçi çözümlerle sektörde öncülük ediyoruz.' : 'We lead the industry with continuous development and innovative solutions.'}
                </p>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg hover:shadow-xl transition-shadow">
              <CardHeader className="text-center">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Shield className="w-8 h-8 text-green-600" />
                </div>
                <CardTitle className="text-xl">
                  {i18n.language === 'tr' ? 'Güvenlik' : 'Security'}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600 text-center">
                  {i18n.language === 'tr' ? 'Gönderilerinizin güvenliği bizim için en önemli önceliktir.' : 'The security of your shipments is our top priority.'}
                </p>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg hover:shadow-xl transition-shadow">
              <CardHeader className="text-center">
                <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Truck className="w-8 h-8 text-yellow-600" />
                </div>
                <CardTitle className="text-xl">
                  {i18n.language === 'tr' ? 'Hız' : 'Speed'}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600 text-center">
                  {i18n.language === 'tr' ? 'Hızlı ve etkin çözümlerle zamana karşı yarışıyoruz.' : 'We race against time with fast and efficient solutions.'}
                </p>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg hover:shadow-xl transition-shadow">
              <CardHeader className="text-center">
                <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Users className="w-8 h-8 text-purple-600" />
                </div>
                <CardTitle className="text-xl">
                  {i18n.language === 'tr' ? 'Müşteri Odaklılık' : 'Customer Focus'}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600 text-center">
                  {i18n.language === 'tr' ? 'Her müşterimizin ihtiyaçları farklıdır. Kişiselleştirilmiş çözümlerle her zaman yanınızdayız.' : 'Every customer has different needs. We are always there for you with personalized solutions.'}
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Story Section */}
      <div className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl p-8 lg:p-12">
            <div className="max-w-4xl mx-auto text-center">
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-6">
                {i18n.language === 'tr' ? 'Hikayemiz' : 'Our Story'}
              </h2>
              <div className="space-y-6 text-lg text-gray-600 leading-relaxed">
                <p>
                  {i18n.language === 'tr' ? 'MoogShip, küresel kargo ve lojistik sektöründe yenilikçi çözümler sunmak amacıyla kuruldu. Müşterilerimizin uluslararası gönderi ihtiyaçlarını karşılamak için sürekli gelişen teknolojimiz ve geniş taşıyıcı ağımızla hizmet veriyoruz.' : 'MoogShip was founded to provide innovative solutions in the global shipping and logistics sector. We serve our customers with continuously evolving technology and extensive carrier network to meet their international shipping needs.'}
                </p>
                <p>
                  {i18n.language === 'tr' ? 'Bugün 190\'dan fazla ülkeye kargo göndererek müşterilerimize güvenilir ve ekonomik çözümler sunuyoruz. Teknoloji ve lojistiği bir araya getirerek uluslararası ticareti herkes için erişilebilir kılmaya devam ediyoruz.' : 'Today we provide reliable and economical solutions to our customers by shipping to over 190 countries. We continue to make international trade accessible to everyone by combining technology and logistics.'}
                </p>
                <p>
                  {i18n.language === 'tr' ? 'Amacımız sadece kargo göndermek değil; müşterilerimizin küresel pazarlarda büyümelerine destek olmak ve dünya çapında ticaret fırsatlarını herkes için erişilebilir kılmak.' : 'Our goal is not just shipping packages; supporting our customers\' growth in global markets and making worldwide trade opportunities accessible to everyone.'}
                </p>
              </div>
              
              <div className="mt-8">
                <Button 
                  onClick={() => window.location.href = '/destek'}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 text-lg"
                >
                  {i18n.language === 'tr' ? 'Bizimle İletişime Geçin' : 'Contact Us'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </SharedMarketingLayout>
  );
}