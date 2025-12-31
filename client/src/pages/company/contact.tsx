import { useTranslation } from 'react-i18next';
import GenericPageTemplate from '../generic-page-template';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export default function ContactPage() {
  const { t } = useTranslation();
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Form handling would go here
  };
  
  return (
    <GenericPageTemplate
      title={t('pages.contact.title', 'Contact Us')}
      subtitle={t('pages.contact.subtitle', 'Get in touch with our team')}
      content={
        <div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-12">
            <div>
              <h2 className="text-xl font-semibold mb-4">{t('pages.contact.form.title', 'Send us a message')}</h2>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                    {t('pages.contact.form.name', 'Your Name')} *
                  </label>
                  <Input 
                    id="name" 
                    name="name" 
                    type="text" 
                    required 
                    placeholder={t('pages.contact.form.namePlaceholder', 'Enter your full name')}
                  />
                </div>
                
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                    {t('pages.contact.form.email', 'Email Address')} *
                  </label>
                  <Input 
                    id="email" 
                    name="email" 
                    type="email" 
                    required 
                    placeholder={t('pages.contact.form.emailPlaceholder', 'Enter your email address')}
                  />
                </div>
                
                <div>
                  <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">
                    {t('pages.contact.form.phone', 'Phone Number')}
                  </label>
                  <Input 
                    id="phone" 
                    name="phone" 
                    type="tel" 
                    placeholder={t('pages.contact.form.phonePlaceholder', 'Enter your phone number (optional)')}
                  />
                </div>
                
                <div>
                  <label htmlFor="inquiry" className="block text-sm font-medium text-gray-700 mb-1">
                    {t('pages.contact.form.inquiry', 'Type of Inquiry')} *
                  </label>
                  <Select name="inquiry">
                    <SelectTrigger>
                      <SelectValue placeholder={t('pages.contact.form.selectInquiry', 'Select inquiry type')} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="general">{t('pages.contact.form.inquiryTypes.general', 'General Information')}</SelectItem>
                      <SelectItem value="sales">{t('pages.contact.form.inquiryTypes.sales', 'Sales & Pricing')}</SelectItem>
                      <SelectItem value="support">{t('pages.contact.form.inquiryTypes.support', 'Technical Support')}</SelectItem>
                      <SelectItem value="partnership">{t('pages.contact.form.inquiryTypes.partnership', 'Partnership Opportunity')}</SelectItem>
                      <SelectItem value="other">{t('pages.contact.form.inquiryTypes.other', 'Other')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <label htmlFor="message" className="block text-sm font-medium text-gray-700 mb-1">
                    {t('pages.contact.form.message', 'Your Message')} *
                  </label>
                  <Textarea 
                    id="message" 
                    name="message" 
                    required 
                    rows={5}
                    placeholder={t('pages.contact.form.messagePlaceholder', 'How can we help you?')}
                    className="resize-none"
                  />
                </div>
                
                <div className="pt-2">
                  <Button type="submit" className="w-full">
                    {t('pages.contact.form.submit', 'Send Message')}
                  </Button>
                </div>
              </form>
            </div>
            
            <div>
              <h2 className="text-xl font-semibold mb-4">{t('pages.contact.info.title', 'Contact Information')}</h2>
              
              <div className="space-y-6">
                <div>
                  <h3 className="font-medium text-gray-900">{t('pages.contact.info.headquarters', 'Headquarters')}</h3>
                  <address className="not-italic mt-1 text-gray-600">
                    MoogShip Logistics Inc.<br />
                    Levent Mahallesi, Büyükdere Caddesi<br />
                    No: 201, D:801<br />
                    34394 Şişli/İstanbul<br />
                    Turkey
                  </address>
                </div>
                
                <div>
                  <h3 className="font-medium text-gray-900">{t('pages.contact.info.customerSupport', 'Customer Support')}</h3>
                  <p className="mt-1 text-gray-600">{t('pages.contact.info.supportHours', 'Monday-Friday: 9am - 6pm (GMT+3)')}</p>
                  <p className="mt-1">
                    <a href="mailto:support@moogship.com" className="text-blue-600 hover:underline">support@moogship.com</a>
                  </p>
                  <p className="mt-1">
                    <a href="tel:+902121234567" className="text-blue-600 hover:underline">+90 212 123 4567</a>
                  </p>
                </div>
                
                <div>
                  <h3 className="font-medium text-gray-900">{t('pages.contact.info.sales', 'Sales Inquiries')}</h3>
                  <p className="mt-1">
                    <a href="mailto:sales@moogship.com" className="text-blue-600 hover:underline">sales@moogship.com</a>
                  </p>
                  <p className="mt-1">
                    <a href="tel:+902121234568" className="text-blue-600 hover:underline">+90 212 123 4568</a>
                  </p>
                </div>
                
                <div className="pt-4">
                  <h3 className="font-medium text-gray-900 mb-2">{t('pages.contact.info.followUs', 'Follow Us')}</h3>
                  <div className="flex space-x-4">
                    {['facebook', 'twitter', 'linkedin', 'instagram'].map((social) => (
                      <a 
                        key={social} 
                        href={`https://www.${social}.com/moogship`}
                        target="_blank"
                        rel="noopener noreferrer" 
                        className="text-gray-600 hover:text-blue-600"
                      >
                        <span className="sr-only">{social}</span>
                        <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
                          <span className="text-sm">{social[0].toUpperCase()}</span>
                        </div>
                      </a>
                    ))}
                  </div>
                </div>
              </div>
              
              <div className="mt-8">
                <h3 className="font-medium text-gray-900 mb-2">{t('pages.contact.info.map', 'Our Location')}</h3>
                <div className="h-64 bg-gray-200 rounded-lg flex items-center justify-center text-gray-500">
                  {t('pages.contact.info.mapPlaceholder', 'Map would be displayed here')}
                </div>
              </div>
            </div>
          </div>
          
          <div className="mt-12 pt-8 border-t border-gray-200">
            <h2 className="text-xl font-semibold mb-4">{t('pages.contact.faq.title', 'Frequently Asked Questions')}</h2>
            <div className="space-y-6">
              <div>
                <h3 className="font-medium text-gray-900">{t('pages.contact.faq.q1', 'How quickly can I expect a response?')}</h3>
                <p className="mt-1 text-gray-600">{t('pages.contact.faq.a1', 'We typically respond to all inquiries within 24 hours during business days. For urgent matters, please contact our customer support phone line.')}</p>
              </div>
              
              <div>
                <h3 className="font-medium text-gray-900">{t('pages.contact.faq.q2', 'I need help with a shipment. What information should I provide?')}</h3>
                <p className="mt-1 text-gray-600">{t('pages.contact.faq.a2', 'Please include your tracking number, order details, and a description of the issue you\'re experiencing. Screenshots or photos of any relevant information can also be helpful.')}</p>
              </div>
              
              <div>
                <h3 className="font-medium text-gray-900">{t('pages.contact.faq.q3', 'Do you have offices in other countries?')}</h3>
                <p className="mt-1 text-gray-600">{t('pages.contact.faq.a3', 'In addition to our headquarters in Istanbul, we have representative offices in Berlin, London, and Dubai. We provide support in multiple languages regardless of your location.')}</p>
              </div>
            </div>
          </div>
        </div>
      }
    />
  );
}