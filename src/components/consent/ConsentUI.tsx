import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { X } from 'lucide-react';
import { useSiteData } from '../../context/SiteDataContext';
import { useModal } from '../../hooks/useModal';
import { useConsent } from './ConsentProvider';

/** Equal visual weight for "Reject optional" and "Accept all" — declining must be as easy as accepting. */
const btn = 'min-h-[44px] px-4 py-2.5 text-[13px] font-semibold rounded-md border transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#092D28]';
const solid = `${btn} bg-[#092D28] text-white border-[#092D28] hover:bg-[#123B33]`;
const outline = `${btn} bg-white text-[#092D28] border-[#092D28] hover:bg-[#F5EFE4]`;

export const ConsentUI: React.FC = () => {
  const { decided, prefsOpen, analyticsAvailable, acceptAll, rejectOptional, openPreferences } = useConsent();
  const { status } = useSiteData();
  // Wait for the site configuration so the wording matches what is actually switched on.
  const showBanner = !decided && status !== 'loading' && !prefsOpen;
  return (
    <>
      {showBanner && (
        <section aria-label="Cookie consent" data-testid="consent-banner" className="fixed z-[60] inset-x-0 bottom-0 sm:inset-x-auto sm:left-4 sm:bottom-4 sm:max-w-[26rem] p-4 bg-white border border-[#DDD8CF] sm:rounded-xl shadow-2xl" style={{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom))' }}>
          <h2 className="font-editorial text-xl font-semibold text-[#171916]">Your privacy choices</h2>
          <p className="mt-1.5 text-[13px] leading-relaxed text-[#42403B]">
            {analyticsAvailable
              ? 'We use essential storage to run this site. With your permission we also use analytics to see which pages and villas are viewed — never your name, phone number or enquiry text. You can change this at any time.'
              : 'This site currently sets only essential cookies and storage. No analytics or marketing cookies are active. You can still record your preference for any we may add later.'}{' '}
            <Link to="/privacy-policy" className="underline text-[#092D28] font-medium">Privacy Policy</Link>
          </p>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <button type="button" onClick={rejectOptional} className={solid} data-testid="consent-reject">Reject optional</button>
            <button type="button" onClick={acceptAll} className={solid} data-testid="consent-accept">Accept all</button>
            <button type="button" onClick={openPreferences} className={`${outline} col-span-2`} data-testid="consent-customize">Customise</button>
          </div>
        </section>
      )}
      {prefsOpen && <Preferences />}
    </>
  );
};

const Preferences: React.FC = () => {
  const { consent, save, closePreferences, analyticsAvailable } = useConsent();
  const ref = useModal<HTMLDivElement>(true, closePreferences);
  const [analytics, setAnalytics] = useState(consent.analytics);
  const [marketing, setMarketing] = useState(consent.marketing);
  useEffect(() => { setAnalytics(consent.analytics); setMarketing(consent.marketing); }, [consent]);

  const Row: React.FC<{ id: string; title: string; text: string; checked: boolean; disabled?: boolean; onChange?: (v: boolean) => void }> = ({ id, title, text, checked, disabled, onChange }) => (
    <div className="flex items-start gap-3 py-3 border-t border-[#EAE3D8]">
      <input id={id} type="checkbox" checked={checked} disabled={disabled} onChange={(e) => onChange?.(e.target.checked)} aria-describedby={`${id}-d`} className="mt-1 h-5 w-5 rounded border-[#8C877D] text-[#092D28] focus:ring-[#092D28]" />
      <div>
        <label htmlFor={id} className="text-sm font-semibold text-[#171916]">{title}{disabled && <span className="ml-2 text-xs font-medium text-[#68675F]">Always on</span>}</label>
        <p id={`${id}-d`} className="text-[13px] leading-relaxed text-[#42403B] mt-0.5">{text}</p>
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-3 bg-black/70" onMouseDown={(e) => { if (e.target === e.currentTarget) closePreferences(); }}>
      <div ref={ref} tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby="consent-title" data-testid="consent-dialog" className="w-full max-w-lg max-h-[90dvh] overflow-y-auto bg-white rounded-xl shadow-2xl border border-[#EAE3D8] focus:outline-none">
        <div className="flex items-start justify-between gap-3 px-5 pt-5">
          <h2 id="consent-title" className="font-editorial text-2xl font-semibold text-[#171916]">Cookie settings</h2>
          <button type="button" onClick={closePreferences} aria-label="Close cookie settings" className="p-2 -m-2 text-[#68675F] hover:text-[#171916]"><X className="w-5 h-5" /></button>
        </div>
        <div className="px-5 pb-2">
          <p className="text-[13px] text-[#42403B] mt-1 mb-3">Choose which optional cookies and storage we may use. Your choice is saved in this browser and you can change it whenever you like.</p>
          <Row id="ck-necessary" title="Necessary" checked disabled text="Needed for the site to work, including secure admin sign-in. These cannot be switched off." />
          <Row id="ck-analytics" title="Analytics" checked={analytics} onChange={setAnalytics}
            text={analyticsAvailable ? 'Helps us understand which pages and villas are viewed and how many enquiries are sent, using Google Analytics. We never send your name, phone number, e-mail or message text.' : 'Analytics are not switched on for this site at the moment. If we enable them, they will only run if you allow it here.'} />
          <Row id="ck-marketing" title="Marketing" checked={marketing} onChange={setMarketing} text="Advertising or remarketing cookies. None are used on this site at the moment; this choice will apply if we ever add any." />
        </div>
        <div className="px-5 pb-5 pt-3 grid grid-cols-1 sm:grid-cols-3 gap-2">
          <button type="button" onClick={() => save({ analytics: false, marketing: false })} className={solid}>Reject optional</button>
          <button type="button" onClick={() => save({ analytics, marketing })} className={outline} data-testid="consent-save">Save choices</button>
          <button type="button" onClick={() => save({ analytics: true, marketing: true })} className={solid}>Accept all</button>
        </div>
      </div>
    </div>
  );
};
