import React, { useRef, useState } from 'react';
import { ArrowRight, Check, AlertCircle } from 'lucide-react';
import { IMAGES } from '../../lib/constants';
import { validatePhone } from '../../lib/validation';
import { buildWhatsAppUrl, ownerWhatsAppText } from '../../lib/whatsapp';
import { useWhatsAppHandoff } from '../../hooks/useWhatsAppHandoff';
import { WhatsAppSend } from '../common/WhatsAppSend';
import { useSiteData } from '../../context/SiteDataContext';
import { ApiError, newIdempotencyKey } from '../../services/api';
import { submitOwnerEnquiry } from '../../services/publicApi';
import { events } from '../../lib/analytics';

interface VillaOwnerSectionProps {
  onShowToast: (title: string, message: string, type: 'success' | 'error') => void;
}

export const VillaOwnerSection: React.FC<VillaOwnerSectionProps> = ({ onShowToast }) => {
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    villaName: '',
    location: 'Alibaug',
    customLocation: '',
    message: '',
    consent: false,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [reference, setReference] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const { settings } = useSiteData();
  const inFlight = useRef(false);
  const wa = useWhatsAppHandoff(!!settings?.whatsappNumber);
  const idemKey = useRef(newIdempotencyKey());

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: '' }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (inFlight.current) return;
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) newErrors.name = 'Please enter your name';
    if (!formData.phone.trim()) {
      newErrors.phone = 'Please enter your phone number';
    } else if (!validatePhone(formData.phone)) {
      newErrors.phone = 'Please enter a valid phone number';
    }
    if (!formData.villaName.trim()) newErrors.villaName = 'Please enter the villa name';
    if (formData.location === 'Other' && !formData.customLocation.trim()) {
      newErrors.customLocation = 'Please specify location';
    }
    if (!formData.consent) newErrors.consent = 'Consent is required to submit';

    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) return;

    const trap = (new FormData(e.currentTarget as HTMLFormElement).get('website') as string) || '';
    wa.prepare(); // WhatsApp tab is opened inside this click and filled in only after the enquiry is saved
    inFlight.current = true;
    setIsSubmitting(true);
    setFormError(null);
    try {
      const r = await submitOwnerEnquiry(
        {
          ownerName: formData.name,
          phone: formData.phone,
          villaName: formData.villaName,
          propertyLocation: formData.location === 'Other' ? formData.customLocation : formData.location,
          propertyDetails: formData.message || undefined,
          consent: formData.consent,
          website: trap || undefined,
        },
        idemKey.current,
      );
      events.ownerEnquiry();
      setReference(r.reference);
      wa.open(ownerUrl(r.reference)); // opens WhatsApp only now that the enquiry is saved
      setIsSuccess(true);
      onShowToast('Enquiry received', `Reference ${r.reference}. Our partnerships team will review your details and contact you.`, 'success');
    } catch (err) {
      wa.abort();
      const apiErr = err instanceof ApiError ? err : null;
      if (apiErr?.fieldErrors) {
        const map: Record<string, string> = {};
        for (const [k, v] of Object.entries(apiErr.fieldErrors)) map[k === 'ownerName' ? 'name' : k === 'propertyLocation' ? 'customLocation' : k] = v;
        setErrors(map);
      }
      setFormError(apiErr?.message ?? 'Something went wrong. Please try again.');
    } finally {
      inFlight.current = false;
      setIsSubmitting(false);
    }
  };

  const ownerUrl = (ref: string) => buildWhatsAppUrl(settings?.whatsappNumber, ownerWhatsAppText({
    reference: ref, ownerName: formData.name, phone: formData.phone, villaName: formData.villaName,
    location: formData.location === 'Other' ? formData.customLocation : formData.location, details: formData.message,
  }));
  const waUrl = reference ? ownerUrl(reference) : null;

  const handlePartnerScroll = () => {
    const formElement = document.getElementById('owner-form-container');
    if (formElement) {
      formElement.scrollIntoView({ behavior: 'smooth' });
      const firstInput = formElement.querySelector('input') as HTMLInputElement | null;
      if (firstInput) firstInput.focus();
    }
  };

  return (
    <section id="list-your-villa" className="relative w-full bg-[#FBF7EF] py-12 lg:py-16 border-t border-[#F0EAE1]">
      <div className="max-w-[1440px] mx-auto px-5 sm:px-8 lg:px-12">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          {/* Left Column: Luxury Villa/Patio Image */}
          <div className="lg:col-span-4 rounded-[10px] overflow-hidden shadow-md border border-[#EAE3D8] bg-[#171916] aspect-[1.25/1] max-h-[300px] lg:max-h-none">
            <img
              src={IMAGES.villaOwnerPatio}
              alt="Luxury Alibaug private villa at dusk for villa partnerships"
              className="w-full h-full object-cover object-center"
              loading="lazy"
            />
          </div>

          {/* Center Column: Eyebrow Pill, Heading, Benefits, CTA */}
          <div className="lg:col-span-4 flex flex-col items-start justify-center">
            {/* Pill Eyebrow */}
            <div className="inline-block px-3 py-1 rounded-full bg-[#E8C77F]/30 border border-[#E8C77F]/60 text-[#825C19] text-[11px] font-semibold tracking-wider uppercase mb-2">
              For Villa Owners
            </div>

            <h2 className="font-editorial text-2xl sm:text-3xl font-semibold text-[#171916] leading-tight mb-2.5">
              List Your Villa with Us
            </h2>

            <p className="text-xs sm:text-[12.5px] text-[#68675F] leading-relaxed mb-5 max-w-md">
              Do you own a villa in Alibaug? Partner with Holiday Alibaug and reach more guests. Get featured on our platform and grow your bookings.
            </p>

            {/* 4 Benefits in a 2x2 Grid */}
            <div className="grid grid-cols-2 gap-x-4 gap-y-2.5 w-full mb-6 text-[11px] text-[#34322D]">
              <div className="flex items-center gap-2">
                <span className="w-4 h-4 rounded-full bg-[#E8C77F] text-[#171916] flex items-center justify-center shrink-0">
                  <Check className="w-2.5 h-2.5 stroke-[3]" />
                </span>
                <span className="font-medium">Reach genuine guests</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-4 h-4 rounded-full bg-[#E8C77F] text-[#171916] flex items-center justify-center shrink-0">
                  <Check className="w-2.5 h-2.5 stroke-[3]" />
                </span>
                <span className="font-medium">No hassle listing process</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-4 h-4 rounded-full bg-[#E8C77F] text-[#171916] flex items-center justify-center shrink-0">
                  <Check className="w-2.5 h-2.5 stroke-[3]" />
                </span>
                <span className="font-medium">Dedicated support</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-4 h-4 rounded-full bg-[#E8C77F] text-[#171916] flex items-center justify-center shrink-0">
                  <Check className="w-2.5 h-2.5 stroke-[3]" />
                </span>
                <span className="font-medium">Grow your villa bookings</span>
              </div>
            </div>

            {/* Become a Partner Button (Forest Green) */}
            <button
              onClick={handlePartnerScroll}
              className="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-semibold text-white bg-[#092D28] hover:bg-[#123B33] active:scale-[0.98] rounded-[6px] shadow-sm transition-all"
            >
              <span>Become a Partner</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Right Column: Villa Owner Enquiry Form Card */}
          <div id="owner-form-container" className="lg:col-span-4 bg-white rounded-[10px] p-5 border border-[#EAE3D8] shadow-sm">
            <h3 className="font-editorial text-lg font-semibold text-[#171916] mb-3">
              Villa Owner Enquiry Form
            </h3>

            {isSuccess ? (
              <div className="p-4 bg-[#F5EFE4] rounded-lg text-center flex flex-col items-center gap-2">
                <div className="w-10 h-10 rounded-full bg-[#092D28] text-[#E8C77F] flex items-center justify-center">
                  <Check className="w-5 h-5" />
                </div>
                <h4 className="font-editorial text-base font-semibold text-[#171916]">
                  Enquiry Submitted Successfully
                </h4>
                <p className="text-xs text-[#68675F] leading-relaxed">
                  Our partnerships team will review your villa details and contact you. Your reference: {reference}.
                </p>
                <div className="mt-3 flex gap-2 w-full">
                  <button
                    onClick={() => {
                      setIsSuccess(false);
                      setReference(null);
                      idemKey.current = newIdempotencyKey();
                      setFormData({
                        name: '',
                        phone: '',
                        villaName: '',
                        location: 'Alibaug',
                        customLocation: '',
                        message: '',
                        consent: false,
                      });
                    }}
                    className="flex-1 py-1.5 text-[11px] font-semibold text-[#171916] bg-[#E8C77F] hover:bg-[#D8AD57] rounded"
                  >
                    Send Another
                  </button>
                </div>
                <WhatsAppSend url={waUrl} state={wa.state} />
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-2.5 relative" noValidate>
                <div aria-hidden="true" style={{ position: 'absolute', left: '-10000px', width: 1, height: 1, overflow: 'hidden' }}>
                  <label>Leave this field empty<input type="text" name="website" tabIndex={-1} autoComplete="off" defaultValue="" /></label>
                </div>
                {formError && (
                  <div role="alert" className="flex items-start gap-2 p-2.5 rounded bg-red-50 border border-red-200 text-[11px] text-red-700">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-px" /><span>{formError} Your details have been kept.</span>
                  </div>
                )}
                {/* 2-column: Name & Phone */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div>
                    <label htmlFor="own-name" className="block text-[11px] font-semibold uppercase tracking-wider text-[#645F56] mb-1">
                      Name *
                    </label>
                    <input
                      type="text"
                      id="own-name" name="name"
                      value={formData.name}
                      onChange={handleChange}
                      placeholder="Your name"
                      className={`w-full px-2.5 py-1.5 text-xs bg-white border rounded-[5px] focus:outline-none focus:ring-1 focus:ring-[#D8AD57] ${
                        errors.name ? 'border-red-500' : 'border-[#DDD8CF]'
                      }`}
                    />
                    {errors.name && <span className="text-[11px] text-red-500">{errors.name}</span>}
                  </div>

                  <div>
                    <label htmlFor="own-phone" className="block text-[11px] font-semibold uppercase tracking-wider text-[#645F56] mb-1">
                      Phone Number *
                    </label>
                    <input
                      type="tel"
                      id="own-phone" name="phone"
                      value={formData.phone}
                      onChange={handleChange}
                      placeholder="Your phone number"
                      className={`w-full px-2.5 py-1.5 text-xs bg-white border rounded-[5px] focus:outline-none focus:ring-1 focus:ring-[#D8AD57] ${
                        errors.phone ? 'border-red-500' : 'border-[#DDD8CF]'
                      }`}
                    />
                    {errors.phone && <span className="text-[11px] text-red-500">{errors.phone}</span>}
                  </div>
                </div>

                {/* 2-column: Villa Name & Location */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div>
                    <label htmlFor="own-villaName" className="block text-[11px] font-semibold uppercase tracking-wider text-[#645F56] mb-1">
                      Villa Name *
                    </label>
                    <input
                      type="text"
                      id="own-villaName" name="villaName"
                      value={formData.villaName}
                      onChange={handleChange}
                      placeholder="Name of your villa"
                      className={`w-full px-2.5 py-1.5 text-xs bg-white border rounded-[5px] focus:outline-none focus:ring-1 focus:ring-[#D8AD57] ${
                        errors.villaName ? 'border-red-500' : 'border-[#DDD8CF]'
                      }`}
                    />
                    {errors.villaName && <span className="text-[11px] text-red-500">{errors.villaName}</span>}
                  </div>

                  <div>
                    <label htmlFor="own-location" className="block text-[11px] font-semibold uppercase tracking-wider text-[#645F56] mb-1">
                      Location *
                    </label>
                    <select
                      id="own-location" name="location"
                      value={formData.location}
                      onChange={handleChange}
                      className="w-full px-2.5 py-1.5 text-xs bg-white border border-[#DDD8CF] rounded-[5px] focus:outline-none focus:ring-1 focus:ring-[#D8AD57]"
                    >
                      <option value="Alibaug">Alibaug</option>
                      <option value="Nagaon">Nagaon</option>
                      <option value="Varsoli">Varsoli</option>
                      <option value="Kihim">Kihim</option>
                      <option value="Awas">Awas</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                </div>

                {/* Custom Location if Other */}
                {formData.location === 'Other' && (
                  <div>
                    <label htmlFor="own-customLocation" className="block text-[11px] font-semibold uppercase tracking-wider text-[#645F56] mb-1">
                      Specify Location *
                    </label>
                    <input
                      type="text"
                      id="own-customLocation" name="customLocation"
                      value={formData.customLocation}
                      onChange={handleChange}
                      placeholder="e.g. Mandwa, Revdanda, Akshi"
                      className="w-full px-2.5 py-1.5 text-xs bg-white border border-[#DDD8CF] rounded-[5px] focus:outline-none focus:ring-1 focus:ring-[#D8AD57]"
                    />
                    {errors.customLocation && <span className="text-[11px] text-red-500">{errors.customLocation}</span>}
                  </div>
                )}

                {/* Message */}
                <div>
                  <label htmlFor="own-message" className="block text-[11px] font-semibold uppercase tracking-wider text-[#645F56] mb-1">
                    Message
                  </label>
                  <textarea
                    id="own-message" name="message"
                    rows={2}
                    value={formData.message}
                    onChange={handleChange}
                    placeholder="Tell us about your villa (optional)"
                    className="w-full px-2.5 py-1.5 text-xs bg-white border border-[#DDD8CF] rounded-[5px] focus:outline-none focus:ring-1 focus:ring-[#D8AD57] resize-none"
                  />
                </div>

                {/* Consent */}
                <div className="flex items-start gap-2 pt-0.5">
                  <input
                    type="checkbox"
                    id="consent"
                    name="consent"
                    checked={formData.consent}
                    onChange={handleChange}
                    className="mt-0.5 rounded border-[#DDD8CF] text-[#B58B35] focus:ring-[#D8AD57]"
                  />
                  <label htmlFor="consent" className="text-[11px] text-[#645F56] leading-snug">
                    I agree to be contacted by Holiday Alibaug regarding partnership and villa listing.
                  </label>
                </div>
                {errors.consent && <span className="text-[11px] text-red-500 block">{errors.consent}</span>}

                {/* Submit button */}
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full mt-2 py-2 text-[11px] font-semibold text-[#171916] bg-[#E8C77F] hover:bg-[#D8AD57] active:scale-[0.99] disabled:opacity-50 rounded-[5px] transition-all flex items-center justify-center gap-1.5 shadow-xs"
                >
                  {isSubmitting ? (
                    <span>Submitting…</span>
                  ) : (
                    <>
                      <span>Submit Enquiry</span>
                      <ArrowRight className="w-3 h-3" />
                    </>
                  )}
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </section>
  );
};
