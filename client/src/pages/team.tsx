import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Mail, Linkedin, Twitter } from 'lucide-react';
import { SharedMarketingLayout } from '../components/shared-marketing-layout';

export default function TeamPage() {
  const { i18n } = useTranslation();

  const teamMembers = [
    {
      name: 'Ahmet Yılmaz',
      role: i18n.language === 'tr' ? 'Kurucu & CEO' : 'Founder & CEO',
      description: i18n.language === 'tr' 
        ? '15 yıllık lojistik deneyimi ile MoogShip\'i kurdu. Uluslararası ticaret ve teknoloji konularında uzman.'
        : 'Founded MoogShip with 15 years of logistics experience. Expert in international trade and technology.',
      image: '/api/placeholder/300/300',
      linkedin: '#',
      email: 'ahmet@moogship.com'
    },
    {
      name: 'Elif Demir',
      role: i18n.language === 'tr' ? 'Teknoloji Direktörü' : 'Chief Technology Officer',
      description: i18n.language === 'tr' 
        ? 'Yazılım geliştirme ve sistem mimarisi konularında 12 yıllık deneyime sahip. Platform\'un teknik altyapısını yönetir.'
        : '12 years of experience in software development and system architecture. Manages the platform\'s technical infrastructure.',
      image: '/api/placeholder/300/300',
      linkedin: '#',
      email: 'elif@moogship.com'
    },
    {
      name: 'Mehmet Kaya',
      role: i18n.language === 'tr' ? 'Operasyon Direktörü' : 'Operations Director',
      description: i18n.language === 'tr' 
        ? 'Kargo operasyonları ve müşteri ilişkileri yönetimi konularında uzman. Günlük operasyonları koordine eder.'
        : 'Expert in cargo operations and customer relationship management. Coordinates daily operations.',
      image: '/api/placeholder/300/300',
      linkedin: '#',
      email: 'mehmet@moogship.com'
    },
    {
      name: 'Zeynep Öztürk',
      role: i18n.language === 'tr' ? 'Satış Direktörü' : 'Sales Director',
      description: i18n.language === 'tr' 
        ? 'B2B satış ve iş geliştirme konularında 10 yıllık deneyim. Kurumsal müşteri ilişkilerini yönetir.'
        : '10 years of experience in B2B sales and business development. Manages corporate customer relationships.',
      image: '/api/placeholder/300/300',
      linkedin: '#',
      email: 'zeynep@moogship.com'
    },
    {
      name: 'Can Arslan',
      role: i18n.language === 'tr' ? 'Pazarlama Direktörü' : 'Marketing Director',
      description: i18n.language === 'tr' 
        ? 'Dijital pazarlama ve marka yönetimi konularında uzman. MoogShip\'in pazar görünürlüğünü artırır.'
        : 'Expert in digital marketing and brand management. Increases MoogShip\'s market visibility.',
      image: '/api/placeholder/300/300',
      linkedin: '#',
      email: 'can@moogship.com'
    },
    {
      name: 'Ayşe Çelik',
      role: i18n.language === 'tr' ? 'Müşteri Hizmetleri Direktörü' : 'Customer Service Director',
      description: i18n.language === 'tr' 
        ? 'Müşteri deneyimi ve destek hizmetleri konularında 8 yıllık deneyim. 24/7 müşteri desteği sağlar.'
        : '8 years of experience in customer experience and support services. Provides 24/7 customer support.',
      image: '/api/placeholder/300/300',
      linkedin: '#',
      email: 'ayse@moogship.com'
    }
  ];

  const teamStats = [
    {
      number: '50+',
      label: i18n.language === 'tr' ? 'Çalışan' : 'Employees',
      description: i18n.language === 'tr' ? 'Deneyimli ve tutkulu ekip üyesi' : 'Experienced and passionate team members'
    },
    {
      number: '15+',
      label: i18n.language === 'tr' ? 'Yıl Deneyim' : 'Years Experience',
      description: i18n.language === 'tr' ? 'Ortalama sektör deneyimi' : 'Average industry experience'
    },
    {
      number: '24/7',
      label: i18n.language === 'tr' ? 'Destek' : 'Support',
      description: i18n.language === 'tr' ? 'Kesintisiz müşteri hizmetleri' : 'Uninterrupted customer service'
    },
    {
      number: '190+',
      label: i18n.language === 'tr' ? 'Ülke' : 'Countries',
      description: i18n.language === 'tr' ? 'Küresel kapsama alanı' : 'Global coverage area'
    }
  ];

  return (
    <SharedMarketingLayout key={i18n.language}>
      {/* Hero Section */}
      <div className="bg-gradient-to-br from-blue-600 via-blue-700 to-blue-800 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
          <div className="text-center">
            <h1 className="text-4xl md:text-5xl font-bold mb-6">
              {i18n.language === 'tr' ? 'Ekibimiz' : 'Our Team'}
            </h1>
            <p className="text-xl md:text-2xl text-blue-100 max-w-3xl mx-auto leading-relaxed">
              {i18n.language === 'tr' 
                ? 'MoogShip\'i güçlü kılan, deneyimli ve tutkulu ekibimizle tanışın. Her biri alanında uzman olan ekip üyelerimiz, size en iyi hizmeti sunmak için çalışıyor.'
                : 'Meet our experienced and passionate team that makes MoogShip strong. Our team members, each expert in their field, work to provide you with the best service.'
              }
            </p>
          </div>
        </div>
      </div>

      {/* Team Stats */}
      <div className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            {teamStats.map((stat, index) => (
              <div key={index} className="p-6">
                <div className="text-3xl md:text-4xl font-bold text-blue-600 mb-2">
                  {stat.number}
                </div>
                <div className="text-lg font-semibold text-gray-900 mb-1">
                  {stat.label}
                </div>
                <div className="text-sm text-gray-600">
                  {stat.description}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Team Members */}
      <div className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              {i18n.language === 'tr' ? 'Liderlik Ekibimiz' : 'Our Leadership Team'}
            </h2>
            <p className="text-lg text-gray-600 max-w-3xl mx-auto">
              {i18n.language === 'tr' 
                ? 'MoogShip\'in vizyonunu hayata geçiren, alanlarında uzman yönetim kadromuz'
                : 'Our expert management team bringing MoogShip\'s vision to life'
              }
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {teamMembers.map((member, index) => (
              <Card key={index} className="border-0 shadow-lg hover:shadow-xl transition-shadow duration-300">
                <CardHeader className="text-center pb-2">
                  <div className="w-32 h-32 mx-auto mb-4 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center">
                    <span className="text-4xl font-bold text-white">{member.name.charAt(0)}</span>
                  </div>
                  <h3 className="text-xl font-bold text-gray-900">{member.name}</h3>
                  <Badge variant="secondary" className="bg-blue-100 text-blue-700 hover:bg-blue-200">
                    {member.role}
                  </Badge>
                </CardHeader>
                <CardContent className="text-center">
                  <p className="text-gray-600 text-sm mb-4 leading-relaxed">
                    {member.description}
                  </p>
                  <div className="flex justify-center space-x-3">
                    <a 
                      href={member.linkedin} 
                      className="p-2 bg-blue-100 hover:bg-blue-200 rounded-full transition-colors"
                      aria-label="LinkedIn"
                    >
                      <Linkedin className="w-4 h-4 text-blue-600" />
                    </a>
                    <a 
                      href={`mailto:${member.email}`} 
                      className="p-2 bg-gray-100 hover:bg-gray-200 rounded-full transition-colors"
                      aria-label="Email"
                    >
                      <Mail className="w-4 h-4 text-gray-600" />
                    </a>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>

      {/* Culture & Values */}
      <div className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              {i18n.language === 'tr' ? 'Kültürümüz ve Değerlerimiz' : 'Our Culture and Values'}
            </h2>
            <p className="text-lg text-gray-600 max-w-3xl mx-auto">
              {i18n.language === 'tr' 
                ? 'MoogShip\'te çalışanlarımızın mutluluğu ve gelişimi önceliğimizdir'
                : 'At MoogShip, the happiness and development of our employees is our priority'
              }
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center p-6">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">🤝</span>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">
                {t('team.culture.collaboration.title', 'İşbirliği')}
              </h3>
              <p className="text-gray-600">
                {t('team.culture.collaboration.description', 'Birlikte çalışarak daha güçlü sonuçlar elde ederiz. Ekip ruhu bizim en büyük gücümüz.')}
              </p>
            </div>

            <div className="text-center p-6">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">💡</span>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">
                {t('team.culture.innovation.title', 'İnovasyon')}
              </h3>
              <p className="text-gray-600">
                {t('team.culture.innovation.description', 'Sürekli öğrenme ve gelişim odaklı yaklaşımımızla sektörde öncü olmaya devam ediyoruz.')}
              </p>
            </div>

            <div className="text-center p-6">
              <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">🎯</span>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">
                {t('team.culture.excellence.title', 'Mükemmellik')}
              </h3>
              <p className="text-gray-600">
                {t('team.culture.excellence.description', 'Her projede en yüksek kalite standartlarını hedefliyoruz. Müşteri memnuniyeti bizim önceliğimiz.')}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Join Us Section */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 py-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            {t('team.join.title', 'Ekibimize Katılın')}
          </h2>
          <p className="text-lg text-gray-600 mb-8">
            {t('team.join.description', 'MoogShip ailesi sürekli büyüyor. Yetenekli ve tutkulu profesyonelleri aramıza katılmaya davet ediyoruz.')}
          </p>
          <button 
            onClick={() => window.location.href = '/kariyer'}
            className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-lg text-lg font-medium transition-colors"
          >
            {t('team.join.cta', 'Kariyer Fırsatlarını İncele')}
          </button>
        </div>
      </div>
    </SharedMarketingLayout>
  );
}