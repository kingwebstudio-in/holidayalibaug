import React from 'react';
import { MessageCircle } from 'lucide-react';
import type { HandoffState } from '../../hooks/useWhatsAppHandoff';

/**
 * Success-state WhatsApp actions. The enquiry is ALREADY saved when this renders; the button lets the visitor
 * (re)send the same message if WhatsApp did not open, was blocked, or they closed it.
 */
export const WhatsAppSend: React.FC<{ url: string | null; state: HandoffState }> = ({ url, state }) => {
  if (!url) return null;
  return (
    <div className="w-full max-w-sm" data-testid="whatsapp-send">
      <p className={`text-[11px] leading-snug mb-2 px-3 py-2 rounded-md border ${state === 'blocked' ? 'bg-amber-50 border-amber-200 text-amber-900' : 'bg-[#F5F9F6] border-[#D5E8DB] text-[#2C5F3D]'}`} role="status">
        {state === 'blocked'
          ? 'Your browser blocked the WhatsApp window. Your enquiry is saved — tap “Send on WhatsApp” to message our team too.'
          : state === 'opened'
            ? 'WhatsApp should have opened with your enquiry details. Press send there to message our team. Didn’t open? Use the button below — your enquiry is saved either way.'
            : 'Your enquiry is saved. You can also send the details to our team on WhatsApp.'}
      </p>
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        data-testid="send-on-whatsapp"
        className="w-full py-2.5 px-4 text-xs font-semibold text-white bg-[#25D366] hover:bg-[#1ebe5b] rounded-md flex items-center justify-center gap-2 shadow-xs"
      >
        <MessageCircle className="w-4 h-4 fill-current" /><span>Send on WhatsApp</span>
      </a>
      <p className="text-[11px] text-[#6B665D] mt-1.5 text-center">Opens WhatsApp with a pre-filled message. Nothing is sent until you press send.</p>
    </div>
  );
};
