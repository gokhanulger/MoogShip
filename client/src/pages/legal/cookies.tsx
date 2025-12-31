import { useTranslation } from 'react-i18next';
import GenericPageTemplate from '../generic-page-template';

export default function CookiesPage() {
  const { t } = useTranslation();
  
  return (
    <GenericPageTemplate
      title={t('pages.cookies.title', 'Cookies Policy')}
      subtitle={t('pages.cookies.subtitle', 'How we use cookies and similar technologies')}
      content={
        <div className="text-gray-700">
          <p className="mb-4">
            {t('pages.cookies.lastUpdated', 'Last Updated: April 30, 2025')}
          </p>
          
          <div className="space-y-6">
            <section>
              <h2 className="text-xl font-bold mb-3 text-gray-900">{t('pages.cookies.sections.introduction.title', '1. Introduction')}</h2>
              <p className="mb-3">
                {t('pages.cookies.sections.introduction.p1', 'This Cookies Policy explains how MoogShip Logistics Inc. ("MoogShip", "we", "us", or "our") uses cookies and similar technologies to recognize you when you visit our website and use our services (collectively, "Services"). It explains what these technologies are and why we use them, as well as your rights to control our use of them.')}
              </p>
              <p>
                {t('pages.cookies.sections.introduction.p2', 'In some cases, we may use cookies to collect personal information, or information that becomes personal information if we combine it with other data. In such cases, our Privacy Policy will apply in addition to this Cookies Policy.')}
              </p>
            </section>
            
            <section>
              <h2 className="text-xl font-bold mb-3 text-gray-900">{t('pages.cookies.sections.what.title', '2. What Are Cookies?')}</h2>
              <p className="mb-3">
                {t('pages.cookies.sections.what.p1', 'Cookies are small data files that are placed on your computer or mobile device when you visit a website. Cookies are widely used by website owners to make their websites work, or to work more efficiently, as well as to provide reporting information.')}
              </p>
              <p>
                {t('pages.cookies.sections.what.p2', 'Cookies set by the website owner (in this case, MoogShip) are called "first-party cookies". Cookies set by parties other than the website owner are called "third-party cookies". Third-party cookies enable third-party features or functionality to be provided on or through the website (such as advertising, interactive content, and analytics). The parties that set these third-party cookies can recognize your computer both when it visits the website in question and also when it visits certain other websites.')}
              </p>
            </section>
            
            <section>
              <h2 className="text-xl font-bold mb-3 text-gray-900">{t('pages.cookies.sections.why.title', '3. Why Do We Use Cookies?')}</h2>
              <p className="mb-3">
                {t('pages.cookies.sections.why.p1', 'We use first-party and third-party cookies for several reasons. Some cookies are required for technical reasons for our Services to operate, and we refer to these as "essential" or "strictly necessary" cookies. Other cookies enable us to track and target the interests of our users to enhance the experience on our Services. Third parties use cookies through our Services for advertising, analytics, and other purposes.')}
              </p>
              <p>
                {t('pages.cookies.sections.why.p2', 'The specific types of first and third-party cookies used through our Services and the purposes they perform are described below.')}
              </p>
            </section>
            
            <section>
              <h2 className="text-xl font-bold mb-3 text-gray-900">{t('pages.cookies.sections.types.title', '4. Types of Cookies We Use')}</h2>
              
              <h3 className="text-lg font-semibold mb-2 text-gray-900">{t('pages.cookies.sections.types.essential.title', 'Essential Cookies')}</h3>
              <p className="mb-3">
                {t('pages.cookies.sections.types.essential.p1', 'These cookies are strictly necessary to provide you with services available through our Services and to use some of its features, such as access to secure areas. Because these cookies are strictly necessary to deliver the Services, you cannot refuse them without impacting the functionality of our Services.')}
              </p>
              <div className="bg-gray-50 p-4 rounded-lg mb-4">
                <h4 className="font-medium text-gray-900 mb-1">{t('pages.cookies.sections.types.essential.examples', 'Examples:')}</h4>
                <ul className="list-disc pl-5 space-y-1 text-sm">
                  <li>{t('pages.cookies.sections.types.essential.example1', 'Cookies used to authenticate users and prevent fraudulent use of accounts')}</li>
                  <li>{t('pages.cookies.sections.types.essential.example2', 'Cookies used to remember items you\'ve placed in your shopping cart')}</li>
                  <li>{t('pages.cookies.sections.types.essential.example3', 'Cookies that allow our Services to remember choices you make (such as language preferences)')}</li>
                </ul>
              </div>
              
              <h3 className="text-lg font-semibold mb-2 text-gray-900">{t('pages.cookies.sections.types.performance.title', 'Performance and Analytics Cookies')}</h3>
              <p className="mb-3">
                {t('pages.cookies.sections.types.performance.p1', 'These cookies collect information about how visitors use our Services, for instance which pages visitors go to most often, and if they get error messages from web pages. These cookies don\'t collect information that identifies a visitor. All information these cookies collect is aggregated and therefore anonymous. It is only used to improve how our Services work.')}
              </p>
              <div className="bg-gray-50 p-4 rounded-lg mb-4">
                <h4 className="font-medium text-gray-900 mb-1">{t('pages.cookies.sections.types.performance.examples', 'Examples:')}</h4>
                <ul className="list-disc pl-5 space-y-1 text-sm">
                  <li>{t('pages.cookies.sections.types.performance.example1', 'Google Analytics cookies to help us analyze how users use our Services')}</li>
                  <li>{t('pages.cookies.sections.types.performance.example2', 'Cookies that measure and improve website performance')}</li>
                  <li>{t('pages.cookies.sections.types.performance.example3', 'Cookies that help us understand how users interact with our Services')}</li>
                </ul>
              </div>
              
              <h3 className="text-lg font-semibold mb-2 text-gray-900">{t('pages.cookies.sections.types.functional.title', 'Functionality Cookies')}</h3>
              <p className="mb-3">
                {t('pages.cookies.sections.types.functional.p1', 'These cookies allow our Services to remember choices you make (such as your user name, language, or the region you are in) and provide enhanced, more personal features. They may also be used to provide services you have asked for, such as watching a video or commenting on a blog. The information these cookies collect may be anonymized and they cannot track your browsing activity on other websites.')}
              </p>
              <div className="bg-gray-50 p-4 rounded-lg mb-4">
                <h4 className="font-medium text-gray-900 mb-1">{t('pages.cookies.sections.types.functional.examples', 'Examples:')}</h4>
                <ul className="list-disc pl-5 space-y-1 text-sm">
                  <li>{t('pages.cookies.sections.types.functional.example1', 'Cookies that remember your language preference')}</li>
                  <li>{t('pages.cookies.sections.types.functional.example2', 'Cookies that remember your previous shipping settings')}</li>
                  <li>{t('pages.cookies.sections.types.functional.example3', 'Cookies that allow you to use chat features and social sharing')}</li>
                </ul>
              </div>
              
              <h3 className="text-lg font-semibold mb-2 text-gray-900">{t('pages.cookies.sections.types.targeting.title', 'Targeting and Advertising Cookies')}</h3>
              <p className="mb-3">
                {t('pages.cookies.sections.types.targeting.p1', 'These cookies are used to deliver advertisements more relevant to you and your interests. They are also used to limit the number of times you see an advertisement as well as help measure the effectiveness of an advertising campaign. They are usually placed by advertising networks with the website operator\'s permission. They remember that you have visited a website and this information is shared with other organizations such as advertisers.')}
              </p>
              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="font-medium text-gray-900 mb-1">{t('pages.cookies.sections.types.targeting.examples', 'Examples:')}</h4>
                <ul className="list-disc pl-5 space-y-1 text-sm">
                  <li>{t('pages.cookies.sections.types.targeting.example1', 'Cookies used to show relevant advertising on other websites')}</li>
                  <li>{t('pages.cookies.sections.types.targeting.example2', 'Cookies used to measure the effectiveness of advertising campaigns')}</li>
                  <li>{t('pages.cookies.sections.types.targeting.example3', 'Cookies used for retargeting (showing you ads based on your past interactions with our Services)')}</li>
                </ul>
              </div>
            </section>
            
            <section>
              <h2 className="text-xl font-bold mb-3 text-gray-900">{t('pages.cookies.sections.control.title', '5. How Can You Control Cookies?')}</h2>
              
              <h3 className="text-lg font-semibold mb-2 text-gray-900">{t('pages.cookies.sections.control.browser.title', 'Browser Controls')}</h3>
              <p className="mb-3">
                {t('pages.cookies.sections.control.browser.p1', 'Most web browsers allow you to manage your cookie preferences. You can set your browser to refuse cookies or delete certain cookies. Generally you can also manage similar technologies in the same way that you manage cookies – using your browsers preferences.')}
              </p>
              <p className="mb-3">
                {t('pages.cookies.sections.control.browser.p2', 'Please note that if you choose to block cookies, this may impair or prevent due functioning of our Services.')}
              </p>
              
              <h3 className="text-lg font-semibold mb-2 text-gray-900">{t('pages.cookies.sections.control.consent.title', 'Consent Management')}</h3>
              <p className="mb-3">
                {t('pages.cookies.sections.control.consent.p1', 'When you first visit our Services, we will present you with a cookie banner that allows you to accept or decline non-essential cookies. You can change your preferences at any time through our cookie settings interface accessible via the link in the footer of our website.')}
              </p>
              
              <h3 className="text-lg font-semibold mb-2 text-gray-900">{t('pages.cookies.sections.control.optout.title', 'Analytics Opt-Out')}</h3>
              <p>
                {t('pages.cookies.sections.control.optout.p1', 'To opt-out of Google Analytics tracking, you can use the Google Analytics Opt-Out Browser Add-on, available at https://tools.google.com/dlpage/gaoptout.')}
              </p>
            </section>
            
            <section>
              <h2 className="text-xl font-bold mb-3 text-gray-900">{t('pages.cookies.sections.other.title', '6. Other Tracking Technologies')}</h2>
              <p className="mb-3">
                {t('pages.cookies.sections.other.p1', 'Cookies are not the only way to recognize or track visitors to a website. We may use other, similar technologies from time to time, like web beacons (sometimes called "tracking pixels" or "clear gifs"). These are tiny graphics files that contain a unique identifier that enable us to recognize when someone has visited our Services. This allows us, for example, to monitor the traffic patterns of users from one page within our Services to another, to deliver or communicate with cookies, to understand whether you have come to our Services from an online advertisement displayed on a third-party website, to improve site performance, and to measure the success of email marketing campaigns. In many instances, these technologies are reliant on cookies to function properly, and so declining cookies will impair their functioning.')}
              </p>
            </section>
            
            <section>
              <h2 className="text-xl font-bold mb-3 text-gray-900">{t('pages.cookies.sections.updates.title', '7. Updates to This Cookie Policy')}</h2>
              <p className="mb-3">
                {t('pages.cookies.sections.updates.p1', 'We may update this Cookies Policy from time to time in order to reflect, for example, changes to the cookies we use or for other operational, legal, or regulatory reasons. Please therefore revisit this Cookies Policy regularly to stay informed about our use of cookies and related technologies.')}
              </p>
              <p>
                {t('pages.cookies.sections.updates.p2', 'The date at the top of this Cookies Policy indicates when it was last updated.')}
              </p>
            </section>
            
            <section>
              <h2 className="text-xl font-bold mb-3 text-gray-900">{t('pages.cookies.sections.contact.title', '8. Contact Us')}</h2>
              <p>
                {t('pages.cookies.sections.contact.p1', 'If you have any questions about our use of cookies or other technologies, please contact us at:')}
              </p>
              <address className="mt-3 not-italic">
                {t('pages.cookies.sections.contact.name', 'MoogShip Logistics Inc.')}<br />
                {t('pages.cookies.sections.contact.email', 'Email: privacy@moogship.com')}
              </address>
            </section>
            
            <section className="bg-gray-50 p-6 rounded-lg">
              <h2 className="text-xl font-bold mb-3 text-gray-900">{t('pages.cookies.sections.summary.title', 'Cookie Summary Table')}</h2>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead>
                    <tr>
                      <th className="px-4 py-3 bg-gray-100 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">{t('pages.cookies.sections.summary.category', 'Category')}</th>
                      <th className="px-4 py-3 bg-gray-100 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">{t('pages.cookies.sections.summary.purpose', 'Purpose')}</th>
                      <th className="px-4 py-3 bg-gray-100 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">{t('pages.cookies.sections.summary.duration', 'Duration')}</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    <tr>
                      <td className="px-4 py-2 whitespace-nowrap text-sm font-medium text-gray-800">{t('pages.cookies.sections.summary.essential', 'Essential')}</td>
                      <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-600">{t('pages.cookies.sections.summary.essentialPurpose', 'Authentication, security, basic functionality')}</td>
                      <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-600">{t('pages.cookies.sections.summary.session', 'Session / 1 year')}</td>
                    </tr>
                    <tr>
                      <td className="px-4 py-2 whitespace-nowrap text-sm font-medium text-gray-800">{t('pages.cookies.sections.summary.performance', 'Performance')}</td>
                      <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-600">{t('pages.cookies.sections.summary.performancePurpose', 'Analytics, usage statistics')}</td>
                      <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-600">{t('pages.cookies.sections.summary.year', '1-2 years')}</td>
                    </tr>
                    <tr>
                      <td className="px-4 py-2 whitespace-nowrap text-sm font-medium text-gray-800">{t('pages.cookies.sections.summary.functional', 'Functional')}</td>
                      <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-600">{t('pages.cookies.sections.summary.functionalPurpose', 'Preferences, user experience enhancements')}</td>
                      <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-600">{t('pages.cookies.sections.summary.year', '1 year')}</td>
                    </tr>
                    <tr>
                      <td className="px-4 py-2 whitespace-nowrap text-sm font-medium text-gray-800">{t('pages.cookies.sections.summary.targeting', 'Targeting')}</td>
                      <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-600">{t('pages.cookies.sections.summary.targetingPurpose', 'Advertising, marketing measurement')}</td>
                      <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-600">{t('pages.cookies.sections.summary.days', '90-180 days')}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </section>
          </div>
        </div>
      }
    />
  );
}