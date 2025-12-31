import { useTranslation } from 'react-i18next';
import GenericPageTemplate from '../generic-page-template';

export default function CustomsClearancePage() {
  const { t } = useTranslation();
  
  return (
    <GenericPageTemplate
      title={t('pages.customs.title', 'Customs Clearance Services')}
      subtitle={t('pages.customs.subtitle', 'Simplifying international shipping with expert customs handling')}
      content={
        <div>
          <p className="text-lg mb-6">
            {t('pages.customs.intro', 'MoogShip\'s customs clearance services streamline the complex process of moving goods across international borders. Our team of experts ensures your shipments comply with all regulations, helping you avoid delays, penalties, and unexpected costs.')}
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 my-8">
            <div className="bg-blue-50 p-5 rounded-lg">
              <div className="h-12 w-12 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9 18V5l12-2v13"></path>
                  <path d="M6 15H4a2 2 0 0 0-2 2v4"></path>
                  <path d="M22 17v1a2 2 0 0 1-2 2h-1"></path>
                  <path d="M11 18h1"></path>
                  <path d="M19 18h1"></path>
                  <path d="M2 19h1"></path>
                </svg>
              </div>
              <h3 className="text-lg font-semibold mb-2">{t('pages.customs.benefits.expertise.title', 'Customs Expertise')}</h3>
              <p className="text-gray-700">{t('pages.customs.benefits.expertise.description', 'Our specialists navigate complex customs regulations across all major trading nations to ensure smooth clearance.')}</p>
            </div>
            
            <div className="bg-blue-50 p-5 rounded-lg">
              <div className="h-12 w-12 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"></path>
                  <path d="M14 2v6h6"></path>
                  <path d="M16 13H8"></path>
                  <path d="M16 17H8"></path>
                  <path d="M10 9H8"></path>
                </svg>
              </div>
              <h3 className="text-lg font-semibold mb-2">{t('pages.customs.benefits.documentation.title', 'Documentation')}</h3>
              <p className="text-gray-700">{t('pages.customs.benefits.documentation.description', 'Complete preparation of all required customs documents, ensuring accuracy and compliance.')}</p>
            </div>
            
            <div className="bg-blue-50 p-5 rounded-lg">
              <div className="h-12 w-12 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 8V4H8"></path>
                  <rect width="16" height="12" x="4" y="8" rx="2"></rect>
                  <path d="M2 14h2"></path>
                  <path d="M20 14h2"></path>
                  <path d="M15 13v2"></path>
                  <path d="M9 13v2"></path>
                </svg>
              </div>
              <h3 className="text-lg font-semibold mb-2">{t('pages.customs.benefits.duties.title', 'Duties & Taxes')}</h3>
              <p className="text-gray-700">{t('pages.customs.benefits.duties.description', 'Accurate calculation and management of import duties, taxes, and other fees for transparent shipping costs.')}</p>
            </div>
          </div>
          
          <h2 className="text-2xl font-bold mt-10 mb-4">
            {t('pages.customs.services.title', 'Our Customs Services')}
          </h2>
          
          <div className="space-y-6 mb-8">
            <div className="border border-gray-200 rounded-lg p-5 hover:border-blue-300 hover:shadow-md transition-all">
              <h3 className="text-xl font-semibold text-gray-900 mb-2">{t('pages.customs.services.brokerage.title', 'Customs Brokerage')}</h3>
              <p className="text-gray-600 mb-3">{t('pages.customs.services.brokerage.description', 'Our licensed customs brokers act as your representative with customs authorities, handling all declarations and ensuring compliance with import/export regulations.')}</p>
              <ul className="text-sm space-y-1 text-gray-700">
                <li>• {t('pages.customs.services.brokerage.feature1', 'Classification of goods under Harmonized System (HS) codes')}</li>
                <li>• {t('pages.customs.services.brokerage.feature2', 'Duty and tax calculation')}</li>
                <li>• {t('pages.customs.services.brokerage.feature3', 'Electronic customs filing in major markets')}</li>
                <li>• {t('pages.customs.services.brokerage.feature4', 'Resolution of customs queries and issues')}</li>
              </ul>
            </div>
            
            <div className="border border-gray-200 rounded-lg p-5 hover:border-blue-300 hover:shadow-md transition-all">
              <h3 className="text-xl font-semibold text-gray-900 mb-2">{t('pages.customs.services.documentation.title', 'Documentation Preparation')}</h3>
              <p className="text-gray-600 mb-3">{t('pages.customs.services.documentation.description', 'Accurate preparation of all required customs documentation, tailored to the specific requirements of each country.')}</p>
              <ul className="text-sm space-y-1 text-gray-700">
                <li>• {t('pages.customs.services.documentation.feature1', 'Commercial invoices and packing lists')}</li>
                <li>• {t('pages.customs.services.documentation.feature2', 'Certificates of origin')}</li>
                <li>• {t('pages.customs.services.documentation.feature3', 'Dangerous goods documentation')}</li>
                <li>• {t('pages.customs.services.documentation.feature4', 'Product-specific certifications')}</li>
              </ul>
            </div>
            
            <div className="border border-gray-200 rounded-lg p-5 hover:border-blue-300 hover:shadow-md transition-all">
              <h3 className="text-xl font-semibold text-gray-900 mb-2">{t('pages.customs.services.compliance.title', 'Compliance Advisory')}</h3>
              <p className="text-gray-600 mb-3">{t('pages.customs.services.compliance.description', 'Expert guidance on customs regulations, trade agreements, and compliance requirements.')}</p>
              <ul className="text-sm space-y-1 text-gray-700">
                <li>• {t('pages.customs.services.compliance.feature1', 'Country-specific import/export regulations guidance')}</li>
                <li>• {t('pages.customs.services.compliance.feature2', 'Advisory on applicable free trade agreements')}</li>
                <li>• {t('pages.customs.services.compliance.feature3', 'Restricted/prohibited goods consulting')}</li>
                <li>• {t('pages.customs.services.compliance.feature4', 'Customs valuation assistance')}</li>
              </ul>
            </div>
            
            <div className="border border-gray-200 rounded-lg p-5 hover:border-blue-300 hover:shadow-md transition-all">
              <h3 className="text-xl font-semibold text-gray-900 mb-2">{t('pages.customs.services.ecommerce.title', 'E-commerce Customs Solutions')}</h3>
              <p className="text-gray-600 mb-3">{t('pages.customs.services.ecommerce.description', 'Specialized customs services for online retailers and marketplaces.')}</p>
              <ul className="text-sm space-y-1 text-gray-700">
                <li>• {t('pages.customs.services.ecommerce.feature1', 'High-volume customs processing')}</li>
                <li>• {t('pages.customs.services.ecommerce.feature2', 'De minimis threshold optimization')}</li>
                <li>• {t('pages.customs.services.ecommerce.feature3', 'Returns management and duty reclaims')}</li>
                <li>• {t('pages.customs.services.ecommerce.feature4', 'Integration with major e-commerce platforms')}</li>
              </ul>
            </div>
          </div>
          
          <h2 className="text-2xl font-bold mt-10 mb-4">
            {t('pages.customs.regions.title', 'Global Customs Coverage')}
          </h2>
          
          <p className="mb-6">
            {t('pages.customs.regions.description', 'Our customs expertise spans major trading regions worldwide, with specialized knowledge of local requirements and procedures:')}
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="font-semibold text-gray-900 mb-1">{t('pages.customs.regions.eu.title', 'European Union')}</h3>
              <p className="text-sm text-gray-600">{t('pages.customs.regions.eu.description', 'Comprehensive knowledge of EU customs union procedures, Brexit requirements, and IOSS for e-commerce.')}</p>
            </div>
            
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="font-semibold text-gray-900 mb-1">{t('pages.customs.regions.na.title', 'North America')}</h3>
              <p className="text-sm text-gray-600">{t('pages.customs.regions.na.description', 'Expert handling of US, Canadian, and Mexican customs requirements, with USMCA advantages.')}</p>
            </div>
            
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="font-semibold text-gray-900 mb-1">{t('pages.customs.regions.china.title', 'China')}</h3>
              <p className="text-sm text-gray-600">{t('pages.customs.regions.china.description', 'Specialized knowledge of Chinese import regulations, CIQ requirements, and e-commerce channels.')}</p>
            </div>
            
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="font-semibold text-gray-900 mb-1">{t('pages.customs.regions.uk.title', 'United Kingdom')}</h3>
              <p className="text-sm text-gray-600">{t('pages.customs.regions.uk.description', 'Post-Brexit customs procedures and documentation for smooth UK market access.')}</p>
            </div>
            
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="font-semibold text-gray-900 mb-1">{t('pages.customs.regions.me.title', 'Middle East')}</h3>
              <p className="text-sm text-gray-600">{t('pages.customs.regions.me.description', 'Understanding of GCC customs union and specific requirements for Middle Eastern markets.')}</p>
            </div>
            
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="font-semibold text-gray-900 mb-1">{t('pages.customs.regions.apac.title', 'Asia-Pacific')}</h3>
              <p className="text-sm text-gray-600">{t('pages.customs.regions.apac.description', 'Coverage of diverse customs requirements across Australia, Japan, South Korea, and Southeast Asian nations.')}</p>
            </div>
          </div>
          
          <h2 className="text-2xl font-bold mt-10 mb-4">
            {t('pages.customs.why.title', 'Why Choose MoogShip for Customs Clearance')}
          </h2>
          
          <div className="space-y-4 mb-8">
            <div className="flex items-start">
              <div className="h-6 w-6 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 mt-1 mr-3 flex-shrink-0">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 6 9 17l-5-5"></path>
                </svg>
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">{t('pages.customs.why.expertise.title', 'Specialized Expertise')}</h3>
                <p className="text-gray-600">{t('pages.customs.why.expertise.description', 'Our team includes licensed customs specialists with deep experience in global trade regulations and procedures.')}</p>
              </div>
            </div>
            
            <div className="flex items-start">
              <div className="h-6 w-6 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 mt-1 mr-3 flex-shrink-0">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 6 9 17l-5-5"></path>
                </svg>
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">{t('pages.customs.why.technology.title', 'Advanced Technology')}</h3>
                <p className="text-gray-600">{t('pages.customs.why.technology.description', 'Our digital platform automates and streamlines customs processes, reducing errors and expediting clearance.')}</p>
              </div>
            </div>
            
            <div className="flex items-start">
              <div className="h-6 w-6 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 mt-1 mr-3 flex-shrink-0">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 6 9 17l-5-5"></path>
                </svg>
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">{t('pages.customs.why.transparency.title', 'Complete Transparency')}</h3>
                <p className="text-gray-600">{t('pages.customs.why.transparency.description', 'Clear communication and visibility into all customs-related charges and processes.')}</p>
              </div>
            </div>
            
            <div className="flex items-start">
              <div className="h-6 w-6 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 mt-1 mr-3 flex-shrink-0">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 6 9 17l-5-5"></path>
                </svg>
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">{t('pages.customs.why.integration.title', 'Seamless Integration')}</h3>
                <p className="text-gray-600">{t('pages.customs.why.integration.description', 'Our customs services integrate smoothly with your shipping process for a comprehensive solution.')}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-blue-50 p-6 rounded-lg mt-10">
            <h2 className="text-xl font-bold mb-3">{t('pages.customs.cta.title', 'Simplify Your Customs Clearance')}</h2>
            <p className="mb-4">{t('pages.customs.cta.description', 'Contact us today to learn how MoogShip\'s customs clearance services can streamline your international shipping operations and ensure compliance with global trade regulations.')}</p>
            <div className="flex flex-wrap gap-3">
              <a href="/auth" className="inline-flex items-center justify-center px-4 py-2 rounded-md bg-blue-600 text-white hover:bg-blue-700 transition-colors">
                {t('pages.customs.cta.createAccount', 'Create Account')}
              </a>
              <a href="/company/contact" className="inline-flex items-center justify-center px-4 py-2 rounded-md border border-blue-600 text-blue-600 hover:bg-blue-50 transition-colors">
                {t('pages.customs.cta.contactUs', 'Contact Us')}
              </a>
            </div>
          </div>
        </div>
      }
    />
  );
}