import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { MapPin, Clock, Users, Briefcase, Heart, Zap } from 'lucide-react';
import { SharedMarketingLayout } from '../components/shared-marketing-layout';

export default function CareerPage() {
  const { t, i18n } = useTranslation();

  const jobOpenings = [
    {
      title: i18n.language === 'tr' ? 'Senior Fullstack Developer' : 'Senior Fullstack Developer',
      department: i18n.language === 'tr' ? 'Yazılım Geliştirme' : 'Software Development',
      location: i18n.language === 'tr' ? 'İstanbul / Uzaktan' : 'Istanbul / Remote',
      type: i18n.language === 'tr' ? 'Tam Zamanlı' : 'Full Time',
      experience: i18n.language === 'tr' ? '5+ yıl' : '5+ years',
      skills: ['React', 'Node.js', 'TypeScript', 'PostgreSQL', 'Docker'],
      description: i18n.language === 'tr' ? 'Kargo yönetim platformumuzun frontend ve backend geliştirmesinde rol alacak deneyimli yazılım geliştirici arıyoruz.' : 'We are looking for an experienced software developer to take part in frontend and backend development of our cargo management platform.'
    },
    {
      title: i18n.language === 'tr' ? 'UX/UI Tasarımcı' : 'UX/UI Designer',
      department: i18n.language === 'tr' ? 'Tasarım' : 'Design',
      location: i18n.language === 'tr' ? 'İstanbul' : 'Istanbul',
      type: i18n.language === 'tr' ? 'Tam Zamanlı' : 'Full Time',
      experience: i18n.language === 'tr' ? '3+ yıl' : '3+ years',
      skills: ['Figma', 'Adobe Creative Suite', 'Prototyping', 'User Research'],
      description: i18n.language === 'tr' ? 'Kullanıcı deneyimini ön planda tutan, yaratıcı ve analitik düşünce becerisine sahip UX/UI tasarımcı arıyoruz.' : 'We are looking for a UX/UI designer who prioritizes user experience and has creative and analytical thinking skills.'
    },
    {
      title: i18n.language === 'tr' ? 'Lojistik Operasyon Uzmanı' : 'Logistics Operations Specialist',
      department: i18n.language === 'tr' ? 'Operasyon' : 'Operations',
      location: i18n.language === 'tr' ? 'İstanbul' : 'Istanbul',
      type: i18n.language === 'tr' ? 'Tam Zamanlı' : 'Full Time',
      experience: i18n.language === 'tr' ? '2+ yıl' : '2+ years',
      skills: i18n.language === 'tr' ? ['Lojistik', 'Gümrük', 'Kargo İşlemleri'] : ['Logistics', 'Customs', 'Shipping Operations'],
      description: i18n.language === 'tr' ? 'Uluslararası kargo operasyonlarını yönetecek, gümrük işlemlerinde deneyimli operasyon uzmanı arıyoruz.' : 'We are looking for an operations specialist experienced in customs procedures who will manage international cargo operations.'
    },
    {
      title: i18n.language === 'tr' ? 'Müşteri Success Uzmanı' : 'Customer Success Specialist',
      department: i18n.language === 'tr' ? 'Müşteri Hizmetleri' : 'Customer Service',
      location: i18n.language === 'tr' ? 'İstanbul / Hibrit' : 'Istanbul / Hybrid',
      type: i18n.language === 'tr' ? 'Tam Zamanlı' : 'Full Time',
      experience: i18n.language === 'tr' ? '1+ yıl' : '1+ year',
      skills: i18n.language === 'tr' ? ['İletişim', 'Problem Çözme', 'Yabancı Dil'] : ['Communication', 'Problem Solving', 'Foreign Languages'],
      description: i18n.language === 'tr' ? 'Müşterilerimizin başarısını sağlamak için onlara rehberlik edecek ve destek olacak uzman arıyoruz.' : 'We are looking for a specialist who will guide and support our customers to ensure their success.'
    }
  ];

  const benefits = [
    {
      icon: <Heart className="w-6 h-6" />,
      title: i18n.language === 'tr' ? 'Sağlık Sigortası' : 'Health Insurance',
      description: i18n.language === 'tr' ? 'Kapsamlı özel sağlık sigortası ve yıllık sağlık check-up' : 'Comprehensive private health insurance and annual health check-up'
    },
    {
      icon: <Zap className="w-6 h-6" />,
      title: i18n.language === 'tr' ? 'Esnek Çalışma' : 'Flexible Work',
      description: i18n.language === 'tr' ? 'Hibrit çalışma modeli ve esnek mesai saatleri' : 'Hybrid work model and flexible working hours'
    },
    {
      icon: <Users className="w-6 h-6" />,
      title: i18n.language === 'tr' ? 'Takım Etkinlikleri' : 'Team Activities',
      description: i18n.language === 'tr' ? 'Düzenli takım etkinlikleri ve şirket gezileri' : 'Regular team activities and company trips'
    },
    {
      icon: <Briefcase className="w-6 h-6" />,
      title: i18n.language === 'tr' ? 'Kişisel Gelişim' : 'Personal Development',
      description: i18n.language === 'tr' ? 'Eğitim bütçesi ve konferans katılım desteği' : 'Training budget and conference participation support'
    }
  ];

  return (
    <SharedMarketingLayout key={i18n.language}>
      {/* Hero Section */}
      <div className="bg-gradient-to-br from-blue-600 via-blue-700 to-blue-800 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
          <div className="text-center">
            <h1 className="text-4xl md:text-5xl font-bold mb-6">
              {i18n.language === 'tr' ? 'Kariyer' : 'Career'}
            </h1>
            <p className="text-xl md:text-2xl text-blue-100 max-w-3xl mx-auto leading-relaxed">
              {i18n.language === 'tr' ? 'Küresel ticaretin geleceğini şekillendiren takımımıza katılın. MoogShip\'te kariyerinizi geliştirin ve dünyayı değiştiren projelerinizin parçası olun.' : 'Join our team shaping the future of global trade. Develop your career at MoogShip and be part of world-changing projects.'}
            </p>
          </div>
        </div>
      </div>

      {/* Why Work With Us */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            {i18n.language === 'tr' ? 'Neden MoogShip?' : 'Why MoogShip?'}
          </h2>
          <p className="text-lg text-gray-600 max-w-3xl mx-auto">
            {i18n.language === 'tr' ? 'Hızla büyüyen teknoloji şirketimizde yeteneklerinizi geliştirin ve kariyerinizi ileriye taşıyın' : 'Develop your talents and advance your career in our rapidly growing technology company'}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {benefits.map((benefit, index) => (
            <Card key={index} className="border-0 shadow-lg hover:shadow-xl transition-shadow text-center">
              <CardHeader>
                <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <div className="text-blue-600">
                    {benefit.icon}
                  </div>
                </div>
                <CardTitle className="text-lg">{benefit.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600 text-sm">{benefit.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Open Positions */}
      <div className="bg-white py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              {i18n.language === 'tr' ? 'Açık Pozisyonlar' : 'Open Positions'}
            </h2>
            <p className="text-lg text-gray-600 max-w-3xl mx-auto">
              {i18n.language === 'tr' ? 'Yetenekli ve tutkulu profesyonelleri aramaya devam ediyoruz' : 'We continue to search for talented and passionate professionals'}
            </p>
          </div>

          <div className="space-y-6">
            {jobOpenings.map((job, index) => (
              <Card key={index} className="border border-gray-200 hover:border-blue-300 hover:shadow-lg transition-all">
                <CardContent className="p-6">
                  <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between">
                    <div className="flex-1">
                      <div className="flex items-start justify-between mb-4">
                        <div>
                          <h3 className="text-xl font-bold text-gray-900 mb-2">{job.title}</h3>
                          <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600 mb-3">
                            <div className="flex items-center gap-1">
                              <Briefcase className="w-4 h-4" />
                              <span>{job.department}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <MapPin className="w-4 h-4" />
                              <span>{job.location}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <Clock className="w-4 h-4" />
                              <span>{job.type}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <Users className="w-4 h-4" />
                              <span>{job.experience}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      <p className="text-gray-600 mb-4 leading-relaxed">
                        {job.description}
                      </p>
                      
                      <div className="flex flex-wrap gap-2 mb-4">
                        {job.skills.map((skill, skillIndex) => (
                          <Badge key={skillIndex} variant="secondary" className="text-xs">
                            {skill}
                          </Badge>
                        ))}
                      </div>
                    </div>
                    
                    <div className="lg:ml-6 mt-4 lg:mt-0">
                      <Button 
                        onClick={() => window.location.href = '/contact'}
                        className="w-full lg:w-auto bg-blue-600 hover:bg-blue-700"
                      >
                        {i18n.language === 'tr' ? 'Başvur' : 'Apply'}
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="text-center mt-12">
            <p className="text-gray-600 mb-4">
              {i18n.language === 'tr' ? 'Aradığınız pozisyonu bulamadınız mı?' : "Can't find the position you're looking for?"}
            </p>
            <Button 
              variant="outline"
              onClick={() => window.location.href = '/contact'}
              className="border-blue-300 text-blue-600 hover:bg-blue-50"
            >
              {i18n.language === 'tr' ? 'Bize Ulaşın' : 'Contact Us'}
            </Button>
          </div>
        </div>
      </div>

      {/* Application Process */}
      <div className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              {i18n.language === 'tr' ? 'Başvuru Süreci' : 'Application Process'}
            </h2>
            <p className="text-lg text-gray-600 max-w-3xl mx-auto">
              {i18n.language === 'tr' ? 'Basit ve şeffaf işe alım sürecimiz' : 'Our simple and transparent hiring process'}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div className="text-center">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl font-bold text-blue-600">1</span>
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">
                {i18n.language === 'tr' ? 'Başvuru' : 'Application'}
              </h3>
              <p className="text-gray-600 text-sm">
                {i18n.language === 'tr' ? 'CV\'nizi ve motivasyon mektubunuzu gönderin' : 'Send your CV and cover letter'}
              </p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl font-bold text-blue-600">2</span>
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">
                {i18n.language === 'tr' ? 'İnceleme' : 'Review'}
              </h3>
              <p className="text-gray-600 text-sm">
                {i18n.language === 'tr' ? 'HR ekibimiz başvurunuzu değerlendirir' : 'Our HR team evaluates your application'}
              </p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl font-bold text-blue-600">3</span>
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">
                {i18n.language === 'tr' ? 'Görüşme' : 'Interview'}
              </h3>
              <p className="text-gray-600 text-sm">
                {i18n.language === 'tr' ? 'Teknik ve kültürel uyum görüşmeleri' : 'Technical and cultural fit interviews'}
              </p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl font-bold text-green-600">4</span>
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">
                {i18n.language === 'tr' ? 'Karar' : 'Decision'}
              </h3>
              <p className="text-gray-600 text-sm">
                {i18n.language === 'tr' ? 'Teklif sunumu ve işe başlama' : 'Offer presentation and onboarding'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 py-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            {i18n.language === 'tr' ? 'Hemen Başvurun' : 'Apply Now'}
          </h2>
          <p className="text-lg text-gray-600 mb-8">
            {i18n.language === 'tr' ? 'MoogShip ailesinin bir parçası olmaya hazır mısınız? Bize CV\'nizi gönderin ve birlikte büyüyelim.' : 'Ready to become part of the MoogShip family? Send us your CV and let\'s grow together.'}
          </p>
          <Button 
            onClick={() => window.location.href = '/contact'}
            className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 text-lg"
          >
            {i18n.language === 'tr' ? 'İletişime Geç' : 'Contact Us'}
          </Button>
        </div>
      </div>
    </SharedMarketingLayout>
  );
}