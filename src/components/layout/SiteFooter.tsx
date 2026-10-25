import React from 'react';
import { MapPin, Phone, Mail, Instagram, Facebook, Youtube, ArrowRight } from 'lucide-react';
import { SITE_CONFIG } from '../../lib/constants';
import { useSiteData } from '../../context/SiteDataContext';
import { whatsappGeneralUrl } from '../../lib/whatsapp';
import { Link } from 'react-router-dom';
import { Villa } from '../../types';
import { useOptionalConsent } from '../consent/ConsentProvider';

interface SiteFooterProps {
  onSelectVilla: (villa: { slug: string }) => void;
  onEnquire: () => void;
}

export const SiteFooter: React.FC<SiteFooterProps> = ({
  onSelectVilla,
  onEnquire,
}) => {
  const { villas, settings } = useSiteData();
  const wa = whatsappGeneralUrl(settings?.whatsappNumber, settings?.whatsappDefaultMessage);
  const social = settings?.socialLinks;
  const consent = useOptionalConsent();
  const currentYear = new Date().getFullYear();

  const handleLinkClick = (e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
    e.preventDefault();
    const el = document.querySelector(href);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <footer id="contact" className="relative w-full bg-[#062722] text-white pt-14 pb-8 border-t border-[#D8AD57]/20">
      <div className="max-w-[1440px] mx-auto px-5 sm:px-8 lg:px-12">
        {/* Main 5-Column Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-8 lg:gap-10 pb-12 border-b border-white/10">
          {/* Col 1: Brand & Socials (Span 3) */}
          <div className="lg:col-span-3 flex flex-col items-start">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 text-[#D8AD57] shrink-0">
                <svg viewBox="0 0 48 48" fill="none" className="w-full h-full">
                  <circle cx="24" cy="24" r="16" stroke="#D8AD57" strokeWidth="1.5" />
                  <path d="M22 36C23 30 24 24 23 18" stroke="#D8AD57" strokeWidth="2.5" strokeLinecap="round" />
                  <path d="M23 18C18 16 13 19 10 23" stroke="#D8AD57" strokeWidth="2" strokeLinecap="round" />
                  <path d="M23 18C28 15 33 18 37 21" stroke="#D8AD57" strokeWidth="2" strokeLinecap="round" />
                  <path d="M12 37C15 35 18 37 22 36C26 35 30 37 34 36" stroke="#D8AD57" strokeWidth="1.8" strokeLinecap="round" />
                </svg>
              </div>
              <div className="flex flex-col">
                <span className="font-editorial text-2xl font-semibold tracking-tight text-white leading-none">
                  Holiday<span className="text-[#E8C77F]">Alibag</span>
                </span>
                <span className="text-[7.5px] font-medium tracking-[0.2em] text-[#D8AD57] uppercase mt-1">
                  Villas · Stays · Experiences
                </span>
              </div>
            </div>

            <p className="text-xs text-white/70 leading-relaxed mb-6 max-w-xs">
              Your trusted destination for luxury villas in Alibaug. Explore beautiful stays, unique experiences and the best of the coastal lifestyle.
            </p>

            {/* Social Icons */}
            <div className="flex items-center gap-3">
              {social?.instagram && (
              <a
                href={social.instagram}
                target="_blank"
                rel="noopener noreferrer"
                className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/15 border border-white/10 flex items-center justify-center text-white/80 hover:text-[#D8AD57] transition-colors"
                aria-label="Instagram"
              >
                <Instagram className="w-4 h-4" />
              </a>
              )}
              {social?.facebook && (
              <a
                href={social.facebook}
                target="_blank"
                rel="noopener noreferrer"
                className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/15 border border-white/10 flex items-center justify-center text-white/80 hover:text-[#D8AD57] transition-colors"
                aria-label="Facebook"
              >
                <Facebook className="w-4 h-4" />
              </a>
              )}
              {social?.youtube && (
              <a
                href={social.youtube}
                target="_blank"
                rel="noopener noreferrer"
                className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/15 border border-white/10 flex items-center justify-center text-white/80 hover:text-[#D8AD57] transition-colors"
                aria-label="YouTube"
              >
                <Youtube className="w-4 h-4" />
              </a>
              )}
            </div>
          </div>

          {/* Col 2: Quick Links (Span 2) */}
          <div className="lg:col-span-2">
            <h4 className="text-[11px] font-semibold tracking-[0.2em] text-[#D8AD57] uppercase mb-4">
              Quick Links
            </h4>
            <ul className="space-y-2 text-xs text-white/75">
              <li>
                <a href="#home" onClick={(e) => handleLinkClick(e, '#home')} className="hover:text-[#E8C77F] transition-colors">
                  Home
                </a>
              </li>
              <li>
                <a href="#villas" onClick={(e) => handleLinkClick(e, '#villas')} className="hover:text-[#E8C77F] transition-colors">
                  Our Villas
                </a>
              </li>
              <li>
                <a href="#experiences" onClick={(e) => handleLinkClick(e, '#experiences')} className="hover:text-[#E8C77F] transition-colors">
                  Experiences
                </a>
              </li>
              <li>
                <a href="#explore-alibaug" onClick={(e) => handleLinkClick(e, '#explore-alibaug')} className="hover:text-[#E8C77F] transition-colors">
                  Explore Alibaug
                </a>
              </li>
              <li>
                <a href="#list-your-villa" onClick={(e) => handleLinkClick(e, '#list-your-villa')} className="hover:text-[#E8C77F] transition-colors">
                  List Your Villa
                </a>
              </li>
              <li>
                <a href="#property-investment" onClick={(e) => handleLinkClick(e, '#property-investment')} className="hover:text-[#E8C77F] transition-colors">
                  Property Investment
                </a>
              </li>
              <li>
                <a href="#contact" onClick={(e) => handleLinkClick(e, '#contact')} className="hover:text-[#E8C77F] transition-colors">
                  Contact
                </a>
              </li>
            </ul>
          </div>

          {/* Col 3: Our Villas (Span 2) */}
          <div className="lg:col-span-2">
            <h4 className="text-[11px] font-semibold tracking-[0.2em] text-[#D8AD57] uppercase mb-4">
              Our Villas
            </h4>
            <ul className="space-y-2 text-xs text-white/75">
              {villas.map((villa) => (
                <li key={villa.id}>
                  <button
                    onClick={() => onSelectVilla(villa)}
                    className="hover:text-[#E8C77F] transition-colors text-left"
                  >
                    {villa.name}
                  </button>
                </li>
              ))}
            </ul>
          </div>

          {/* Col 4: Contact Us (Span 2) */}
          <div className="lg:col-span-2">
            <h4 className="text-[11px] font-semibold tracking-[0.2em] text-[#D8AD57] uppercase mb-4">
              Contact Us
            </h4>
            <ul className="space-y-2.5 text-xs text-white/75">
              <li className="flex items-start gap-2">
                <MapPin className="w-3.5 h-3.5 text-[#D8AD57] shrink-0 mt-0.5" />
                <span>{settings?.address || SITE_CONFIG.address}</span>
              </li>
              {settings?.publicPhone && (
                <li className="flex items-center gap-2">
                  <Phone className="w-3.5 h-3.5 text-[#D8AD57] shrink-0" />
                  <a href={`tel:${settings.publicPhone.replace(/[^+0-9]/g, '')}`} className="hover:text-[#E8C77F]">{settings.publicPhone}</a>
                </li>
              )}
              {settings?.publicEmail && (
                <li className="flex items-center gap-2">
                  <Mail className="w-3.5 h-3.5 text-[#D8AD57] shrink-0" />
                  <a href={`mailto:${settings.publicEmail}`} className="hover:text-[#E8C77F]">{settings.publicEmail}</a>
                </li>
              )}
              {wa && (
              <li className="pt-1">
                <a
                  href={wa}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-[#D8AD57] hover:text-[#E8C77F] transition-colors"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5">
                    <path d="M3 21l1.65-3.8a9 9 0 1 1 3.4 2.9L3 21" />
                    <path d="M9 10a.5.5 0 0 0 1 0V9a.5.5 0 0 0-1 0v1a5 5 0 0 0 5 5h1a.5.5 0 0 0 0-1h-1a.5.5 0 0 0 0 1" />
                  </svg>
                  <span>Enquire on WhatsApp</span>
                </a>
              </li>
              )}
            </ul>
          </div>

          {/* Col 5: Plan a stay */}
          <div className="lg:col-span-3">
            <div className="p-4 rounded-lg bg-white/5 border border-white/10">
              <h4 className="text-xs font-semibold text-white tracking-wide mb-1">Planning a stay?</h4>
              <p className="text-[11px] text-white/60 mb-3 leading-relaxed">
                {settings?.footerText || 'Send us your dates and group size. Our team will check availability and get back to you.'}
              </p>
              <button type="button" onClick={onEnquire} className="w-full py-2 text-xs font-semibold text-[#171916] bg-[#E8C77F] hover:bg-[#D8AD57] active:scale-[0.99] rounded transition-colors flex items-center justify-center gap-1">
                <span>Send a Booking Enquiry</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>

        {/* Bottom Row */}
        {/* <div className="pt-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-[12px] text-white/70">
          <div>
            © {currentYear} HolidayAlibag. All rights reserved.
          </div> */}

           <div className="text-[11px] text-white/65">
  Designed & Developed by{' '}
  <a 
    href="https://kingwebstudio.in" 
    target="_blank" 
    rel="noopener noreferrer"
    className="hover:underline text-white"
  >
    KING WEB STUDIO
  </a>
</div>

          <div className="flex items-center gap-4 flex-wrap justify-center">
            <Link to="/privacy-policy" className="hover:text-white transition-colors">Privacy Policy</Link>
            <span aria-hidden="true">|</span>
            <Link to="/terms-and-conditions" className="hover:text-white transition-colors">Terms &amp; Conditions</Link>
            {consent && (<><span aria-hidden="true">|</span><button type="button" onClick={consent.openPreferences} className="hover:text-white transition-colors">Cookie settings</button></>)}
            <span aria-hidden="true">|</span>
            <a href="/admin" className="text-[#D8AD57] hover:text-[#D8AD57] transition-colors">
              Admin Portal
            </a>
          </div>

        {/* <div className="text-[11px] text-white/65">
  Designed & Developed by{' '}
  <a 
    href="https://kingwebstudio.in" 
    target="_blank" 
    rel="noopener noreferrer"
    className="hover:underline text-white"
  >
    KING WEB STUDIO
  </a>
</div> */}
<div className="pt-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-[12px] text-white/70">
          <div>
            © {currentYear} HolidayAlibag. All rights reserved.
          </div>


        </div>
      </div>
    </footer>
  );
};
