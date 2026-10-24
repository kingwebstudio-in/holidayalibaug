import React from 'react';
import { MessageCircle } from 'lucide-react';
import { useSiteData } from '../../context/SiteDataContext';
import { whatsappGeneralUrl } from '../../lib/whatsapp';

/**
 * Fixed WhatsApp button, bottom-right, on every public page. Uses ONLY the number and default message configured by
 * the admin (Website Content / Media). With no number configured nothing is rendered — a number is never invented.
 */
export const FloatingWhatsApp: React.FC = () => {
  const { settings } = useSiteData();
  const url = whatsappGeneralUrl(settings?.whatsappNumber, settings?.whatsappDefaultMessage);
  if (!url) return null;
  return (
    <aside aria-label="Quick contact" className="fixed z-40 right-4 sm:right-5" style={{ bottom: 'max(1rem, env(safe-area-inset-bottom))' }}>
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        data-testid="floating-whatsapp"
        className="group flex items-center gap-2 p-3.5 sm:px-4 sm:py-3 rounded-full bg-[#25D366] text-white shadow-xl hover:shadow-2xl hover:bg-[#1ebe5b] transition-all duration-300 hover:scale-105 active:scale-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#128C7E]"
        aria-label="Chat with us on WhatsApp (opens in a new tab)"
      >
        <MessageCircle className="w-6 h-6 fill-current" />
        <span className="hidden sm:inline text-xs font-semibold tracking-wide">Chat on WhatsApp</span>
      </a>
    </aside>
  );
};
