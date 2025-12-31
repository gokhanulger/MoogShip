import { useTranslation } from 'react-i18next';
import GenericPageTemplate from '../generic-page-template';

export default function ShippingRegulationsPage() {
  const { t } = useTranslation();
  
  return (
    <GenericPageTemplate
      title={t('pages.shippingReg.title', 'Shipping Regulations')}
      subtitle={t('pages.shippingReg.subtitle', 'Important information about shipping restrictions and regulations')}
      content={
        <div className="text-gray-700">
          <p className="mb-4">
            {t('pages.shippingReg.lastUpdated', 'Last Updated: April 30, 2025')}
          </p>
          
          <div className="space-y-6">
            <section>
              <h2 className="text-xl font-bold mb-3 text-gray-900">{t('pages.shippingReg.sections.introduction.title', 'Introduction')}</h2>
              <p className="mb-3">
                {t('pages.shippingReg.sections.introduction.p1', 'MoogShip is committed to complying with all applicable shipping regulations and laws across the countries and regions we serve. This page provides important information about shipping restrictions, prohibited items, and regulatory requirements that may affect your shipments.')}
              </p>
              <p>
                {t('pages.shippingReg.sections.introduction.p2', 'Please review this information carefully before using our shipping services. Non-compliance with these regulations may result in delays, confiscation of goods, penalties, or other legal consequences.')}
              </p>
            </section>
            
            <section>
              <h2 className="text-xl font-bold mb-3 text-gray-900">{t('pages.shippingReg.sections.prohibited.title', 'Prohibited Items')}</h2>
              <p className="mb-3">
                {t('pages.shippingReg.sections.prohibited.p1', 'The following items are generally prohibited from being shipped through our services. Please note that this list is not exhaustive, and restrictions may vary by country or carrier:')}
              </p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div className="bg-red-50 p-4 rounded-lg">
                  <h3 className="font-semibold text-red-800 mb-2">{t('pages.shippingReg.sections.prohibited.dangerous.title', 'Dangerous Goods')}</h3>
                  <ul className="list-disc pl-5 space-y-1 text-sm">
                    <li>{t('pages.shippingReg.sections.prohibited.dangerous.explosives', 'Explosives (fireworks, ammunition, etc.)')}</li>
                    <li>{t('pages.shippingReg.sections.prohibited.dangerous.gases', 'Compressed gases (aerosols, gas cylinders)')}</li>
                    <li>{t('pages.shippingReg.sections.prohibited.dangerous.flammable', 'Flammable liquids and solids')}</li>
                    <li>{t('pages.shippingReg.sections.prohibited.dangerous.oxidizing', 'Oxidizing substances and organic peroxides')}</li>
                    <li>{t('pages.shippingReg.sections.prohibited.dangerous.toxic', 'Toxic and infectious substances')}</li>
                    <li>{t('pages.shippingReg.sections.prohibited.dangerous.radioactive', 'Radioactive materials')}</li>
                    <li>{t('pages.shippingReg.sections.prohibited.dangerous.corrosives', 'Corrosives')}</li>
                  </ul>
                </div>
                
                <div className="bg-red-50 p-4 rounded-lg">
                  <h3 className="font-semibold text-red-800 mb-2">{t('pages.shippingReg.sections.prohibited.illegal.title', 'Illegal Items')}</h3>
                  <ul className="list-disc pl-5 space-y-1 text-sm">
                    <li>{t('pages.shippingReg.sections.prohibited.illegal.narcotics', 'Narcotics and controlled substances')}</li>
                    <li>{t('pages.shippingReg.sections.prohibited.illegal.counterfeit', 'Counterfeit goods or currency')}</li>
                    <li>{t('pages.shippingReg.sections.prohibited.illegal.obscene', 'Obscene materials (where prohibited)')}</li>
                    <li>{t('pages.shippingReg.sections.prohibited.illegal.weapons', 'Illegal weapons and parts')}</li>
                    <li>{t('pages.shippingReg.sections.prohibited.illegal.gambling', 'Gambling devices (where prohibited)')}</li>
                  </ul>
                </div>
                
                <div className="bg-red-50 p-4 rounded-lg">
                  <h3 className="font-semibold text-red-800 mb-2">{t('pages.shippingReg.sections.prohibited.perishable.title', 'Perishable Items')}</h3>
                  <ul className="list-disc pl-5 space-y-1 text-sm">
                    <li>{t('pages.shippingReg.sections.prohibited.perishable.food', 'Perishable food items (unless specifically arranged)')}</li>
                    <li>{t('pages.shippingReg.sections.prohibited.perishable.plants', 'Plants and seeds (without proper documentation)')}</li>
                    <li>{t('pages.shippingReg.sections.prohibited.perishable.animals', 'Live animals')}</li>
                  </ul>
                </div>
                
                <div className="bg-red-50 p-4 rounded-lg">
                  <h3 className="font-semibold text-red-800 mb-2">{t('pages.shippingReg.sections.prohibited.other.title', 'Other Restricted Items')}</h3>
                  <ul className="list-disc pl-5 space-y-1 text-sm">
                    <li>{t('pages.shippingReg.sections.prohibited.other.human', 'Human remains or ashes')}</li>
                    <li>{t('pages.shippingReg.sections.prohibited.other.ivory', 'Ivory and endangered species products')}</li>
                    <li>{t('pages.shippingReg.sections.prohibited.other.precious', 'Precious stones and metals (unless insured)')}</li>
                    <li>{t('pages.shippingReg.sections.prohibited.other.cash', 'Cash, bearer instruments, and securities')}</li>
                    <li>{t('pages.shippingReg.sections.prohibited.other.personal', 'Personal effects (without proper documentation)')}</li>
                  </ul>
                </div>
              </div>
              
              <p className="mb-3">
                {t('pages.shippingReg.sections.prohibited.p2', 'Some items may be shipped with special handling, documentation, or packaging. Please contact our customer service team before shipping any items that may be subject to restrictions.')}
              </p>
              
              <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <p className="text-sm text-yellow-700">
                      {t('pages.shippingReg.sections.prohibited.warning', 'Shipping prohibited items may result in confiscation, fines, or criminal penalties. MoogShip reserves the right to refuse, return, or dispose of any shipment containing prohibited items.')}
                    </p>
                  </div>
                </div>
              </div>
            </section>
            
            <section>
              <h2 className="text-xl font-bold mb-3 text-gray-900">{t('pages.shippingReg.sections.restricted.title', 'Country-Specific Restrictions')}</h2>
              <p className="mb-3">
                {t('pages.shippingReg.sections.restricted.p1', 'Many countries have specific import restrictions in addition to the general prohibited items listed above. Here are some notable examples, but please consult with our shipping experts for the most current information for your destination country:')}
              </p>
              
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead>
                    <tr>
                      <th className="px-4 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('pages.shippingReg.sections.restricted.country', 'Country/Region')}</th>
                      <th className="px-4 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('pages.shippingReg.sections.restricted.restrictions', 'Notable Restrictions')}</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    <tr>
                      <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">{t('pages.shippingReg.sections.restricted.countries.usa', 'United States')}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        <ul className="list-disc pl-5 space-y-1">
                          <li>{t('pages.shippingReg.sections.restricted.countries.usa1', 'Cuban products')}</li>
                          <li>{t('pages.shippingReg.sections.restricted.countries.usa2', 'Certain agricultural products')}</li>
                          <li>{t('pages.shippingReg.sections.restricted.countries.usa3', 'Products from sanctioned countries')}</li>
                        </ul>
                      </td>
                    </tr>
                    <tr>
                      <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">{t('pages.shippingReg.sections.restricted.countries.eu', 'European Union')}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        <ul className="list-disc pl-5 space-y-1">
                          <li>{t('pages.shippingReg.sections.restricted.countries.eu1', 'Products not compliant with CE marking')}</li>
                          <li>{t('pages.shippingReg.sections.restricted.countries.eu2', 'Certain dairy and meat products')}</li>
                          <li>{t('pages.shippingReg.sections.restricted.countries.eu3', 'Products subject to intellectual property rights')}</li>
                        </ul>
                      </td>
                    </tr>
                    <tr>
                      <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">{t('pages.shippingReg.sections.restricted.countries.china', 'China')}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        <ul className="list-disc pl-5 space-y-1">
                          <li>{t('pages.shippingReg.sections.restricted.countries.china1', 'Political materials')}</li>
                          <li>{t('pages.shippingReg.sections.restricted.countries.china2', 'Used electronics and machinery')}</li>
                          <li>{t('pages.shippingReg.sections.restricted.countries.china3', 'Certain media and publications')}</li>
                        </ul>
                      </td>
                    </tr>
                    <tr>
                      <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">{t('pages.shippingReg.sections.restricted.countries.australia', 'Australia')}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        <ul className="list-disc pl-5 space-y-1">
                          <li>{t('pages.shippingReg.sections.restricted.countries.australia1', 'Biological materials')}</li>
                          <li>{t('pages.shippingReg.sections.restricted.countries.australia2', 'Wood products without treatment certification')}</li>
                          <li>{t('pages.shippingReg.sections.restricted.countries.australia3', 'Soil, seeds, and plant materials')}</li>
                        </ul>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </section>
            
            <section>
              <h2 className="text-xl font-bold mb-3 text-gray-900">{t('pages.shippingReg.sections.customs.title', 'Customs Documentation')}</h2>
              <p className="mb-3">
                {t('pages.shippingReg.sections.customs.p1', 'Proper customs documentation is essential for international shipments. The following documents are typically required:')}
              </p>
              
              <div className="space-y-4 mb-4">
                <div className="flex items-start">
                  <div className="h-8 w-8 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 mr-3 flex-shrink-0">
                    <span className="font-semibold">1</span>
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">{t('pages.shippingReg.sections.customs.commercial.title', 'Commercial Invoice')}</h3>
                    <p className="text-gray-600">{t('pages.shippingReg.sections.customs.commercial.description', 'Details the goods being shipped, their value, quantity, and country of origin. Must be signed and dated by the shipper.')}</p>
                  </div>
                </div>
                
                <div className="flex items-start">
                  <div className="h-8 w-8 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 mr-3 flex-shrink-0">
                    <span className="font-semibold">2</span>
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">{t('pages.shippingReg.sections.customs.packing.title', 'Packing List')}</h3>
                    <p className="text-gray-600">{t('pages.shippingReg.sections.customs.packing.description', 'Lists all items in the shipment with their quantities, dimensions, and weight.')}</p>
                  </div>
                </div>
                
                <div className="flex items-start">
                  <div className="h-8 w-8 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 mr-3 flex-shrink-0">
                    <span className="font-semibold">3</span>
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">{t('pages.shippingReg.sections.customs.origin.title', 'Certificate of Origin')}</h3>
                    <p className="text-gray-600">{t('pages.shippingReg.sections.customs.origin.description', 'Documents the country where the goods were manufactured. May be required for certain goods or to benefit from preferential duty rates under trade agreements.')}</p>
                  </div>
                </div>
                
                <div className="flex items-start">
                  <div className="h-8 w-8 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 mr-3 flex-shrink-0">
                    <span className="font-semibold">4</span>
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">{t('pages.shippingReg.sections.customs.declaration.title', 'Customs Declaration Form')}</h3>
                    <p className="text-gray-600">{t('pages.shippingReg.sections.customs.declaration.description', 'Official form stating the contents, value, and purpose of the shipment (commercial or non-commercial).')}</p>
                  </div>
                </div>
                
                <div className="flex items-start">
                  <div className="h-8 w-8 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 mr-3 flex-shrink-0">
                    <span className="font-semibold">5</span>
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">{t('pages.shippingReg.sections.customs.specific.title', 'Product-Specific Certificates')}</h3>
                    <p className="text-gray-600">{t('pages.shippingReg.sections.customs.specific.description', 'Depending on the product, additional certificates may be required, such as health certificates, phytosanitary certificates, or conformity certificates.')}</p>
                  </div>
                </div>
              </div>
              
              <p>
                {t('pages.shippingReg.sections.customs.p2', 'MoogShip\'s platform helps you generate the necessary customs documentation based on your shipment details. However, please ensure all information provided is accurate and complete to avoid customs delays or penalties.')}
              </p>
            </section>
            
            <section>
              <h2 className="text-xl font-bold mb-3 text-gray-900">{t('pages.shippingReg.sections.duties.title', 'Duties, Taxes, and Fees')}</h2>
              <p className="mb-3">
                {t('pages.shippingReg.sections.duties.p1', 'International shipments are subject to various duties, taxes, and fees imposed by destination countries:')}
              </p>
              
              <ul className="list-disc pl-5 space-y-2">
                <li>
                  <strong>{t('pages.shippingReg.sections.duties.import.title', 'Import Duties:')}</strong> {t('pages.shippingReg.sections.duties.import.description', 'Taxes levied on imported goods, typically calculated as a percentage of the declared value. Rates vary by product category and country.')}
                </li>
                <li>
                  <strong>{t('pages.shippingReg.sections.duties.vat.title', 'Value-Added Tax (VAT) / Sales Tax:')}</strong> {t('pages.shippingReg.sections.duties.vat.description', 'Additional tax applied to the value of the goods plus import duties. VAT rates vary by country.')}
                </li>
                <li>
                  <strong>{t('pages.shippingReg.sections.duties.excise.title', 'Excise Duties:')}</strong> {t('pages.shippingReg.sections.duties.excise.description', 'Special taxes on specific goods like alcohol, tobacco, or luxury items.')}
                </li>
                <li>
                  <strong>{t('pages.shippingReg.sections.duties.handling.title', 'Customs Handling Fees:')}</strong> {t('pages.shippingReg.sections.duties.handling.description', 'Administrative fees charged by customs authorities or carriers for processing and clearance.')}
                </li>
              </ul>
              
              <div className="bg-blue-50 border-l-4 border-blue-400 p-4 mt-4">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <p className="text-sm text-blue-700">
                      {t('pages.shippingReg.sections.duties.note', 'Note: MoogShip offers Delivered Duty Paid (DDP) and Delivered At Place (DAP) shipping options. With DDP, duties and taxes are paid by the shipper, while with DAP, they are paid by the recipient. Choose the option that best suits your needs when creating a shipment.')}
                    </p>
                  </div>
                </div>
              </div>
            </section>
            
            <section>
              <h2 className="text-xl font-bold mb-3 text-gray-900">{t('pages.shippingReg.sections.packaging.title', 'Packaging Requirements')}</h2>
              <p className="mb-3">
                {t('pages.shippingReg.sections.packaging.p1', 'Proper packaging is essential for international shipping to ensure that goods arrive safely and comply with regulations:')}
              </p>
              
              <ul className="list-disc pl-5 space-y-2">
                <li>{t('pages.shippingReg.sections.packaging.secure', 'All items must be securely packaged to withstand normal handling during transportation.')}</li>
                <li>{t('pages.shippingReg.sections.packaging.materials', 'Use appropriate cushioning materials to protect contents from damage.')}</li>
                <li>{t('pages.shippingReg.sections.packaging.sealed', 'Packages must be sealed with appropriate tape (not string or paper wrap).')}</li>
                <li>{t('pages.shippingReg.sections.packaging.labels', 'All packages must be clearly labeled with sender and recipient information.')}</li>
                <li>{t('pages.shippingReg.sections.packaging.hazardous', 'Hazardous materials (when permitted) must use UN-approved packaging with appropriate hazard labels.')}</li>
                <li>{t('pages.shippingReg.sections.packaging.wood', 'Wooden packaging materials must comply with ISPM-15 standards (heat-treated and stamped).')}</li>
              </ul>
              
              <p className="mt-3">
                {t('pages.shippingReg.sections.packaging.p2', 'MoogShip offers packaging guidelines and materials to help ensure your shipments comply with international standards. Please contact customer service for specific packaging requirements for sensitive or regulated items.')}
              </p>
            </section>
            
            <section>
              <h2 className="text-xl font-bold mb-3 text-gray-900">{t('pages.shippingReg.sections.compliance.title', 'Compliance and Liability')}</h2>
              <p className="mb-3">
                {t('pages.shippingReg.sections.compliance.p1', 'As the shipper, you are responsible for ensuring that:')}
              </p>
              
              <ul className="list-disc pl-5 space-y-1">
                <li>{t('pages.shippingReg.sections.compliance.prohibited', 'Your shipments do not contain prohibited items.')}</li>
                <li>{t('pages.shippingReg.sections.compliance.documentation', 'All customs documentation is complete, accurate, and truthful.')}</li>
                <li>{t('pages.shippingReg.sections.compliance.licenses', 'You have obtained any necessary licenses or permits for controlled items.')}</li>
                <li>{t('pages.shippingReg.sections.compliance.packaging', 'Your packages meet all packaging requirements.')}</li>
                <li>{t('pages.shippingReg.sections.compliance.laws', 'Your shipments comply with all applicable laws in origin, destination, and transit countries.')}</li>
              </ul>
              
              <p className="mt-3 font-medium">
                {t('pages.shippingReg.sections.compliance.p2', 'MoogShip reserves the right to:')}
              </p>
              
              <ul className="list-disc pl-5 space-y-1 mb-3">
                <li>{t('pages.shippingReg.sections.compliance.inspect', 'Inspect any shipment as required by law or safety concerns.')}</li>
                <li>{t('pages.shippingReg.sections.compliance.refuse', 'Refuse, hold, or return any shipment that violates applicable regulations.')}</li>
                <li>{t('pages.shippingReg.sections.compliance.cooperate', 'Cooperate with authorities regarding any shipment containing prohibited items.')}</li>
                <li>{t('pages.shippingReg.sections.compliance.recover', 'Recover from the shipper any fines, penalties, or costs incurred due to non-compliant shipments.')}</li>
              </ul>
              
              <p>
                {t('pages.shippingReg.sections.compliance.p3', 'By using MoogShip\'s services, you agree to indemnify and hold harmless MoogShip from any claims, losses, damages, or expenses arising from your failure to comply with these regulations.')}
              </p>
            </section>
            
            <section>
              <h2 className="text-xl font-bold mb-3 text-gray-900">{t('pages.shippingReg.sections.contact.title', 'Contact Us')}</h2>
              <p>
                {t('pages.shippingReg.sections.contact.p1', 'If you have questions about shipping regulations, prohibited items, or documentation requirements, please contact our compliance team at:')}
              </p>
              <address className="mt-3 not-italic">
                {t('pages.shippingReg.sections.contact.email', 'Email: compliance@moogship.com')}<br />
                {t('pages.shippingReg.sections.contact.phone', 'Phone: +90 212 555 4567')}
              </address>
            </section>
          </div>
        </div>
      }
    />
  );
}