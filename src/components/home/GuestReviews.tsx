import React, { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useSiteData } from '../../context/SiteDataContext';

export const GuestReviews: React.FC = () => {
  const { testimonials: REVIEWS } = useSiteData();
  const [startIndex, setStartIndex] = useState(0);
  if (REVIEWS.length === 0) return null; // no approved testimonials => no section (never show invented reviews)

  // We have 4 reviews, displaying 3 cards at a time on desktop
  const handlePrev = () => {
    setStartIndex((prev) => (prev === 0 ? REVIEWS.length - 1 : prev - 1));
  };

  const handleNext = () => {
    setStartIndex((prev) => (prev + 1) % REVIEWS.length);
  };

  // Build the 3 cards window cyclically
  const visibleReviews = Array.from({ length: Math.min(3, REVIEWS.length) }, (_, i) => REVIEWS[(startIndex + i) % REVIEWS.length]);

  return (
    <section id="guest-reviews" className="relative w-full bg-[#FBF7EF] py-10 sm:py-14">
      <div className="max-w-[1440px] mx-auto px-5 sm:px-8 lg:px-12">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-center">
          {/* Left Column: Heading & Carousel Arrows */}
          <div className="lg:col-span-3 flex flex-col justify-center">
            <span className="text-[11px] font-semibold tracking-[0.2em] text-[#7A5410] uppercase mb-1">
              Guest Reviews
            </span>
            <h2 className="font-editorial text-2xl sm:text-3xl lg:text-[32px] font-semibold text-[#171916] leading-tight mb-2">
              What Our Guests Say
            </h2>
            <p className="text-xs sm:text-[13px] text-[#68675F] leading-relaxed mb-5">
              Experiences shared by our guests.
            </p>

            {/* Carousel Arrow Controls */}
            <div className="flex items-center gap-2.5">
              <button
                onClick={handlePrev}
                className="w-8 h-8 rounded-full bg-white border border-[#EAE3D8] text-[#171916] hover:bg-[#F5EFE4] hover:border-[#D8AD57] flex items-center justify-center shadow-xs transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#D8AD57]"
                aria-label="Previous testimonial"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={handleNext}
                className="w-8 h-8 rounded-full bg-white border border-[#EAE3D8] text-[#171916] hover:bg-[#F5EFE4] hover:border-[#D8AD57] flex items-center justify-center shadow-xs transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#D8AD57]"
                aria-label="Next testimonial"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Right Area: Testimonial Cards */}
          <div className="lg:col-span-9">
            {/* Desktop: 3 cards row | Mobile: 1 card with smooth transition */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {visibleReviews.map((rev, idx) => (
                <div
                  key={`${rev.id}-${idx}`}
                  className={`bg-white rounded-[10px] p-4 sm:p-5 border border-[#EAE3D8] shadow-xs flex flex-col justify-between transition-all duration-300 hover:shadow-md ${
                    idx > 0 ? 'hidden md:flex' : 'flex'
                  }`}
                >
                  <div>
                    {/* Decorative Serif Quote Mark */}
                    <div className="font-editorial text-3xl font-bold text-[#D8AD57] leading-none mb-2">
                      “
                    </div>

                    {/* Review text */}
                    <p className="text-xs sm:text-[12.5px] text-[#42403B] leading-relaxed italic">
                      "{rev.quote}"
                    </p>
                  </div>

                  {/* Guest Avatar, Name, City */}
                  <div className="flex items-center gap-3 mt-4 pt-3 border-t border-[#F5EFE4]">
                    <div className="w-8 h-8 rounded-full bg-[#092D28] text-[#E8C77F] font-semibold text-xs flex items-center justify-center shadow-xs shrink-0">
                      {rev.guestName.charAt(0)}
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[12px] font-semibold text-[#171916] leading-tight">
                        {rev.guestName}
                      </span>
                      <span className="text-[11px] text-[#645F56] font-medium">
                        {[rev.city, rev.villaName && `Stayed at ${rev.villaName}`].filter(Boolean).join(' · ')}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
