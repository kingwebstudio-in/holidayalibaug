import React from 'react';
import { Link } from 'react-router-dom';
import { StaticPageLayout } from '../components/layout/StaticPageLayout';
import { useSeo } from '../hooks/useSeo';
import { ContactBlock, LegalShell } from './legalParts';

export const TermsPage: React.FC = () => {
  useSeo({ title: 'Terms & Conditions — HolidayAlibag', description: 'Terms for using HolidayAlibag.com: enquiry-only bookings, availability confirmation, property information and acceptable use.', path: '/terms-and-conditions' });
  return (
    <StaticPageLayout>
      <LegalShell title="Terms & Conditions" intro="These terms apply when you use HolidayAlibag.com, send an enquiry through it, or contact us as a result. By using the website you agree to them. If you do not agree, please do not use it.">
        <h2 id="enquiry-only">1. Enquiries are requests, not bookings</h2>
        <p>HolidayAlibag.com is an enquiry website. You cannot book or pay for a stay on it, and no payment is taken on the website.</p>
        <ul>
          <li>When you submit a booking enquiry you are asking us to check availability. Receiving a reference number or a “received” message only means your request was saved.</li>
          <li>A stay is <strong>confirmed only when our team confirms it to you directly</strong> after checking availability with the property, and tells you the final price and terms.</li>
          <li>Opening WhatsApp, or sending a WhatsApp message, does not confirm anything and is not proof of a booking.</li>
          <li>We may decline or be unable to fulfil any enquiry, for example if dates are unavailable or the group size exceeds a property’s capacity.</li>
        </ul>

        <h2 id="property-info">2. Property information</h2>
        <p>Villa descriptions, photographs, amenities, capacities, check-in and check-out times and house rules are provided in good faith for guidance and may change. Photographs may not show every angle or the exact condition on your dates. Each property has its own maximum guest number; you must not exceed it.</p>

        <h2 id="pricing">3. Pricing</h2>
        <p>Where a price is shown it is an indicative “from” rate per night and may vary with dates, season, the number of guests and any extras. Where it says “Price on enquiry” no price is published. The price our team confirms to you in writing is the price that applies. Taxes, deposits and extras (such as meals or activities) will be explained when a stay is confirmed.</p>

        <h2 id="cancellations">4. Cancellations and refunds</h2>
        <p>This website does not publish a standard cancellation or refund schedule. Cancellation, change and refund terms, and any deposit, are agreed with you in writing before a stay is confirmed and before any payment is requested. Please read them carefully at that time.</p>

        <h2 id="owners-investors">5. Villa-owner and investment enquiries</h2>
        <p>Submitting a villa-owner or property-investment enquiry is only an expression of interest. It does not create a partnership, listing, agency, sale or investment agreement. We do not give investment, legal or tax advice, and nothing on this website promises any return, occupancy or price.</p>

        <h2 id="acceptable-use">6. Acceptable use</h2>
        <p>You agree not to:</p>
        <ul>
          <li>give false or misleading information, or submit enquiries on someone else’s behalf without their permission;</li>
          <li>use bots, scrapers or other automated means to submit forms or copy the website’s content;</li>
          <li>try to gain unauthorised access to the website, the admin area or other users’ data, or disrupt the service;</li>
          <li>use the website for anything unlawful, abusive or fraudulent.</li>
        </ul>
        <p>We may block access or remove enquiries that breach these rules.</p>

        <h2 id="content">7. Our content</h2>
        <p>The website’s text, design, logos and photographs belong to HolidayAlibag or its licensors and may not be copied or reused without permission, except for your own personal, non-commercial use.</p>

        <h2 id="third-parties">8. Third-party services</h2>
        <p>The website may link to or use services run by others, such as WhatsApp. We are not responsible for those services, and their own terms and privacy policies apply to them.</p>

        <h2 id="liability">9. Our responsibility</h2>
        <p>We work to keep the website accurate and available, but we cannot promise that it will always be error-free or uninterrupted. To the extent the law allows, HolidayAlibag is not liable for indirect or consequential losses arising from your use of the website, or for decisions made solely on the information shown on it. Nothing in these terms limits any liability that cannot lawfully be limited, or affects your statutory rights as a consumer.</p>

        <h2 id="privacy">10. Privacy and cookies</h2>
        <p>How we handle personal information is explained in our <Link to="/privacy-policy">Privacy Policy</Link>.</p>

        <h2 id="law">11. Governing law</h2>
        <p>These terms are governed by the laws of India. Disputes are subject to the jurisdiction of the competent courts in India.</p>

        <h2 id="changes">12. Changes</h2>
        <p>We may update these terms from time to time. The “last updated” date above shows the current version; continuing to use the website after a change means you accept the updated terms.</p>

        <h2 id="contact">13. Contact</h2>
        <ContactBlock purpose="For questions about these terms." />
      </LegalShell>
    </StaticPageLayout>
  );
};
