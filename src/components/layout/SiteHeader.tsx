import React, { useState, useEffect } from 'react';
import { Menu, MessageSquareQuote } from 'lucide-react';
import { SITE_CONFIG } from '../../lib/constants';
import { useSiteData } from '../../context/SiteDataContext';
import { whatsappGeneralUrl } from '../../lib/whatsapp';

interface SiteHeaderProps {
  onOpenMobileNav: () => void;
  onEnquire: () => void;
}

export const SiteHeader: React.FC<SiteHeaderProps> = ({ onOpenMobileNav, onEnquire }) => {
  const { settings } = useSiteData();
  const wa = whatsappGeneralUrl(settings?.whatsappNumber, settings?.whatsappDefaultMessage);
  const [isScrolled, setIsScrolled] = useState(false);
  const [activeSection, setActiveSection] = useState('home');

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);

      // Detect active section
      const sections = ['home', 'villas', 'experiences', 'explore-alibaug', 'list-your-villa', 'about', 'contact'];
      for (const section of sections) {
        const el = document.getElementById(section);
        if (el) {
          const rect = el.getBoundingClientRect();
          if (rect.top <= 140 && rect.bottom >= 140) {
            setActiveSection(section);
            break;
          }
        }
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const navLinks = [
    { label: 'Home', href: '#home', id: 'home' },
    { label: 'Our Villas', href: '#villas', id: 'villas' },
    { label: 'Experiences', href: '#experiences', id: 'experiences' },
    { label: 'Explore Alibaug', href: '#explore-alibaug', id: 'explore-alibaug' },
    { label: 'List Your Villa', href: '#list-your-villa', id: 'list-your-villa' },
    { label: 'About', href: '#about', id: 'about' },
    { label: 'Contact', href: '#contact', id: 'contact' },
  ];

  const handleNavClick = (e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
    e.preventDefault();
    const target = document.querySelector(href);
    if (target) {
      target.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-40 transition-all duration-300 ${
        isScrolled
          ? 'bg-[#092D28]/95 backdrop-blur-md shadow-lg py-2.5 border-b border-[#D8AD57]/20'
          : 'bg-transparent py-4'
      }`}
    >
      <div className="max-w-[1440px] mx-auto px-5 sm:px-8 lg:px-12 flex items-center justify-between">
        {/* Brand Logo Lockup */}
        <a
          href="#home"
          onClick={(e) => handleNavClick(e, '#home')}
          className="flex items-center gap-2.5 group focus:outline-none focus-visible:ring-2 focus-visible:ring-[#D8AD57] rounded-sm"
        >
          {/* Coastal Palm Emblem */}
          <div className="w-9 h-9 sm:w-10 sm:h-10 text-[#D8AD57] shrink-0 transition-transform duration-300 group-hover:scale-105">
            <svg viewBox="0 0 48 48" fill="none" className="w-full h-full drop-shadow">
              {/* Sun / Sunset backdrop */}
              <circle cx="24" cy="24" r="16" fill="url(#goldSunGrad)" fillOpacity="0.25" stroke="#D8AD57" strokeWidth="1.2" />
              {/* Palm trunk */}
              <path d="M22 36C23 30 24 24 23 18" stroke="#D8AD57" strokeWidth="2.4" strokeLinecap="round" />
              {/* Left fronds */}
              <path d="M23 18C18 16 13 19 10 23" stroke="#D8AD57" strokeWidth="2" strokeLinecap="round" />
              <path d="M23 18C16 13 13 11 9 13" stroke="#D8AD57" strokeWidth="1.8" strokeLinecap="round" />
              <path d="M23 18C19 11 16 7 12 7" stroke="#D8AD57" strokeWidth="1.8" strokeLinecap="round" />
              {/* Right fronds */}
              <path d="M23 18C28 15 33 18 37 21" stroke="#D8AD57" strokeWidth="2" strokeLinecap="round" />
              <path d="M23 18C30 13 34 10 38 12" stroke="#D8AD57" strokeWidth="1.8" strokeLinecap="round" />
              <path d="M23 18C27 10 31 7 35 6" stroke="#D8AD57" strokeWidth="1.8" strokeLinecap="round" />
              {/* Coastal waves base */}
              <path d="M12 37C15 35 18 37 22 36C26 35 30 37 34 36" stroke="#D8AD57" strokeWidth="1.6" strokeLinecap="round" />
              <defs>
                <linearGradient id="goldSunGrad" x1="8" y1="8" x2="40" y2="40" gradientUnits="userSpaceOnUse">
                  <stop stopColor="#E8C77F" />
                  <stop offset="1" stopColor="#B58B35" />
                </linearGradient>
              </defs>
            </svg>
          </div>

          <div className="flex flex-col">
            <span className="font-editorial text-[22px] sm:text-[25px] font-semibold tracking-tight text-white leading-none">
              Holiday<span className="text-[#E8C77F]">Alibag</span>
            </span>
            <span className="text-[7.5px] sm:text-[8px] font-medium tracking-[0.22em] text-[#D8AD57] uppercase mt-1">
              Villas · Stays · Experiences
            </span>
          </div>
        </a>

        {/* Desktop Navigation Links */}
        <nav className="hidden lg:flex items-center gap-5 xl:gap-7" aria-label="Main Navigation">
          {navLinks.map((link) => {
            const isActive = activeSection === link.id;
            return (
              <a
                key={link.id}
                href={link.href}
                onClick={(e) => handleNavClick(e, link.href)}
                className={`text-[12px] xl:text-[13px] font-medium tracking-wide transition-colors relative py-1 focus:outline-none focus-visible:ring-1 focus-visible:ring-[#D8AD57] ${
                  isActive ? 'text-[#E8C77F] font-semibold' : 'text-white/90 hover:text-[#D8AD57]'
                }`}
              >
                {link.label}
                {isActive && (
                  <span
                    className="absolute bottom-0 left-1/2 -translate-x-1/2 w-6 h-[2px] bg-[#D8AD57] rounded-full transition-all"
                    aria-hidden="true"
                  />
                )}
              </a>
            );
          })}
        </nav>

        {/* Right CTA Actions */}
        <div className="flex items-center gap-3">
          {/* Primary CTA: WhatsApp when a verified number is configured, otherwise the booking enquiry form */}
          {wa ? (
            <a href={wa} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 px-3.5 sm:px-4 py-1.5 sm:py-2 text-[12px] sm:text-[11.5px] font-semibold text-[#171916] bg-gradient-to-r from-[#E8C77F] to-[#D8AD57] hover:from-[#F0D597] hover:to-[#E0B55E] active:scale-[0.98] rounded-[6px] shadow-sm transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-white" aria-label="Enquire on WhatsApp (opens new tab)">
              {/* WhatsApp Outline Icon */}
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5">
              <path d="M3 21l1.65-3.8a9 9 0 1 1 3.4 2.9L3 21" />
              <path d="M9 10a.5.5 0 0 0 1 0V9a.5.5 0 0 0-1 0v1a5 5 0 0 0 5 5h1a.5.5 0 0 0 0-1h-1a.5.5 0 0 0 0 1" />
            </svg>
              <span className="whitespace-nowrap">Enquire on WhatsApp</span>
            </a>
          ) : (
            <button type="button" onClick={onEnquire} className="flex items-center gap-1.5 px-3.5 sm:px-4 py-1.5 sm:py-2 text-[12px] sm:text-[11.5px] font-semibold text-[#171916] bg-gradient-to-r from-[#E8C77F] to-[#D8AD57] hover:from-[#F0D597] hover:to-[#E0B55E] active:scale-[0.98] rounded-[6px] shadow-sm transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-white">
              <span className="whitespace-nowrap">Enquire Now</span>
            </button>
          )}

          {/* Discreet link to the separate full-page admin application
          <a
            href="/admin"
              className="hidden md:flex items-center gap-1 px-2.5 py-1.5 text-[11px] font-medium text-white/80 hover:text-white bg-white/10 hover:bg-white/20 rounded-[5px] transition-colors border border-white/10"
              title="Admin sign-in"
              aria-label="Admin sign-in"
            >
              <MessageSquareQuote className="w-3 h-3 text-[#D8AD57]" />
              <span>Admin</span>
            </a> */}

          {/* Mobile Hamburger Button */}
          <button
            onClick={onOpenMobileNav}
            className="lg:hidden p-1.5 text-white hover:text-[#D8AD57] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#D8AD57] rounded"
            aria-label="Open mobile navigation menu"
          >
            <Menu className="w-6 h-6" />
          </button>
        </div>
      </div>
    </header>
  );
};
