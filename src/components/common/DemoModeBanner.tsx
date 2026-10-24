import React from 'react';
import { FlaskConical } from 'lucide-react';
import { useSiteData } from '../../context/SiteDataContext';

/** Small, always-visible indicator so sample listings are never mistaken for live inventory. */
export const DemoModeBanner: React.FC = () => {
  const { settings } = useSiteData();
  if (!settings?.environment?.demoData) return null;
  return (
    <div role="note" className="fixed bottom-3 left-3 z-40 max-w-[calc(100vw-5rem)] flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#171916]/90 text-white text-[12px] font-medium shadow-lg backdrop-blur">
      <FlaskConical className="w-3.5 h-3.5 text-[#E8C77F] shrink-0" />
      <span className="truncate">
        Demo mode — sample listings present; not real availability
      </span>
    </div>
  );
};
