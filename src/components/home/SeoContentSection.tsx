import React, { useState } from 'react';
import { ChevronDown, MapPin, Waves, Utensils, Compass, Car, Sparkles, CheckCircle2 } from 'lucide-react';

interface FaqItem {
  question: string;
  answer: string;
}

const FAQS: FaqItem[] = [
  {
    question: 'What is Holiday Alibag (Holiday Alibaug)?',
    answer:
      'Holiday Alibag (also known as Holiday Alibaug or HolidayAlibag) is a premier holiday home and luxury villa booking partner in Alibaug, Maharashtra. Operating since 2021, we curate handpicked private pool villas, beachfront cottages, and spacious estates across Kihim, Mandwa, Varsoli, and Nagaon for discerning families, couples, and group getaways.',
  },
  {
    question: 'How do I book a private pool villa or holiday home in Alibaug?',
    answer:
      'Booking is seamless on HolidayAlibag.com: browse our verified villa collection, select your desired stay dates and number of guests, and submit a booking enquiry or connect directly on WhatsApp. Our concierge verifies availability in real time, assists with customized meal plans or special requests, and confirms your stay.',
  },
  {
    question: 'Which areas in Alibaug have the best villas and holiday stays?',
    answer:
      'Top locations include Kihim Beach (serene coconut groves, private pool stays), Mandwa Jetty (closest to Mumbai ferries and luxury estates), Varsoli Beach (white sand beach, water sports, close to town), Nagaon Beach (wide flat sands, adventure sports, large group bungalows), and Awas (quiet, high-privacy retreats).',
  },
  {
    question: 'How do I travel to Alibaug from Mumbai and Pune?',
    answer:
      'From Mumbai, you can board the M2M Ro-Ro car ferry from Ferry Wharf (Bhaucha Dhakka) to Mandwa Jetty in just 60 minutes with your vehicle, or take a 50-minute speed boat from the Gateway of India. By road, drive via Atal Setu (MTHL) and the Mumbai-Goa Highway. From Pune, Alibaug is a scenic 3 to 3.5 hour drive via the Mumbai-Pune Expressway and Khopoli.',
  },
  {
    question: 'Do your villas in Alibaug include swimming pools and private chefs?',
    answer:
      'Yes, our luxury villas feature private, hygienically maintained swimming pools reserved exclusively for your group. Dedicated on-site caretakers and private cook services (serving authentic coastal Konkani seafood, vegetarian feasts, and customized home-style meals) are available upon request.',
  },
];

const SEARCH_TAGS = [
  'Holiday Alibag',
  'Holiday Alibaug',
  'holidayalibaug.com',
  'Villas in Alibaug with Swimming Pool',
  'Private Pool Villa in Alibag',
  'Luxury Holiday Homes Alibaug',
  'Kihim Beach Villas',
  'Mandwa Jetty Villas',
  'Varsoli Beach Cottages',
  'Nagaon Beach Stays',
  'Awas Beach Villas',
  'Weekend Getaways from Mumbai to Alibaug',
  'Pune to Alibaug Villa Stays',
  'Best Homestays in Alibaug',
  'Alibaug Group Stays & Bungalows',
  'Pet Friendly Villas in Alibaug',
  'Corporate Offsite Stays Alibaug',
  'Alibaug Villa Booking with Cook',
];

export const SeoContentSection: React.FC = () => {
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  const toggleFaq = (idx: number) => {
    setOpenFaq((prev) => (prev === idx ? null : idx));
  };

  return (
    <section id="alibaug-guide" className="relative w-full bg-[#F4EFE6] text-[#171916] py-14 sm:py-20 border-t border-[#EAE3D8]">
      <div className="max-w-[1440px] mx-auto px-5 sm:px-8 lg:px-12">
        {/* Section Header */}
        <div className="max-w-3xl mb-12 sm:mb-16">
          <div className="inline-flex items-center gap-2 mb-3">
            <span className="text-[11px] font-semibold tracking-[0.25em] text-[#A67C2E] uppercase">
              Holiday Alibag &amp; Holiday Alibaug Guide
            </span>
          </div>
          <h2 className="font-editorial text-3xl sm:text-4xl lg:text-5xl font-normal text-[#092D28] leading-[1.05] tracking-tight mb-4">
            Luxury Villas, Holiday Homes &amp; <span className="italic">Private Pool Stays in Alibaug</span>
          </h2>
          <p className="text-sm sm:text-base text-[#4A554D] leading-relaxed font-light">
            Whether you search for <strong className="font-semibold text-[#092D28]">Holiday Alibag</strong> or{' '}
            <strong className="font-semibold text-[#092D28]">Holiday Alibaug</strong>, your search for the perfect coastal getaway ends here. Discover handpicked private villas, beachfront cottages, and luxury holiday homes in Alibag (Maharashtra) designed for ultimate relaxation, privacy, and authentic coastal hospitality.
          </p>
        </div>

        {/* 3 Pillars of Alibaug Stays Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8 mb-16">
          {/* Card 1 */}
          <div className="bg-white rounded-xl p-6 sm:p-7 border border-[#EAE3D8] shadow-sm hover:shadow-md transition-shadow">
            <div className="w-10 h-10 rounded-lg bg-[#092D28]/10 text-[#092D28] flex items-center justify-center mb-5">
              <Waves className="w-5 h-5 text-[#A67C2E]" />
            </div>
            <h3 className="font-editorial text-xl font-semibold text-[#092D28] mb-2.5">
              Private Pool Villas in Alibaug
            </h3>
            <p className="text-xs sm:text-[13px] text-[#4A554D] leading-relaxed mb-4">
              Step into complete seclusion with your own private temperature-friendly swimming pool, sun deck, and lush landscaped garden. Ideal for families, intimate celebrations, and weekend breaks from Mumbai and Pune.
            </p>
            <ul className="space-y-2 text-xs text-[#2C3E35]">
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-[#A67C2E] shrink-0" />
                <span>100% Private Pools (Never Shared)</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-[#A67C2E] shrink-0" />
                <span>Spacious lawns &amp; outdoor sit-outs</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-[#A67C2E] shrink-0" />
                <span>High-speed Wi-Fi &amp; power backup</span>
              </li>
            </ul>
          </div>

          {/* Card 2 */}
          <div className="bg-white rounded-xl p-6 sm:p-7 border border-[#EAE3D8] shadow-sm hover:shadow-md transition-shadow">
            <div className="w-10 h-10 rounded-lg bg-[#092D28]/10 text-[#092D28] flex items-center justify-center mb-5">
              <MapPin className="w-5 h-5 text-[#A67C2E]" />
            </div>
            <h3 className="font-editorial text-xl font-semibold text-[#092D28] mb-2.5">
              Handpicked Coastal Locations
            </h3>
            <p className="text-xs sm:text-[13px] text-[#4A554D] leading-relaxed mb-4">
              From the tranquil coconut groves of Kihim Beach to the happening shores of Varsoli and Nagaon, stay close to the sand while enjoying peaceful privacy.
            </p>
            <ul className="space-y-2 text-xs text-[#2C3E35]">
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-[#A67C2E] shrink-0" />
                <span><strong>Kihim &amp; Awas:</strong> Quiet serenity &amp; lush greenery</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-[#A67C2E] shrink-0" />
                <span><strong>Mandwa:</strong> 10 mins from the Ro-Ro terminal</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-[#A67C2E] shrink-0" />
                <span><strong>Varsoli &amp; Nagaon:</strong> Beach access &amp; water sports</span>
              </li>
            </ul>
          </div>

          {/* Card 3 */}
          <div className="bg-white rounded-xl p-6 sm:p-7 border border-[#EAE3D8] shadow-sm hover:shadow-md transition-shadow">
            <div className="w-10 h-10 rounded-lg bg-[#092D28]/10 text-[#092D28] flex items-center justify-center mb-5">
              <Utensils className="w-5 h-5 text-[#A67C2E]" />
            </div>
            <h3 className="font-editorial text-xl font-semibold text-[#092D28] mb-2.5">
              Authentic Konkani Dining
            </h3>
            <p className="text-xs sm:text-[13px] text-[#4A554D] leading-relaxed mb-4">
              Savour mouth-watering coastal feasts cooked by experienced private cooks on request. Fresh catch pomfret, surmai rava fry, crab masala, and delicious vegetarian Konkani spreads.
            </p>
            <ul className="space-y-2 text-xs text-[#2C3E35]">
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-[#A67C2E] shrink-0" />
                <span>Private chef &amp; cook on request</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-[#A67C2E] shrink-0" />
                <span>Authentic seafood &amp; vegetarian recipes</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-[#A67C2E] shrink-0" />
                <span>Dedicated on-site villa caretaker service</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Travel Guide: Mumbai & Pune to Alibaug */}
        <div className="bg-[#092D28] text-white rounded-2xl p-7 sm:p-10 mb-16 shadow-xl relative overflow-hidden">
          <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            <div className="lg:col-span-5">
              <span className="text-[10.5px] font-semibold tracking-[0.25em] text-[#E8C77F] uppercase mb-2 block">
                Effortless Connectivity
              </span>
              <h3 className="font-editorial text-2xl sm:text-3xl lg:text-4xl font-normal leading-snug mb-3">
                How to Reach Your <span className="italic text-[#E8C77F]">Alibaug Villa</span>
              </h3>
              <p className="text-xs sm:text-sm text-white/80 leading-relaxed font-light">
                Escape Mumbai's rush in under an hour. Alibaug has never been closer thanks to world-class ferry and highway connectivity.
              </p>
            </div>

            <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                <div className="flex items-center gap-2 text-[#E8C77F] text-xs font-semibold mb-1.5">
                  <Car className="w-4 h-4" />
                  <span>M2M Ro-Ro Car Ferry</span>
                </div>
                <p className="text-[12px] text-white/80 leading-relaxed">
                  Drive your car onto the ferry at Bhaucha Dhakka (Ferry Wharf, Mumbai) and arrive at Mandwa Jetty in just <strong>60 minutes</strong>. AC lounge &amp; pet friendly.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                <div className="flex items-center gap-2 text-[#E8C77F] text-xs font-semibold mb-1.5">
                  <Compass className="w-4 h-4" />
                  <span>Speedboats &amp; Catamarans</span>
                </div>
                <p className="text-[12px] text-white/80 leading-relaxed">
                  Regular speedboats and air-conditioned catamarans from Gateway of India to Mandwa Jetty take only <strong>45 to 55 minutes</strong>.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                <div className="flex items-center gap-2 text-[#E8C77F] text-xs font-semibold mb-1.5">
                  <Car className="w-4 h-4" />
                  <span>Road via Atal Setu (MTHL)</span>
                </div>
                <p className="text-[12px] text-white/80 leading-relaxed">
                  Travel via the Mumbai Trans Harbour Link (Atal Setu) and Chirle to reach Alibaug villas smoothly by road in approx <strong>2 to 2.5 hours</strong>.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                <div className="flex items-center gap-2 text-[#E8C77F] text-xs font-semibold mb-1.5">
                  <Sparkles className="w-4 h-4" />
                  <span>From Pune via Expressway</span>
                </div>
                <p className="text-[12px] text-white/80 leading-relaxed">
                  Scenic <strong>3 to 3.5 hour drive</strong> from Pune via Mumbai-Pune Expressway, Khopoli exit, and Pen-Alibaug road.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Frequently Asked Questions (FAQ) with Accordion */}
        <div className="max-w-4xl mx-auto mb-16">
          <div className="text-center mb-10">
            <span className="text-[11px] font-semibold tracking-[0.25em] text-[#A67C2E] uppercase block mb-1.5">
              Got Questions?
            </span>
            <h3 className="font-editorial text-2xl sm:text-3xl lg:text-4xl font-normal text-[#092D28]">
              Frequently Asked Questions About <span className="italic">Holiday Alibag</span>
            </h3>
          </div>

          <div className="space-y-3.5">
            {FAQS.map((faq, idx) => {
              const isOpen = openFaq === idx;
              return (
                <div
                  key={faq.question}
                  className="bg-white rounded-xl border border-[#EAE3D8] overflow-hidden transition-all duration-200 shadow-xs"
                >
                  <button
                    type="button"
                    onClick={() => toggleFaq(idx)}
                    className="w-full px-5 sm:px-6 py-4 text-left flex items-center justify-between gap-4 font-editorial text-lg sm:text-xl font-normal text-[#092D28] hover:text-[#A67C2E] transition-colors"
                    aria-expanded={isOpen}
                  >
                    <span>{faq.question}</span>
                    <ChevronDown
                      className={`w-4 h-4 text-[#A67C2E] shrink-0 transition-transform duration-200 ${
                        isOpen ? 'rotate-180' : ''
                      }`}
                    />
                  </button>
                  {isOpen && (
                    <div className="px-5 sm:px-6 pb-5 pt-1 text-xs sm:text-sm text-[#4A554D] leading-relaxed border-t border-[#F4EFE6]">
                      {faq.answer}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Popular Keyword Searches Cloud */}
        <div className="border-t border-[#EAE3D8] pt-10">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
            <h4 className="text-xs font-semibold tracking-[0.15em] text-[#092D28] uppercase">
              Popular Searches &amp; Villa Categories in Alibaug
            </h4>
            <span className="text-[11px] text-[#6E7B74]">
              High-ranking searches on Holiday Alibag (holidayalibaug.com)
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            {SEARCH_TAGS.map((tag) => (
              <span
                key={tag}
                className="inline-block px-3 py-1.5 text-[11px] font-medium text-[#2C3E35] bg-white rounded-full border border-[#EAE3D8] shadow-2xs hover:border-[#A67C2E] transition-colors"
              >
                {tag}
              </span>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};
