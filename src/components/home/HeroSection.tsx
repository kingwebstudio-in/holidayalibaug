import React from 'react';
import { Play, ArrowRight, Home, MapPin, Users, Sparkles } from 'lucide-react';
import { IMAGES } from '../../lib/constants';
import { HeroMedia } from '../common/HeroMedia';
import { useOptionalSiteData } from '../../context/SiteDataContext';
import { BookingSearch } from '../booking/BookingSearch';

interface HeroSectionProps {
  onCheckAvailability: (params: {
    villaId: string;
    villaName: string;
    checkIn: string;
    checkOut: string;
    adults: number;
    children: number;
  }) => void;
  onOpenVideoShowcase: () => void;
}

export const HeroSection: React.FC<HeroSectionProps> = ({
  onCheckAvailability,
  onOpenVideoShowcase,
}) => {
  const settings = useOptionalSiteData()?.settings ?? null;
  return (
    <section id="home" className="relative w-full min-h-[620px] lg:min-h-[670px] xl:min-h-[710px] flex flex-col justify-between overflow-hidden pt-28 pb-0">
      {/* Background Image with Cinematic Framing */}
      <div className="absolute inset-0 z-0">
        <HeroMedia image={settings?.heroImage} video={settings?.heroVideo} />
        {/* Measured dark gradient overlay on left for editorial typography contrast */}
        <div className="absolute inset-0 bg-gradient-to-r from-black/85 via-black/55 to-black/20 lg:from-black/80 lg:via-black/45 lg:to-transparent" />
        {/* Subtle top scrim for header legibility */}
        <div className="absolute top-0 left-0 right-0 h-32 bg-gradient-to-b from-black/70 to-transparent pointer-events-none" />
        {/* Subtle bottom darkening */}
        <div className="absolute bottom-0 left-0 right-0 h-40 bg-gradient-to-t from-black/60 via-black/20 to-transparent pointer-events-none" />
      </div>

      {/* Main Content Area */}
      <div className="relative z-10 max-w-[1440px] mx-auto w-full px-5 sm:px-8 lg:px-12 flex-1 flex flex-col justify-center my-auto">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center pt-2 sm:pt-4">
          {/* Left Column: Editorial Headline & Booking */}
          <div className="lg:col-span-8 flex flex-col items-start max-w-2xl">
            {/* Eyebrow Label */}
            <div className="inline-flex items-center gap-2 mb-3">
              <span className="text-[11px] sm:text-[11px] font-semibold tracking-[0.25em] text-[#E8C77F] uppercase">
                Luxury Villas in Alibaug
              </span>
            </div>

            {/* Editorial Serif 2-Line Headline */}
            <h1 className="font-editorial text-4xl sm:text-5xl lg:text-6xl xl:text-[68px] font-normal text-white leading-[0.95] tracking-tight mb-4 drop-shadow-sm">
              <span className="block">A Private</span>
              <span className="block italic font-light text-[#FDF9F3]">Coastal Escape</span>
            </h1>

            {/* Supporting Copy */}
            <p className="text-sm sm:text-base text-white/90 max-w-lg font-light leading-relaxed mb-6 sm:mb-8 drop-shadow">
              Exclusive villas, serene beaches and unforgettable stays — all in one destination.
            </p>

            {/* Horizontal Booking Bar */}
            <BookingSearch onCheckAvailability={onCheckAvailability} />

            {/* Trust Highlights Strip */}
            <div className="w-full max-w-[700px] mt-6 pt-2 grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-2">
              <div className="flex items-center gap-2 text-white/95 text-[11px] font-medium">
                <Home className="w-3.5 h-3.5 text-[#E8C77F] shrink-0" />
                <span className="whitespace-nowrap">Premium Villas</span>
              </div>
              <div className="flex items-center gap-2 text-white/95 text-[11px] font-medium">
                <MapPin className="w-3.5 h-3.5 text-[#E8C77F] shrink-0" />
                <span className="whitespace-nowrap">Best Locations</span>
              </div>
              <div className="flex items-center gap-2 text-white/95 text-[11px] font-medium">
                <Users className="w-3.5 h-3.5 text-[#E8C77F] shrink-0" />
                <span className="whitespace-nowrap">Family & Group Friendly</span>
              </div>
              <div className="flex items-center gap-2 text-white/95 text-[11px] font-medium">
                <Sparkles className="w-3.5 h-3.5 text-[#E8C77F] shrink-0" />
                <span className="whitespace-nowrap">Curated Experiences</span>
              </div>
            </div>
          </div>

          {/* Right Column: Villa Video/Discovery Action */}
          <div className="hidden lg:flex lg:col-span-4 flex-col items-end justify-center pr-2">
            <div className="flex flex-col items-end gap-3.5">
              {/* Play Button Action */}
              <button
                onClick={onOpenVideoShowcase}
                className="group flex items-center gap-3 px-4 py-2.5 rounded-full bg-white/20 hover:bg-white/30 backdrop-blur-md border border-white/30 shadow-lg transition-all transform hover:scale-[1.03]"
                aria-label="Watch our luxury villas showcase"
              >
                <div className="w-9 h-9 rounded-full bg-white text-[#092D28] flex items-center justify-center shadow-md transition-transform group-hover:scale-110">
                  <Play className="w-4 h-4 fill-current ml-0.5" />
                </div>
                <span className="text-xs font-semibold text-white tracking-wide pr-1">
                  Watch Our Villas
                </span>
              </button>

              {/* 3 Small Preview Thumbnails with Thin White Borders */}
              <div className="flex items-center gap-2">
                <div className="w-14 h-10 rounded-[6px] overflow-hidden border border-white/80 shadow-md">
                  <img src={IMAGES.thumbOcean} alt="" width={160} height={160} loading="lazy" decoding="async" className="w-full h-full object-cover" />
                </div>
                <div className="w-14 h-10 rounded-[6px] overflow-hidden border border-white/80 shadow-md">
                  <img src={IMAGES.thumbPalm} alt="" width={160} height={160} loading="lazy" decoding="async" className="w-full h-full object-cover" />
                </div>
                <div className="w-14 h-10 rounded-[6px] overflow-hidden border border-white/80 shadow-md">
                  <img src={IMAGES.thumbGarden} alt="" width={160} height={160} loading="lazy" decoding="async" className="w-full h-full object-cover" />
                </div>
              </div>

              {/* Small Action Link */}
              <button
                onClick={onOpenVideoShowcase}
                className="flex items-center gap-1.5 text-[11px] text-white/90 hover:text-[#E8C77F] font-medium transition-colors"
              >
                <span>Discover the Experience</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Curved, Wave-like Bottom Transition into Ivory Content (#FBF7EF) */}
      <div className="relative w-full leading-none z-10 -mb-[1px] mt-8 pointer-events-none">
        <svg
          viewBox="0 0 1440 88"
          fill="none"
          preserveAspectRatio="none"
          className="w-full h-12 sm:h-16 lg:h-20 text-[#FBF7EF]"
        >
          {/* Asymmetric natural wave transition matching reference screenshot */}
          <path
            d="M0,32 C280,78 640,12 980,56 C1180,82 1340,46 1440,30 L1440,88 L0,88 Z"
            fill="#FBF7EF"
          />
        </svg>
      </div>
    </section>
  );
};
