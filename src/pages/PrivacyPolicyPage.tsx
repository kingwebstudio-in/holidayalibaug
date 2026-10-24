import React from 'react';
import { Link } from 'react-router-dom';
import { StaticPageLayout } from '../components/layout/StaticPageLayout';
import { useConsent } from '../components/consent/ConsentProvider';
import { useSeo } from '../hooks/useSeo';
import { ContactBlock, LegalShell } from './legalParts';

export const PrivacyPolicyPage: React.FC = () => {
  useSeo({ title: 'Privacy Policy — HolidayAlibag', description: 'How HolidayAlibag collects, uses and protects the personal information you share when you send a villa, owner or investment enquiry.', path: '/privacy-policy' });
  const { openPreferences } = useConsent();
  return (
    <StaticPageLayout>
      <LegalShell title="Privacy Policy" intro="This policy explains what personal information HolidayAlibag.com collects when you use the website, why we collect it, who it is shared with and the choices you have. We have written it to match how the website actually works.">
        <h2 id="what-we-collect">1. Information we collect</h2>
        <p>We collect only what you choose to type into our forms, plus a small amount of technical information needed to run the site.</p>
        <table>
          <thead><tr><th scope="col">Form</th><th scope="col">What you give us</th></tr></thead>
          <tbody>
            <tr><td>Villa booking / availability enquiry</td><td>Name, phone number, e-mail address, the villa you choose (or “any villa”), check-in and check-out dates, number of adults and children, and any special requests you write.</td></tr>
            <tr><td>Villa-owner enquiry (“List your villa”)</td><td>Name, phone number, villa name, location, and any property details you write.</td></tr>
            <tr><td>Property-investment enquiry</td><td>Name, phone number, e-mail address, preferred location, budget range, property type and any requirements you write.</td></tr>
          </tbody>
        </table>
        <p>Each enquiry is given a reference number. You also confirm your consent with a tick-box before you can submit a form; it is never pre-ticked.</p>
        <p>Technical information: like most websites, our servers and hosting provider process your IP address and browser details to deliver pages, prevent abuse and limit repeated form submissions. We do not use this to identify you personally.</p>

        <h2 id="how-we-use">2. How we use your information</h2>
        <ul>
          <li>to respond to your enquiry by phone, e-mail or WhatsApp, check availability and discuss a stay, a listing or an investment;</li>
          <li>to keep a record of enquiries and manage follow-up;</li>
          <li>to keep the website secure and prevent spam and abuse;</li>
          <li>to understand, in aggregate, how the website is used — only if you allow analytics (see Cookies below).</li>
        </ul>
        <p>Submitting an enquiry is a request only. We do not use your details for unrelated marketing without asking you first.</p>

        <h2 id="whatsapp">3. WhatsApp</h2>
        <p>After your enquiry is saved on our system, the site may open WhatsApp with a pre-filled message addressed to our business number, containing your reference and the details you entered. Nothing is sent until you press send in WhatsApp. Messages you send through WhatsApp are handled by WhatsApp under its own terms and privacy policy. Opening WhatsApp is a convenience: your enquiry is saved whether or not you send the message, and sending a WhatsApp message does not confirm a booking.</p>

        <h2 id="sharing">4. Who we share information with</h2>
        <p>We do not sell your personal information. We share it only with service providers that help us run the website, and only as needed:</p>
        <ul>
          <li><strong>Hosting and database providers</strong> that store the website and the enquiries you submit;</li>
          <li><strong>E-mail delivery</strong>, if enabled, so our team is notified of new enquiries;</li>
          <li><strong>WhatsApp</strong>, if you choose to send the pre-filled message;</li>
          <li><strong>Image hosting</strong> (for property photos and videos). This does not involve visitor personal data;</li>
          <li><strong>Google Analytics</strong>, only if analytics is switched on for this site and you accept analytics cookies;</li>
          <li>property owners or hosts, where needed to arrange the stay you asked about;</li>
          <li>authorities, where we are legally required to.</li>
        </ul>
        <p>Some of these providers may store data on servers outside India.</p>

        <h2 id="cookies">5. Cookies and similar storage</h2>
        <table>
          <thead><tr><th scope="col">Name</th><th scope="col">Purpose</th><th scope="col">When</th></tr></thead>
          <tbody>
            <tr><td><code>ha_consent</code> (browser storage)</td><td>Remembers your cookie choice.</td><td>Necessary — set when you make a choice</td></tr>
            <tr><td><code>ha_admin</code> (cookie)</td><td>Keeps our staff signed in to the admin area. Never set for visitors.</td><td>Necessary — staff only</td></tr>
            <tr><td><code>_ga</code>, <code>_ga_*</code></td><td>Google Analytics: counts visits and page views in aggregate.</td><td>Only if analytics is enabled and you allow it</td></tr>
          </tbody>
        </table>
        <p>We do not use advertising or marketing cookies at present. Optional cookies stay off until you accept them, and you can change your mind at any time:</p>
        <p><button type="button" onClick={openPreferences} className="min-h-[44px] px-5 rounded-md bg-[#092D28] text-white text-sm font-semibold hover:bg-[#123B33]">Open cookie settings</button></p>
        <p>Analytics events (for example “a villa page was viewed” or “a booking enquiry was sent”) never include your name, phone number, e-mail address or message text. Fonts and images are served from this website, not from third-party font services.</p>

        <h2 id="retention">6. How long we keep information</h2>
        <p>We keep enquiry details only for as long as needed to respond to you, arrange a stay or partnership, and meet our legal and accounting obligations. After that we delete or anonymise them. You may ask us to delete your enquiry earlier (see Your choices).</p>

        <h2 id="security">7. Security</h2>
        <p>We use reasonable safeguards: encrypted connections (HTTPS), access-controlled administration with hashed passwords, restricted database access and rate limits against abuse. No online service can be guaranteed completely secure, so please do not include sensitive details (such as card or ID numbers) in your enquiry. We never ask for payment details on this website.</p>

        <h2 id="your-choices">8. Your choices and rights</h2>
        <p>You may ask us to tell you what information we hold about you, correct it, delete it, or stop contacting you, and you may withdraw your consent at any time (withdrawal does not affect what we did before). To do so, or to raise a concern or complaint, contact us below with your enquiry reference number; we may need to confirm your identity first.</p>
        <ContactBlock purpose="To make a request or complain about how we handle your information." />

        <h2 id="children">9. Children</h2>
        <p>This website is intended for adults. Please do not submit information about children other than the number of children travelling with you.</p>

        <h2 id="changes">10. Changes to this policy</h2>
        <p>We may update this policy when the website or the law changes. The “last updated” date above shows the latest version. Material changes affecting your choices will be highlighted on the site. Our <Link to="/terms-and-conditions">Terms &amp; Conditions</Link> also apply to your use of the website.</p>
      </LegalShell>
    </StaticPageLayout>
  );
};
