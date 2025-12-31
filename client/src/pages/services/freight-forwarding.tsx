import { useTranslation } from 'react-i18next';
import GenericPageTemplate from '../generic-page-template';

export default function FreightForwardingPage() {
  const { t } = useTranslation();
  
  return (
    <GenericPageTemplate
      title={t('pages.freight.title', 'Freight Forwarding Services')}
      subtitle={t('pages.freight.subtitle', 'Efficient transportation solutions for businesses of all sizes')}
      content={
        <div>
          <p className="text-lg mb-6">
            {t('pages.freight.intro', 'MoogShip offers comprehensive freight forwarding services that optimize the movement of your goods across global supply chains. Our expertise spans air, sea, and land transportation, providing flexible solutions tailored to your specific requirements and timelines.')}
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 my-8">
            <div className="p-5 border border-gray-200 rounded-lg text-center">
              <div className="h-16 w-16 bg-blue-50 rounded-full flex items-center justify-center text-blue-600 mx-auto mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z"></path>
                  <path d="M18 18a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z"></path>
                  <path d="M6 18a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z"></path>
                  <path d="m6 14 1.5-2.9"></path>
                  <path d="m18 14-1.5-2.9"></path>
                  <path d="M9 6.3 12 7"></path>
                </svg>
              </div>
              <h3 className="text-xl font-semibold mb-2">{t('pages.freight.modes.air.title', 'Air Freight')}</h3>
              <p className="text-gray-600">{t('pages.freight.modes.air.description', 'Fast and reliable air cargo services for time-sensitive shipments, with global coverage and express options.')}</p>
            </div>
            
            <div className="p-5 border border-gray-200 rounded-lg text-center">
              <div className="h-16 w-16 bg-blue-50 rounded-full flex items-center justify-center text-blue-600 mx-auto mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18 16.016V6.03a.96.96 0 0 0-.582-.888L12 3 6.582 5.142A.96.96 0 0 0 6 6.03v9.986"></path>
                  <path d="M21 10s-5.148 1.479-9 4.51C8.148 11.479 3 10 3 10"></path>
                  <path d="M3 18.5a1.5 1.5 0 1 0 3 0 1.5 1.5 0 1 0-3 0Z"></path>
                  <path d="M9 18.5a1.5 1.5 0 1 0 3 0 1.5 1.5 0 1 0-3 0Z"></path>
                  <path d="M15 18.5a1.5 1.5 0 1 0 3 0 1.5 1.5 0 1 0-3 0Z"></path>
                  <path d="M21 18.5a1.5 1.5 0 1 0 3 0 1.5 1.5 0 1 0-3 0Z"></path>
                </svg>
              </div>
              <h3 className="text-xl font-semibold mb-2">{t('pages.freight.modes.sea.title', 'Sea Freight')}</h3>
              <p className="text-gray-600">{t('pages.freight.modes.sea.description', 'Cost-effective ocean shipping solutions for larger volumes, with FCL and LCL options to match your needs.')}</p>
            </div>
            
            <div className="p-5 border border-gray-200 rounded-lg text-center">
              <div className="h-16 w-16 bg-blue-50 rounded-full flex items-center justify-center text-blue-600 mx-auto mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M5 9h14M5 4h2a1 1 0 0 1 1 1v4h10V5a1 1 0 0 1 1-1h2"></path>
                  <rect width="18" height="8" x="3" y="9" rx="1"></rect>
                  <path d="M9 17h6"></path>
                  <path d="M10 9v8"></path>
                  <path d="M14 9v8"></path>
                </svg>
              </div>
              <h3 className="text-xl font-semibold mb-2">{t('pages.freight.modes.road.title', 'Road Transport')}</h3>
              <p className="text-gray-600">{t('pages.freight.modes.road.description', 'Flexible road freight options for domestic and cross-border shipments, with expedited and standard services.')}</p>
            </div>
          </div>
          
          <h2 className="text-2xl font-bold mt-10 mb-4">
            {t('pages.freight.services.title', 'Comprehensive Freight Services')}
          </h2>
          
          <div className="space-y-6 mb-8">
            <div className="border border-gray-200 rounded-lg p-5 hover:border-blue-300 hover:shadow-md transition-all">
              <h3 className="text-xl font-semibold text-gray-900 mb-2">{t('pages.freight.services.international.title', 'International Freight')}</h3>
              <p className="mb-3">{t('pages.freight.services.international.description', 'End-to-end global transportation solutions with seamless coordination across different modes and carriers.')}</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-2 text-sm">
                <div className="flex items-center">
                  <span className="text-blue-600 mr-2">✓</span>
                  <span>{t('pages.freight.services.international.feature1', 'Global network coverage')}</span>
                </div>
                <div className="flex items-center">
                  <span className="text-blue-600 mr-2">✓</span>
                  <span>{t('pages.freight.services.international.feature2', 'Multi-modal solutions')}</span>
                </div>
                <div className="flex items-center">
                  <span className="text-blue-600 mr-2">✓</span>
                  <span>{t('pages.freight.services.international.feature3', 'Customs clearance integration')}</span>
                </div>
                <div className="flex items-center">
                  <span className="text-blue-600 mr-2">✓</span>
                  <span>{t('pages.freight.services.international.feature4', 'End-to-end tracking')}</span>
                </div>
              </div>
            </div>
            
            <div className="border border-gray-200 rounded-lg p-5 hover:border-blue-300 hover:shadow-md transition-all">
              <h3 className="text-xl font-semibold text-gray-900 mb-2">{t('pages.freight.services.specialized.title', 'Specialized Cargo')}</h3>
              <p className="mb-3">{t('pages.freight.services.specialized.description', 'Expert handling of items requiring special care, equipment, or regulatory compliance.')}</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-2 text-sm">
                <div className="flex items-center">
                  <span className="text-blue-600 mr-2">✓</span>
                  <span>{t('pages.freight.services.specialized.feature1', 'Temperature-controlled shipping')}</span>
                </div>
                <div className="flex items-center">
                  <span className="text-blue-600 mr-2">✓</span>
                  <span>{t('pages.freight.services.specialized.feature2', 'Hazardous materials handling')}</span>
                </div>
                <div className="flex items-center">
                  <span className="text-blue-600 mr-2">✓</span>
                  <span>{t('pages.freight.services.specialized.feature3', 'Oversized and heavy cargo')}</span>
                </div>
                <div className="flex items-center">
                  <span className="text-blue-600 mr-2">✓</span>
                  <span>{t('pages.freight.services.specialized.feature4', 'High-value item transport')}</span>
                </div>
              </div>
            </div>
            
            <div className="border border-gray-200 rounded-lg p-5 hover:border-blue-300 hover:shadow-md transition-all">
              <h3 className="text-xl font-semibold text-gray-900 mb-2">{t('pages.freight.services.project.title', 'Project Cargo')}</h3>
              <p className="mb-3">{t('pages.freight.services.project.description', 'Comprehensive planning and execution for complex, large-scale shipping projects.')}</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-2 text-sm">
                <div className="flex items-center">
                  <span className="text-blue-600 mr-2">✓</span>
                  <span>{t('pages.freight.services.project.feature1', 'End-to-end project management')}</span>
                </div>
                <div className="flex items-center">
                  <span className="text-blue-600 mr-2">✓</span>
                  <span>{t('pages.freight.services.project.feature2', 'Route planning and optimization')}</span>
                </div>
                <div className="flex items-center">
                  <span className="text-blue-600 mr-2">✓</span>
                  <span>{t('pages.freight.services.project.feature3', 'Special equipment procurement')}</span>
                </div>
                <div className="flex items-center">
                  <span className="text-blue-600 mr-2">✓</span>
                  <span>{t('pages.freight.services.project.feature4', 'Multi-vendor coordination')}</span>
                </div>
              </div>
            </div>
            
            <div className="border border-gray-200 rounded-lg p-5 hover:border-blue-300 hover:shadow-md transition-all">
              <h3 className="text-xl font-semibold text-gray-900 mb-2">{t('pages.freight.services.consulting.title', 'Freight Consulting')}</h3>
              <p className="mb-3">{t('pages.freight.services.consulting.description', 'Strategic advice to optimize your freight operations, costs, and supply chain efficiency.')}</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-2 text-sm">
                <div className="flex items-center">
                  <span className="text-blue-600 mr-2">✓</span>
                  <span>{t('pages.freight.services.consulting.feature1', 'Transport network analysis')}</span>
                </div>
                <div className="flex items-center">
                  <span className="text-blue-600 mr-2">✓</span>
                  <span>{t('pages.freight.services.consulting.feature2', 'Carrier selection and negotiation')}</span>
                </div>
                <div className="flex items-center">
                  <span className="text-blue-600 mr-2">✓</span>
                  <span>{t('pages.freight.services.consulting.feature3', 'Modal shift optimization')}</span>
                </div>
                <div className="flex items-center">
                  <span className="text-blue-600 mr-2">✓</span>
                  <span>{t('pages.freight.services.consulting.feature4', 'Carbon footprint reduction')}</span>
                </div>
              </div>
            </div>
          </div>
          
          <h2 className="text-2xl font-bold mt-10 mb-4">
            {t('pages.freight.industries.title', 'Industries We Serve')}
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <div className="p-4 border border-gray-200 rounded-lg">
              <h3 className="font-semibold text-gray-900 mb-2">{t('pages.freight.industries.retail.title', 'Retail & E-commerce')}</h3>
              <p className="text-sm text-gray-600">{t('pages.freight.industries.retail.description', 'Reliable solutions for retail supply chains, supporting both traditional retail and e-commerce operations.')}</p>
            </div>
            
            <div className="p-4 border border-gray-200 rounded-lg">
              <h3 className="font-semibold text-gray-900 mb-2">{t('pages.freight.industries.manufacturing.title', 'Manufacturing')}</h3>
              <p className="text-sm text-gray-600">{t('pages.freight.industries.manufacturing.description', 'Efficient transport of raw materials, components, and finished goods for manufacturing businesses.')}</p>
            </div>
            
            <div className="p-4 border border-gray-200 rounded-lg">
              <h3 className="font-semibold text-gray-900 mb-2">{t('pages.freight.industries.tech.title', 'Technology')}</h3>
              <p className="text-sm text-gray-600">{t('pages.freight.industries.tech.description', 'Specialized handling for sensitive electronics, with security and tracking priorities.')}</p>
            </div>
            
            <div className="p-4 border border-gray-200 rounded-lg">
              <h3 className="font-semibold text-gray-900 mb-2">{t('pages.freight.industries.automotive.title', 'Automotive')}</h3>
              <p className="text-sm text-gray-600">{t('pages.freight.industries.automotive.description', 'Tailored solutions for automotive parts and vehicles, supporting just-in-time production.')}</p>
            </div>
            
            <div className="p-4 border border-gray-200 rounded-lg">
              <h3 className="font-semibold text-gray-900 mb-2">{t('pages.freight.industries.pharma.title', 'Pharmaceutical')}</h3>
              <p className="text-sm text-gray-600">{t('pages.freight.industries.pharma.description', 'Temperature-controlled and compliant shipping for pharmaceutical products.')}</p>
            </div>
            
            <div className="p-4 border border-gray-200 rounded-lg">
              <h3 className="font-semibold text-gray-900 mb-2">{t('pages.freight.industries.food.title', 'Food & Beverage')}</h3>
              <p className="text-sm text-gray-600">{t('pages.freight.industries.food.description', 'Safe and timely transport for perishable goods with cold chain integrity.')}</p>
            </div>
            
            <div className="p-4 border border-gray-200 rounded-lg">
              <h3 className="font-semibold text-gray-900 mb-2">{t('pages.freight.industries.fashion.title', 'Fashion & Textiles')}</h3>
              <p className="text-sm text-gray-600">{t('pages.freight.industries.fashion.description', 'Seasonal and time-sensitive shipping for the fashion industry.')}</p>
            </div>
            
            <div className="p-4 border border-gray-200 rounded-lg">
              <h3 className="font-semibold text-gray-900 mb-2">{t('pages.freight.industries.energy.title', 'Energy & Resources')}</h3>
              <p className="text-sm text-gray-600">{t('pages.freight.industries.energy.description', 'Specialized equipment for energy sector components and materials.')}</p>
            </div>
          </div>
          
          <div className="bg-gray-50 p-6 rounded-lg my-10">
            <h2 className="text-xl font-bold mb-4">{t('pages.freight.technology.title', 'Advanced Freight Technology')}</h2>
            <p className="mb-4">{t('pages.freight.technology.description', 'Our digital platform provides complete visibility and control over your freight movements:')}</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-start">
                <div className="h-6 w-6 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 mt-1 mr-3 flex-shrink-0">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20 6 9 17l-5-5"></path>
                  </svg>
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">{t('pages.freight.technology.tracking.title', 'Real-time Tracking')}</h3>
                  <p className="text-sm text-gray-600">{t('pages.freight.technology.tracking.description', 'Monitor your shipments in real-time across all transport modes.')}</p>
                </div>
              </div>
              
              <div className="flex items-start">
                <div className="h-6 w-6 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 mt-1 mr-3 flex-shrink-0">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20 6 9 17l-5-5"></path>
                  </svg>
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">{t('pages.freight.technology.documents.title', 'Digital Documentation')}</h3>
                  <p className="text-sm text-gray-600">{t('pages.freight.technology.documents.description', 'Paperless management of all freight and customs documents.')}</p>
                </div>
              </div>
              
              <div className="flex items-start">
                <div className="h-6 w-6 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 mt-1 mr-3 flex-shrink-0">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20 6 9 17l-5-5"></path>
                  </svg>
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">{t('pages.freight.technology.analytics.title', 'Freight Analytics')}</h3>
                  <p className="text-sm text-gray-600">{t('pages.freight.technology.analytics.description', 'Detailed reporting and insights to optimize your freight operations.')}</p>
                </div>
              </div>
              
              <div className="flex items-start">
                <div className="h-6 w-6 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 mt-1 mr-3 flex-shrink-0">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20 6 9 17l-5-5"></path>
                  </svg>
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">{t('pages.freight.technology.integration.title', 'API Integration')}</h3>
                  <p className="text-sm text-gray-600">{t('pages.freight.technology.integration.description', 'Connect our freight platform with your ERP, WMS, or other business systems.')}</p>
                </div>
              </div>
            </div>
          </div>
          
          <div className="bg-blue-50 p-6 rounded-lg mt-10">
            <h2 className="text-xl font-bold mb-3">{t('pages.freight.cta.title', 'Ready to Optimize Your Freight Operations?')}</h2>
            <p className="mb-4">{t('pages.freight.cta.description', 'Contact us today to discuss your freight forwarding needs and discover how MoogShip can enhance your global logistics operations.')}</p>
            <div className="flex flex-wrap gap-3">
              <a href="/auth" className="inline-flex items-center justify-center px-4 py-2 rounded-md bg-blue-600 text-white hover:bg-blue-700 transition-colors">
                {t('pages.freight.cta.getStarted', 'Get Started')}
              </a>
              <a href="/company/contact" className="inline-flex items-center justify-center px-4 py-2 rounded-md border border-blue-600 text-blue-600 hover:bg-blue-50 transition-colors">
                {t('pages.freight.cta.requestQuote', 'Request a Quote')}
              </a>
            </div>
          </div>
        </div>
      }
    />
  );
}