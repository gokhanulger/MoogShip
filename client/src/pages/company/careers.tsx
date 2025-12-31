import { useTranslation } from 'react-i18next';
import GenericPageTemplate from '../generic-page-template';

export default function CareersPage() {
  const { t } = useTranslation();
  
  return (
    <GenericPageTemplate
      title={t('pages.careers.title', 'Careers at MoogShip')}
      subtitle={t('pages.careers.subtitle', 'Join our team and help shape the future of global shipping')}
      content={
        <div>
          <p className="text-lg mb-4">
            {t('pages.careers.intro', "At MoogShip, we're building the next generation of shipping logistics technology. We're looking for talented individuals who are passionate about innovation, customer service, and global commerce.")}
          </p>
          
          <h2 className="text-2xl font-bold mt-8 mb-4">
            {t('pages.careers.why.title', 'Why Work With Us')}
          </h2>
          <ul className="list-disc pl-5 space-y-2">
            <li>{t('pages.careers.why.item1', 'Collaborative and innovative work environment')}</li>
            <li>{t('pages.careers.why.item2', 'Competitive compensation and benefits')}</li>
            <li>{t('pages.careers.why.item3', 'Professional growth and development opportunities')}</li>
            <li>{t('pages.careers.why.item4', 'Work with cutting-edge technologies')}</li>
            <li>{t('pages.careers.why.item5', 'Make a real impact on global commerce')}</li>
          </ul>
          
          <h2 className="text-2xl font-bold mt-8 mb-4">
            {t('pages.careers.culture.title', 'Our Culture')}
          </h2>
          <p>
            {t('pages.careers.culture.content', 'We foster a culture of innovation, collaboration, and continuous learning. Our diverse team brings together different perspectives and experiences, creating an environment where creativity thrives. We believe in work-life balance and provide flexible arrangements to support our team members\' wellbeing.')}
          </p>
          
          <h2 className="text-2xl font-bold mt-8 mb-4">
            {t('pages.careers.openings.title', 'Current Openings')}
          </h2>
          <div className="space-y-6 mt-4">
            <div className="border border-gray-200 rounded-lg p-5 hover:border-blue-300 hover:shadow-md transition-all">
              <h3 className="text-xl font-semibold text-gray-900">{t('pages.careers.openings.job1.title', 'Senior Software Engineer')}</h3>
              <p className="text-gray-600 mt-2">{t('pages.careers.openings.job1.location', 'Istanbul, Turkey (Hybrid)')}</p>
              <p className="mt-3">{t('pages.careers.openings.job1.description', 'Join our engineering team to develop scalable solutions for our shipping platform. You\'ll work with modern technologies including React, Node.js, and cloud infrastructure.')}</p>
            </div>
            
            <div className="border border-gray-200 rounded-lg p-5 hover:border-blue-300 hover:shadow-md transition-all">
              <h3 className="text-xl font-semibold text-gray-900">{t('pages.careers.openings.job2.title', 'Logistics Operations Specialist')}</h3>
              <p className="text-gray-600 mt-2">{t('pages.careers.openings.job2.location', 'Istanbul, Turkey')}</p>
              <p className="mt-3">{t('pages.careers.openings.job2.description', 'Coordinate international shipping operations and optimize delivery processes. You\'ll work closely with carriers and help customers navigate customs requirements.')}</p>
            </div>
            
            <div className="border border-gray-200 rounded-lg p-5 hover:border-blue-300 hover:shadow-md transition-all">
              <h3 className="text-xl font-semibold text-gray-900">{t('pages.careers.openings.job3.title', 'Customer Success Manager')}</h3>
              <p className="text-gray-600 mt-2">{t('pages.careers.openings.job3.location', 'Remote (Turkey-based)')}</p>
              <p className="mt-3">{t('pages.careers.openings.job3.description', 'Help our customers succeed with MoogShip by providing exceptional support, training, and strategic guidance. You\'ll be their advocate and ensure they get maximum value from our platform.')}</p>
            </div>
          </div>
          
          <div className="mt-10 text-center">
            <p className="text-lg font-medium mb-4">{t('pages.careers.application.title', 'Don\'t see a role that fits?')}</p>
            <p>{t('pages.careers.application.content', 'We\'re always looking for talented individuals. Send your resume to careers@moogship.com with a cover letter explaining why you\'d be a great addition to our team.')}</p>
          </div>
        </div>
      }
    />
  );
}