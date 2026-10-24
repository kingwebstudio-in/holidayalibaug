import React, { useRef, useState } from 'react';
import { ArrowRight, Check, Building, AlertCircle } from 'lucide-react';
import { validatePhone, validateEmail } from '../../lib/validation';
import { buildWhatsAppUrl, investmentWhatsAppText } from '../../lib/whatsapp';
import { useWhatsAppHandoff } from '../../hooks/useWhatsAppHandoff';
import { WhatsAppSend } from '../common/WhatsAppSend';
import { useSiteData } from '../../context/SiteDataContext';
import { ApiError, newIdempotencyKey } from '../../services/api';
import { submitInvestmentEnquiry } from '../../services/publicApi';
import { events } from '../../lib/analytics';

interface PropertyInvestmentSectionProps {
  onShowToast: (title: string, message: string, type: 'success' | 'error') => void;
}

export const PropertyInvestmentSection: React.FC<PropertyInvestmentSectionProps> = ({ onShowToast }) => {
  const [formData, setFormData] = useState({
    fullName: '',
    phone: '',
    email: '',
    preferredLocation: 'Alibaug',
    customLocation: '',
    budgetBand: '₹1–2 crore',
    propertyType: 'Villa',
    requirements: '',
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

    if (!formData.fullName.trim()) newErrors.fullName = 'Please enter your full name';
    if (!formData.phone.trim()) {
      newErrors.phone = 'Please enter your phone number';
    } else if (!validatePhone(formData.phone)) {
      newErrors.phone = 'Please enter a valid phone number';
    }
    if (!formData.email.trim()) {
      newErrors.email = 'Please enter your email';
    } else if (!validateEmail(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }
    if (formData.preferredLocation === 'Other' && !formData.customLocation.trim()) {
      newErrors.customLocation = 'Please specify your preferred location';
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
      const r = await submitInvestmentEnquiry(
        {
          customerName: formData.fullName,
          phone: formData.phone,
          email: formData.email,
          preferredLocation: formData.preferredLocation === 'Other' ? formData.customLocation : formData.preferredLocation,
          budgetRange: formData.budgetBand,
          propertyType: formData.propertyType,
          requirements: formData.requirements || undefined,
          consent: formData.consent,
          website: trap || undefined,
        },
        idemKey.current,
      );
      events.investmentEnquiry();
      setReference(r.reference);
      wa.open(investUrl(r.reference)); // opens WhatsApp only now that the enquiry is saved
      setIsSuccess(true);
      onShowToast('Investment enquiry received', `Reference ${r.reference}. Our team will contact you to discuss options.`, 'success');
    } catch (err) {
      wa.abort();
      const apiErr = err instanceof ApiError ? err : null;
      if (apiErr?.fieldErrors) {
        const map: Record<string, string> = {};
        for (const [k, v] of Object.entries(apiErr.fieldErrors)) map[k === 'customerName' ? 'fullName' : k === 'budgetRange' ? 'budgetBand' : k === 'preferredLocation' ? 'customLocation' : k] = v;
        setErrors(map);
      }
      setFormError(apiErr?.message ?? 'Something went wrong. Please try again.');
    } finally {
      inFlight.current = false;
      setIsSubmitting(false);
    }
  };

  const investUrl = (ref: string) => buildWhatsAppUrl(settings?.whatsappNumber, investmentWhatsAppText({
    reference: ref, name: formData.fullName, phone: formData.phone, email: formData.email,
    location: formData.preferredLocation === 'Other' ? formData.customLocation : formData.preferredLocation,
    budget: formData.budgetBand, propertyType: formData.propertyType, requirements: formData.requirements,
  }));
  const waUrl = reference ? investUrl(reference) : null;

  return (
    <section id="property-investment" className="relative w-full bg-[#F5EFE4] py-12 lg:py-16 border-t border-[#EAE3D8]">
      <div className="max-w-[1440px] mx-auto px-5 sm:px-8 lg:px-12">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          {/* Left Column: Heading and Context */}
          <div className="lg:col-span-5 flex flex-col items-start justify-center">
            <span className="text-[11px] font-semibold tracking-[0.2em] text-[#7A5410] uppercase mb-1.5">
              Property Investment
            </span>

            <h2 className="font-editorial text-2xl sm:text-3xl font-semibold text-[#171916] leading-tight mb-2.5">
              Find Your Property Investment in Alibaug
            </h2>

            <p className="text-xs sm:text-[13px] text-[#68675F] leading-relaxed mb-5 max-w-md">
              Explore property opportunities in Alibaug. Share your requirements and our team can get in touch to discuss suitable options.
            </p>

            <div className="p-4 bg-white/80 rounded-lg border border-[#E6DED0] space-y-2 text-xs text-[#42403B] max-w-md shadow-xs">
              <div className="flex items-center gap-2 font-medium text-[#171916]">
                <Building className="w-4 h-4 text-[#B58B35]" />
                <span>Curated Coastal Real Estate Advisory</span>
              </div>
              <p className="text-[11px] text-[#645F56] leading-relaxed">
                From beachside plots to high-yield holiday villas managed by our professional hospitality team, we help you discover vetted properties across Alibaug, Nagaon, Kihim, and Awas.
              </p>
            </div>
          </div>

          {/* Right Column: Investment Enquiry Form */}
          <div className="lg:col-span-7 bg-white rounded-[10px] p-5 sm:p-6 border border-[#EAE3D8] shadow-sm">
            <h3 className="font-editorial text-lg font-semibold text-[#171916] mb-3">
              Property Investment Enquiry
            </h3>

            {isSuccess ? (
              <div className="p-5 bg-[#FBF7EF] rounded-lg text-center flex flex-col items-center gap-2 border border-[#EAE3D8]">
                <div className="w-10 h-10 rounded-full bg-[#092D28] text-[#E8C77F] flex items-center justify-center">
                  <Check className="w-5 h-5" />
                </div>
                <h4 className="font-editorial text-base font-semibold text-[#171916]">
                  Enquiry Received
                </h4>
                <p className="text-xs text-[#68675F] max-w-sm">
                  Our team will review your requirements and contact you to discuss options. Your reference: <span className="font-mono font-semibold text-[#092D28]">{reference}</span>
                </p>
                <div className="mt-3 flex gap-2">
                  <button
                    onClick={() => {
                      setIsSuccess(false);
                      setReference(null);
                      idemKey.current = newIdempotencyKey();
                      setFormData({
                        fullName: '',
                        phone: '',
                        email: '',
                        preferredLocation: 'Alibaug',
                        customLocation: '',
                        budgetBand: '₹1–2 crore',
                        propertyType: 'Villa',
                        requirements: '',
                        consent: false,
                      });
                    }}
                    className="px-4 py-1.5 text-xs font-semibold text-[#171916] bg-[#E8C77F] hover:bg-[#D8AD57] rounded"
                  >
                    Submit Another Query
                  </button>
                </div>
                <WhatsAppSend url={waUrl} state={wa.state} />
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-3 relative" noValidate>
                <div aria-hidden="true" style={{ position: 'absolute', left: '-10000px', width: 1, height: 1, overflow: 'hidden' }}>
                  <label>Leave this field empty<input type="text" name="website" tabIndex={-1} autoComplete="off" defaultValue="" /></label>
                </div>
                {formError && (
                  <div role="alert" className="flex items-start gap-2 p-2.5 rounded bg-red-50 border border-red-200 text-[11px] text-red-700">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-px" /><span>{formError} Your details have been kept.</span>
                  </div>
                )}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  <div>
                    <label htmlFor="inv-fullName" className="block text-[11px] font-semibold uppercase tracking-wider text-[#645F56] mb-1">
                      Full Name *
                    </label>
                    <input
                      type="text"
                      id="inv-fullName" name="fullName"
                      value={formData.fullName}
                      onChange={handleChange}
                      placeholder="Your full name"
                      className={`w-full px-2.5 py-1.5 text-xs bg-white border rounded-[5px] focus:outline-none focus:ring-1 focus:ring-[#D8AD57] ${
                        errors.fullName ? 'border-red-500' : 'border-[#DDD8CF]'
                      }`}
                    />
                    {errors.fullName && <span className="text-[11px] text-red-500">{errors.fullName}</span>}
                  </div>

                  <div>
                    <label htmlFor="inv-phone" className="block text-[11px] font-semibold uppercase tracking-wider text-[#645F56] mb-1">
                      Phone Number *
                    </label>
                    <input
                      type="tel"
                      id="inv-phone" name="phone"
                      value={formData.phone}
                      onChange={handleChange}
                      placeholder="Your phone"
                      className={`w-full px-2.5 py-1.5 text-xs bg-white border rounded-[5px] focus:outline-none focus:ring-1 focus:ring-[#D8AD57] ${
                        errors.phone ? 'border-red-500' : 'border-[#DDD8CF]'
                      }`}
                    />
                    {errors.phone && <span className="text-[11px] text-red-500">{errors.phone}</span>}
                  </div>

                  <div>
                    <label htmlFor="inv-email" className="block text-[11px] font-semibold uppercase tracking-wider text-[#645F56] mb-1">
                      Email Address *
                    </label>
                    <input
                      type="email"
                      id="inv-email" name="email"
                      value={formData.email}
                      onChange={handleChange}
                      placeholder="Your email"
                      className={`w-full px-2.5 py-1.5 text-xs bg-white border rounded-[5px] focus:outline-none focus:ring-1 focus:ring-[#D8AD57] ${
                        errors.email ? 'border-red-500' : 'border-[#DDD8CF]'
                      }`}
                    />
                    {errors.email && <span className="text-[11px] text-red-500">{errors.email}</span>}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  <div>
                    <label htmlFor="inv-preferredLocation" className="block text-[11px] font-semibold uppercase tracking-wider text-[#645F56] mb-1">
                      Preferred Location
                    </label>
                    <select
                      id="inv-preferredLocation" name="preferredLocation"
                      value={formData.preferredLocation}
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

                  <div>
                    <label htmlFor="inv-budgetBand" className="block text-[11px] font-semibold uppercase tracking-wider text-[#645F56] mb-1">
                      Investment Budget
                    </label>
                    <select
                      id="inv-budgetBand" name="budgetBand"
                      value={formData.budgetBand}
                      onChange={handleChange}
                      className="w-full px-2.5 py-1.5 text-xs bg-white border border-[#DDD8CF] rounded-[5px] focus:outline-none focus:ring-1 focus:ring-[#D8AD57]"
                    >
                      <option value="Under ₹25 lakh">Under ₹25 lakh</option>
                      <option value="₹25–50 lakh">₹25–50 lakh</option>
                      <option value="₹50 lakh–₹1 crore">₹50 lakh–₹1 crore</option>
                      <option value="₹1–2 crore">₹1–2 crore</option>
                      <option value="Above ₹2 crore">Above ₹2 crore</option>
                      <option value="Prefer to discuss">Prefer to discuss</option>
                    </select>
                  </div>

                  <div>
                    <label htmlFor="inv-propertyType" className="block text-[11px] font-semibold uppercase tracking-wider text-[#645F56] mb-1">
                      Property Type
                    </label>
                    <select
                      id="inv-propertyType" name="propertyType"
                      value={formData.propertyType}
                      onChange={handleChange}
                      className="w-full px-2.5 py-1.5 text-xs bg-white border border-[#DDD8CF] rounded-[5px] focus:outline-none focus:ring-1 focus:ring-[#D8AD57]"
                    >
                      <option value="Villa">Villa</option>
                      <option value="Holiday Home">Holiday Home</option>
                      <option value="Residential Plot">Residential Plot</option>
                      <option value="Residential Property">Residential Property</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                </div>

                {formData.preferredLocation === 'Other' && (
                  <div>
                    <label htmlFor="inv-customLocation" className="block text-[11px] font-semibold uppercase tracking-wider text-[#645F56] mb-1">
                      Specify Location
                    </label>
                    <input
                      type="text"
                      id="inv-customLocation" name="customLocation"
                      value={formData.customLocation}
                      onChange={handleChange}
                      placeholder="e.g. Mandwa, Revdanda, Akshi"
                      className="w-full px-2.5 py-1.5 text-xs bg-white border border-[#DDD8CF] rounded-[5px]"
                    />
                  </div>
                )}

                <div>
                  <label htmlFor="inv-requirements" className="block text-[11px] font-semibold uppercase tracking-wider text-[#645F56] mb-1">
                    Specific Requirements (Optional)
                  </label>
                  <textarea
                    id="inv-requirements" name="requirements"
                    rows={2}
                    value={formData.requirements}
                    onChange={handleChange}
                    placeholder="e.g. Sea-facing plot, private swimming pool, proximity to Mandwa jetty"
                    className="w-full px-2.5 py-1.5 text-xs bg-white border border-[#DDD8CF] rounded-[5px] focus:outline-none focus:ring-1 focus:ring-[#D8AD57] resize-none"
                  />
                </div>

                <div className="flex items-start gap-2">
                  <input
                    type="checkbox"
                    id="consentInv"
                    name="consent"
                    checked={formData.consent}
                    onChange={handleChange}
                    className="mt-0.5 rounded border-[#DDD8CF] text-[#B58B35] focus:ring-[#D8AD57]"
                  />
                  <label htmlFor="consentInv" className="text-[11px] text-[#645F56]">
                    I consent to Holiday Alibaug contacting me with relevant property opportunities.
                  </label>
                </div>
                {errors.consent && <span className="text-[11px] text-red-500 block">{errors.consent}</span>}

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-2.5 text-xs font-semibold text-[#171916] bg-[#E8C77F] hover:bg-[#D8AD57] active:scale-[0.99] disabled:opacity-50 rounded-[5px] transition-all flex items-center justify-center gap-1.5 shadow-xs"
                >
                  {isSubmitting ? (
                    <span>Submitting…</span>
                  ) : (
                    <>
                      <span>Submit Investment Enquiry</span>
                      <ArrowRight className="w-3.5 h-3.5" />
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
