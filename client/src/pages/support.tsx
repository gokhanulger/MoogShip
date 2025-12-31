import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { 
  MessageCircle, 
  Phone, 
  Mail, 
  Clock, 
  Globe,
  HelpCircle,
  FileText,
  Users,
  Zap,
  CheckCircle
} from 'lucide-react';
import { SiWhatsapp } from 'react-icons/si';
import { SharedMarketingLayout } from '../components/shared-marketing-layout';

export default function SupportPage() {
  const { i18n } = useTranslation();
  const [contactForm, setContactForm] = useState({
    name: '',
    email: '',
    subject: '',
    message: ''
  });

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Handle form submission
    const successMessage = i18n.language === 'tr' 
      ? 'Mesajınız başarıyla gönderildi. En kısa sürede size dönüş yapacağız.'
      : 'Your message has been sent successfully. We will get back to you as soon as possible.';
    alert(successMessage);
    setContactForm({ name: '', email: '', subject: '', message: '' });
  };

  const handleWhatsAppContact = () => {
    const phoneNumber = "905407447911";
    const message = i18n.language === 'tr' 
      ? 'Merhaba, MoogShip hakkında bilgi almak istiyorum.'
      : 'Hello, I would like to get information about MoogShip.';
    const whatsappUrl = `https://wa.me/${phoneNumber}?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank');
  };

  const contactMethods = [
    {
      icon: <SiWhatsapp className="w-6 h-6" />,
      title: i18n.language === 'tr' ? 'WhatsApp Destek' : 'WhatsApp Support',
      description: i18n.language === 'tr' ? '7/24 anlık destek için WhatsApp\'tan ulaşın' : 'Contact us via WhatsApp for 24/7 instant support',
      action: i18n.language === 'tr' ? 'WhatsApp\'ta Yaz' : 'Write on WhatsApp',
      onClick: handleWhatsAppContact,
      color: 'green'
    },
    {
      icon: <Mail className="w-6 h-6" />,
      title: i18n.language === 'tr' ? 'E-posta Desteği' : 'Email Support',
      description: i18n.language === 'tr' ? 'Detaylı sorularınız için e-posta gönderin' : 'Send email for your detailed questions',
      action: i18n.language === 'tr' ? 'E-posta Gönder' : 'Send Email',
      onClick: () => window.location.href = 'mailto:support@moogship.com',
      color: 'blue'
    },
    {
      icon: <Phone className="w-6 h-6" />,
      title: i18n.language === 'tr' ? 'Telefon Desteği' : 'Phone Support',
      description: i18n.language === 'tr' ? 'Acil durumlar için telefon desteği' : 'Phone support for emergencies',
      action: i18n.language === 'tr' ? 'Ara' : 'Call',
      onClick: () => window.location.href = 'tel:+902121234567',
      color: 'purple'
    }
  ];

  const faqItems = [
    {
      question: i18n.language === 'tr' ? 'Kargo göndermek için hesap oluşturmam gerekli mi?' : 'Do I need to create an account to send shipments?',
      answer: i18n.language === 'tr' 
        ? 'Evet, güvenli ve takip edilebilir kargo hizmeti için ücretsiz hesap oluşturmanız gerekmektedir.'
        : 'Yes, you need to create a free account for secure and trackable shipping service.'
    },
    {
      question: i18n.language === 'tr' ? 'Hangi ülkelere kargo gönderebilirim?' : 'Which countries can I ship to?',
      answer: i18n.language === 'tr' 
        ? 'MoogShip ile 190\'dan fazla ülkeye güvenli kargo gönderimi yapabilirsiniz.'
        : 'You can send secure shipments to more than 190 countries with MoogShip.'
    },
    {
      question: i18n.language === 'tr' ? 'Kargo fiyatları nasıl hesaplanır?' : 'How are shipping prices calculated?',
      answer: i18n.language === 'tr' 
        ? 'Fiyatlar paket boyutu, ağırlığı, varış ülkesi ve seçilen hizmet türüne göre hesaplanır.'
        : 'Prices are calculated based on package size, weight, destination country and selected service type.'
    },
    {
      question: i18n.language === 'tr' ? 'Paketimi takip edebilir miyim?' : 'Can I track my package?',
      answer: i18n.language === 'tr' 
        ? 'Evet, takip numaranız ile paketinizi gerçek zamanlı olarak takip edebilirsiniz.'
        : 'Yes, you can track your package in real-time with your tracking number.'
    },
    {
      question: i18n.language === 'tr' ? 'Gümrük işlemleri nasıl yapılır?' : 'How are customs procedures handled?',
      answer: i18n.language === 'tr' 
        ? 'Gümrük belgeleri otomatik olarak hazırlanır ve süreç hakkında bilgilendirilirsiniz.'
        : 'Customs documents are prepared automatically and you are informed about the process.'
    },
    {
      question: i18n.language === 'tr' ? 'Kargo sigortası mevcut mu?' : 'Is shipping insurance available?',
      answer: i18n.language === 'tr' 
        ? 'Evet, paketinizin değerine göre sigorta seçenekleri mevcuttur.'
        : 'Yes, insurance options are available based on your package value.'
    }
  ];

  const getColorClasses = (color: string) => {
    const colorMap = {
      green: 'bg-green-100 text-green-600 hover:bg-green-200',
      blue: 'bg-blue-100 text-blue-600 hover:bg-blue-200',
      purple: 'bg-purple-100 text-purple-600 hover:bg-purple-200'
    };
    return colorMap[color as keyof typeof colorMap] || 'bg-blue-100 text-blue-600 hover:bg-blue-200';
  };

  return (
    <SharedMarketingLayout>
      {/* Hero Section */}
      <div className="bg-gradient-to-br from-blue-600 via-blue-700 to-blue-800 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
          <div className="text-center">
            <h1 className="text-4xl md:text-5xl font-bold mb-6">
              {t('support.hero.title', 'Destek Merkezi')}
            </h1>
            <p className="text-xl md:text-2xl text-blue-100 max-w-3xl mx-auto leading-relaxed">
              {t('support.hero.subtitle', 'Size yardımcı olmak için buradayız. Sorularınızın yanıtlarını bulun veya destek ekibimizle iletişime geçin.')}
            </p>
          </div>
        </div>
      </div>

      {/* Contact Methods */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            {t('support.contact.title', 'Bizimle İletişime Geçin')}
          </h2>
          <p className="text-lg text-gray-600 max-w-3xl mx-auto">
            {t('support.contact.subtitle', 'Size en uygun iletişim yöntemini seçin, profesyonel destek ekibimiz yardımcı olmaya hazır')}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
          {contactMethods.map((method, index) => (
            <Card key={index} className="border-0 shadow-lg hover:shadow-xl transition-all text-center">
              <CardHeader>
                <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 ${getColorClasses(method.color)}`}>
                  {method.icon}
                </div>
                <CardTitle className="text-xl">{method.title}</CardTitle>
                <p className="text-gray-600">{method.description}</p>
              </CardHeader>
              <CardContent>
                <Button 
                  onClick={method.onClick}
                  className={`w-full ${method.color === 'green' ? 'bg-green-600 hover:bg-green-700' : 
                    method.color === 'purple' ? 'bg-purple-600 hover:bg-purple-700' : 
                    'bg-blue-600 hover:bg-blue-700'}`}
                >
                  {method.action}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Support Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-16">
          <div className="text-center p-6 bg-white rounded-xl shadow-md">
            <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <Clock className="w-6 h-6 text-blue-600" />
            </div>
            <div className="text-2xl font-bold text-gray-900">2 dk</div>
            <div className="text-sm text-gray-600">{t('support.stats.response', 'Ortalama Yanıt Süresi')}</div>
          </div>

          <div className="text-center p-6 bg-white rounded-xl shadow-md">
            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <CheckCircle className="w-6 h-6 text-green-600" />
            </div>
            <div className="text-2xl font-bold text-gray-900">98%</div>
            <div className="text-sm text-gray-600">{t('support.stats.satisfaction', 'Müşteri Memnuniyeti')}</div>
          </div>

          <div className="text-center p-6 bg-white rounded-xl shadow-md">
            <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <Globe className="w-6 h-6 text-purple-600" />
            </div>
            <div className="text-2xl font-bold text-gray-900">8</div>
            <div className="text-sm text-gray-600">{t('support.stats.languages', 'Dil Desteği')}</div>
          </div>

          <div className="text-center p-6 bg-white rounded-xl shadow-md">
            <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <Users className="w-6 h-6 text-orange-600" />
            </div>
            <div className="text-2xl font-bold text-gray-900">24/7</div>
            <div className="text-sm text-gray-600">{t('support.stats.availability', 'Destek Saatleri')}</div>
          </div>
        </div>
      </div>

      {/* Contact Form */}
      <div className="bg-white py-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              {t('support.form.title', 'Bize Yazın')}
            </h2>
            <p className="text-lg text-gray-600">
              {t('support.form.subtitle', 'Sorularınızı detaylı olarak yazın, en kısa sürede size dönüş yapalım')}
            </p>
          </div>

          <Card className="shadow-lg">
            <CardContent className="p-8">
              <form onSubmit={handleFormSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {t('support.form.name', 'Adınız')}
                    </label>
                    <Input
                      value={contactForm.name}
                      onChange={(e) => setContactForm(prev => ({ ...prev, name: e.target.value }))}
                      placeholder={t('support.form.namePlaceholder', 'Adınızı girin')}
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {t('support.form.email', 'E-posta')}
                    </label>
                    <Input
                      type="email"
                      value={contactForm.email}
                      onChange={(e) => setContactForm(prev => ({ ...prev, email: e.target.value }))}
                      placeholder={t('support.form.emailPlaceholder', 'E-posta adresinizi girin')}
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t('support.form.subject', 'Konu')}
                  </label>
                  <Input
                    value={contactForm.subject}
                    onChange={(e) => setContactForm(prev => ({ ...prev, subject: e.target.value }))}
                    placeholder={t('support.form.subjectPlaceholder', 'Mesajınızın konusunu girin')}
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t('support.form.message', 'Mesajınız')}
                  </label>
                  <Textarea
                    rows={6}
                    value={contactForm.message}
                    onChange={(e) => setContactForm(prev => ({ ...prev, message: e.target.value }))}
                    placeholder={t('support.form.messagePlaceholder', 'Sorularınızı veya mesajınızı detaylı olarak yazın...')}
                    required
                  />
                </div>

                <div className="text-center">
                  <Button 
                    type="submit"
                    className="bg-blue-600 hover:bg-blue-700 px-8 py-3 text-lg"
                  >
                    <Mail className="w-5 h-5 mr-2" />
                    {t('support.form.submit', 'Mesaj Gönder')}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* FAQ Section */}
      <div className="py-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              {t('support.faq.title', 'Sık Sorulan Sorular')}
            </h2>
            <p className="text-lg text-gray-600">
              {t('support.faq.subtitle', 'En çok merak edilen sorular ve yanıtları')}
            </p>
          </div>

          <div className="space-y-4">
            {faqItems.map((item, index) => (
              <Card key={index} className="border border-gray-200 hover:border-blue-300 hover:shadow-md transition-all">
                <CardHeader>
                  <CardTitle className="text-lg flex items-start gap-3">
                    <HelpCircle className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                    {item.question}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-600 leading-relaxed pl-8">
                    {item.answer}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="text-center mt-12">
            <p className="text-gray-600 mb-4">
              {t('support.faq.notFound', 'Aradığınız soruyu bulamadınız mı?')}
            </p>
            <Button 
              variant="outline"
              onClick={handleWhatsAppContact}
              className="border-blue-300 text-blue-600 hover:bg-blue-50"
            >
              <SiWhatsapp className="w-4 h-4 mr-2" />
              {t('support.faq.contact', 'Bize Ulaşın')}
            </Button>
          </div>
        </div>
      </div>

      {/* Help Resources */}
      <div className="bg-white py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              {t('support.resources.title', 'Yardım Kaynakları')}
            </h2>
            <p className="text-lg text-gray-600">
              {t('support.resources.subtitle', 'İhtiyacınız olan bilgilere hızlı erişim')}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <Card className="border border-gray-200 hover:border-blue-300 hover:shadow-lg transition-all text-center">
              <CardContent className="p-8">
                <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <FileText className="w-8 h-8 text-blue-600" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-3">
                  {t('support.resources.guides.title', 'Kullanım Kılavuzları')}
                </h3>
                <p className="text-gray-600 mb-4">
                  {t('support.resources.guides.description', 'Adım adım kargo gönderimi rehberi')}
                </p>
                <Button variant="outline" className="border-blue-300 text-blue-600 hover:bg-blue-50">
                  {t('support.resources.guides.action', 'Kılavuzları İncele')}
                </Button>
              </CardContent>
            </Card>

            <Card className="border border-gray-200 hover:border-green-300 hover:shadow-lg transition-all text-center">
              <CardContent className="p-8">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <MessageCircle className="w-8 h-8 text-green-600" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-3">
                  {t('support.resources.community.title', 'Topluluk Forumu')}
                </h3>
                <p className="text-gray-600 mb-4">
                  {t('support.resources.community.description', 'Diğer kullanıcılarla deneyim paylaşın')}
                </p>
                <Button variant="outline" className="border-green-300 text-green-600 hover:bg-green-50">
                  {t('support.resources.community.action', 'Foruma Katıl')}
                </Button>
              </CardContent>
            </Card>

            <Card className="border border-gray-200 hover:border-purple-300 hover:shadow-lg transition-all text-center">
              <CardContent className="p-8">
                <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Zap className="w-8 h-8 text-purple-600" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-3">
                  {t('support.resources.api.title', 'API Dokümantasyonu')}
                </h3>
                <p className="text-gray-600 mb-4">
                  {t('support.resources.api.description', 'Geliştiriciler için teknik belgeler')}
                </p>
                <Button variant="outline" className="border-purple-300 text-purple-600 hover:bg-purple-50">
                  {t('support.resources.api.action', 'API Dökümanları')}
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Emergency Support */}
      <div className="bg-gradient-to-r from-red-50 to-orange-50 py-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <Zap className="w-8 h-8 text-red-600" />
          </div>
          <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-4">
            {t('support.emergency.title', 'Acil Durum Desteği')}
          </h2>
          <p className="text-lg text-gray-600 mb-6">
            {t('support.emergency.description', 'Kritik kargo sorunları için 7/24 acil destek hattımızdan yardım alın')}
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button 
              onClick={() => window.location.href = 'tel:+902121234567'}
              className="bg-red-600 hover:bg-red-700"
            >
              <Phone className="w-5 h-5 mr-2" />
              {t('support.emergency.phone', 'Acil Destek Hattı')}
            </Button>
            <Button 
              variant="outline"
              onClick={handleWhatsAppContact}
              className="border-green-300 text-green-600 hover:bg-green-50"
            >
              <SiWhatsapp className="w-5 h-5 mr-2" />
              {t('support.emergency.whatsapp', 'WhatsApp Destek')}
            </Button>
          </div>
        </div>
      </div>
    </SharedMarketingLayout>
  );
}