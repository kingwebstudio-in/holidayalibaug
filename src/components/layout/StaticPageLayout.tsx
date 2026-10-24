import React from 'react';
import { Link } from 'react-router-dom';
import { SITE_CONFIG } from '../../lib/constants';
import { useOptionalConsent } from '../consent/ConsentProvider';

/** Lightweight shell (header + footer) for standalone pages: legal pages and the 404 page. */
export const StaticPageLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const consent = useOptionalConsent();
  return (
    <div className="min-h-dvh flex flex-col bg-[#FBF7EF] text-[#171916]">
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[80] focus:px-4 focus:py-2 focus:bg-white focus:text-[#092D28] focus:rounded-md focus:shadow-lg">Skip to content</a>
      <header className="bg-[#092D28] text-white">
        <div className="max-w-5xl mx-auto px-5 sm:px-8 h-16 flex items-center justify-between">
          <Link to="/" className="font-editorial text-2xl font-semibold tracking-wide focus:outline-none focus-visible:ring-2 focus-visible:ring-[#E8C77F] rounded" aria-label={`${SITE_CONFIG.name} — home`}>
            Holiday<span className="text-[#E8C77F]">Alibag</span>
          </Link>
          <nav aria-label="Main" className="flex items-center gap-1 sm:gap-3 text-[14px]">
            <Link to="/" className="px-3 min-h-[44px] inline-flex items-center hover:text-[#E8C77F]">Home</Link>
            <Link to="/#villas" className="px-3 min-h-[44px] inline-flex items-center hover:text-[#E8C77F]">Our Villas</Link>
          </nav>
        </div>
      </header>
      <main id="main" tabIndex={-1} className="flex-1 focus:outline-none">{children}</main>
      <footer className="bg-[#062722] text-white/85">
        <div className="max-w-5xl mx-auto px-5 sm:px-8 py-6 flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between text-[13px]">
          <p>© {new Date().getFullYear()} {SITE_CONFIG.name}. Enquiry-only — no online payments.</p>
          <ul className="flex flex-wrap gap-x-5 gap-y-1">
            <li><Link to="/privacy-policy" className="inline-flex items-center min-h-[36px] hover:text-white underline-offset-2 hover:underline">Privacy Policy</Link></li>
            <li><Link to="/terms-and-conditions" className="inline-flex items-center min-h-[36px] hover:text-white underline-offset-2 hover:underline">Terms &amp; Conditions</Link></li>
            {consent && <li><button type="button" onClick={consent.openPreferences} className="inline-flex items-center min-h-[36px] hover:text-white underline-offset-2 hover:underline">Cookie settings</button></li>}
          </ul>
        </div>
      </footer>
    </div>
  );
};
