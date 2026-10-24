import React from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle } from 'lucide-react';
import { useSiteData } from '../context/SiteDataContext';
import { LEGAL } from '../lib/legal';
import { SITE_CONFIG } from '../lib/constants';

export const LegalShell: React.FC<{ title: string; intro: string; children: React.ReactNode }> = ({ title, intro, children }) => (
  <article className="max-w-3xl mx-auto px-5 sm:px-8 py-10 sm:py-14">
    <h1 className="font-editorial text-4xl sm:text-5xl font-semibold text-[#092D28]">{title}</h1>
    <p className="mt-2 text-sm text-[#68675F]">Last updated: {LEGAL.lastUpdated}</p>
    {!LEGAL.reviewed && (
      <div role="note" data-testid="legal-draft-notice" className="mt-5 flex gap-3 rounded-lg border border-amber-300 bg-amber-50 p-4 text-[14px] leading-relaxed text-amber-950">
        <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5 text-amber-700" aria-hidden="true" />
        <p><strong>Draft notice.</strong> This document describes how this website works today. It has not yet been reviewed by a legal professional and may be updated. It is not legal advice.</p>
      </div>
    )}
    <p className="mt-6 text-[16px] leading-relaxed text-[#2B2A26]">{intro}</p>
    <div className="mt-2 text-[16px] leading-relaxed text-[#2B2A26] [&_h2]:font-serif [&_h2]:text-2xl [&_h2]:font-semibold [&_h2]:text-[#092D28] [&_h2]:mt-9 [&_h2]:mb-2 [&_h2]:scroll-mt-24 [&_p]:mt-3 [&_ul]:mt-3 [&_ul]:list-disc [&_ul]:pl-6 [&_ul]:space-y-1.5 [&_a]:text-[#7A5410] [&_a]:underline [&_table]:w-full [&_table]:mt-3 [&_table]:text-[14px] [&_th]:text-left [&_th]:p-2 [&_th]:bg-[#F5EFE4] [&_td]:p-2 [&_td]:align-top [&_td]:border-t [&_td]:border-[#E6DED0]">
      {children}
    </div>
    <p className="mt-10 pt-6 border-t border-[#E6DED0] text-sm text-[#68675F]">
      See also: <Link to="/privacy-policy">Privacy Policy</Link> · <Link to="/terms-and-conditions">Terms &amp; Conditions</Link>
    </p>
  </article>
);

/** Contact details come only from what the business entered in the admin (Website Settings). Nothing is invented. */
export const ContactBlock: React.FC<{ purpose: string }> = ({ purpose }) => {
  const { settings } = useSiteData();
  const name = settings?.businessName || SITE_CONFIG.name;
  const lines = [settings?.publicEmail && { k: 'E-mail', v: <a href={`mailto:${settings.publicEmail}`}>{settings.publicEmail}</a> }, settings?.publicPhone && { k: 'Phone', v: <a href={`tel:${settings.publicPhone.replace(/[^+0-9]/g, '')}`}>{settings.publicPhone}</a> }, settings?.address && { k: 'Address', v: settings.address }].filter(Boolean) as { k: string; v: React.ReactNode }[];
  return (
    <div data-testid="legal-contact">
      <p>{purpose} Contact {name}:</p>
      {lines.length ? (
        <ul>{lines.map((l) => <li key={l.k}><strong>{l.k}:</strong> {l.v}</li>)}</ul>
      ) : (
        <p>Please use the enquiry form on our <Link to="/">homepage</Link> and mention that your message is about this topic.</p>
      )}
    </div>
  );
};
