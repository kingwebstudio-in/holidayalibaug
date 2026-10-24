import React, { useEffect } from 'react';
import { X, ExternalLink, ShieldCheck } from 'lucide-react';
import { useScrollLock } from '../../hooks/useScrollLock';
import { useSiteData } from '../../context/SiteDataContext';
import { whatsappGeneralUrl } from '../../lib/whatsapp';

interface MobileNavigationProps {
  isOpen: boolean;
  onClose: () => void;
  onEnquire: () => void;
}

export const MobileNavigation: React.FC<MobileNavigationProps> = ({
  isOpen,
  onClose,
  onEnquire,
}) => {
  const { settings } = useSiteData();
  const wa = whatsappGeneralUrl(settings?.whatsappNumber, settings?.whatsappDefaultMessage);
  // Shared, ref-counted scroll lock (never overwrites another open modal's lock) + Escape to close.
  useScrollLock(isOpen);
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const links = [
    { label: 'Home', href: '#home' },
    { label: 'Our Villas', href: '#villas' },
    { label: 'Experiences', href: '#experiences' },
    { label: 'Explore Alibaug', href: '#explore-alibaug' },
    { label: 'Guest Reviews', href: '#guest-reviews' },
    { label: 'List Your Villa', href: '#list-your-villa' },
    { label: 'Property Investment', href: '#property-investment' },
    { label: 'Contact', href: '#contact' },
  ];

  const handleLinkClick = (href: string) => {
    onClose();
    setTimeout(() => {
      const el = document.querySelector(href);
      if (el) el.scrollIntoView({ behavior: 'smooth' });
    }, 150);
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end" role="dialog" aria-modal="true" aria-label="Mobile Navigation">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer */}
      <div className="relative w-full max-w-sm bg-[#092D28] text-white h-full shadow-2xl flex flex-col z-10 border-l border-[#D8AD57]/20 animate-in slide-in-from-right duration-300">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-white/10">
          <div className="flex flex-col">
            <span className="font-editorial text-2xl font-semibold text-white">
              Holiday<span className="text-[#E8C77F]">Alibag</span>
            </span>
            <span className="text-[8px] font-medium tracking-[0.2em] text-[#D8AD57] uppercase">
              Villas · Stays · Experiences
            </span>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-white/70 hover:text-white transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#D8AD57] rounded"
            aria-label="Close navigation menu"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Links list */}
        <nav className="flex-1 overflow-y-auto px-6 py-6 flex flex-col gap-4">
          {links.map((link) => (
            <button
              key={link.href}
              onClick={() => handleLinkClick(link.href)}
              className="text-left py-2 text-base font-medium text-white/90 hover:text-[#D8AD57] transition-colors border-b border-white/5 focus:outline-none focus-visible:ring-1 focus-visible:ring-[#D8AD57]"
            >
              {link.label}
            </button>
          ))}

          <a
            href="/admin"
              className="mt-2 flex items-center justify-between text-left py-2.5 px-3 rounded bg-white/5 text-sm text-[#E8C77F] hover:bg-white/10 transition-colors"
            >
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-[#D8AD57]" />
                <span>Admin sign-in</span>
              </div>
              <span className="text-[11px] text-white/60">Staff</span>
          </a>
        </nav>

        {/* Footer CTAs */}
        <div className="p-6 border-t border-white/10 bg-[#062722] flex flex-col gap-3">
          {wa ? (
            <a href={wa} target="_blank" rel="noopener noreferrer" className="w-full py-3 px-4 bg-gradient-to-r from-[#E8C77F] to-[#D8AD57] text-[#171916] font-semibold text-xs tracking-wider rounded-md text-center flex items-center justify-center gap-2 shadow-md hover:brightness-105 active:scale-[0.99] transition-all">
              <span>Enquire on WhatsApp</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          ) : (
            <button type="button" onClick={() => { onClose(); onEnquire(); }} className="w-full py-3 px-4 bg-gradient-to-r from-[#E8C77F] to-[#D8AD57] text-[#171916] font-semibold text-xs tracking-wider rounded-md text-center flex items-center justify-center gap-2 shadow-md hover:brightness-105 active:scale-[0.99] transition-all">
              <span>Send a Booking Enquiry</span>
            </button>
          )}
          <p className="text-[11px] text-white/50 text-center">
            Private Villas & Luxury Stays in Alibaug
          </p>
        </div>
      </div>
    </div>
  );
};
