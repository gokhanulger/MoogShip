import { useTranslation } from 'react-i18next';
import GenericPageTemplate from '../generic-page-template';

export default function AboutPage() {
  const { t } = useTranslation();
  
  return (
    <GenericPageTemplate
      title={t('pages.about.title', 'About Moogship')}
      subtitle={t('pages.about.subtitle', 'Learn more about our company and mission')}
      content={
        <div>
          <p className="text-lg mb-4">
            {t('pages.about.intro', 'MoogShip was founded with a vision to revolutionize global shipping logistics for e-commerce sellers worldwide. Our platform integrates seamlessly with major marketplaces to provide hassle-free international shipping solutions.')}
          </p>
          
          <h2 className="text-2xl font-bold mt-8 mb-4">
            {t('pages.about.mission.title', 'Our Mission')}
          </h2>
          <p>
            {t('pages.about.mission.content', 'We aim to simplify global shipping logistics for businesses of all sizes. By leveraging technology and strategic partnerships, we provide cost-effective solutions that help businesses expand their reach internationally.')}
          </p>
          
          <h2 className="text-2xl font-bold mt-8 mb-4">
            {t('pages.about.vision.title', 'Our Vision')}
          </h2>
          <p>
            {t('pages.about.vision.content', 'To become the leading global shipping platform trusted by e-commerce businesses worldwide, known for reliability, transparency, and exceptional service.')}
          </p>
          
          <h2 className="text-2xl font-bold mt-8 mb-4">
            {t('pages.about.values.title', 'Our Values')}
          </h2>
          <ul className="list-disc pl-5 space-y-2">
            <li>{t('pages.about.values.item1', 'Customer-centric approach in everything we do')}</li>
            <li>{t('pages.about.values.item2', 'Transparency in pricing and operations')}</li>
            <li>{t('pages.about.values.item3', 'Innovation driving continuous improvement')}</li>
            <li>{t('pages.about.values.item4', 'Reliability and accountability in all transactions')}</li>
            <li>{t('pages.about.values.item5', 'Environmental responsibility in our operations')}</li>
          </ul>
          
          <h2 className="text-2xl font-bold mt-8 mb-4">
            {t('pages.about.history.title', 'Our History')}
          </h2>
          <p>
            {t('pages.about.history.content', 'Established in 2020, MoogShip began as a solution for Turkish sellers looking to expand globally. Over the years, we have grown to serve customers in over 30 countries, processing thousands of shipments daily with a focus on excellence and customer satisfaction.')}
          </p>
          
          <h2 className="text-2xl font-bold mt-8 mb-4">
            {t('pages.about.team.title', 'Our Team')}
          </h2>
          <p>
            {t('pages.about.team.content', 'Our diverse team of logistics experts, technology specialists, and customer service professionals work together to deliver exceptional shipping experiences. Led by industry veterans, we combine deep logistics knowledge with innovative technology solutions.')}
          </p>
        </div>
      }
    />
  );
}