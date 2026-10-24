import React, { useState } from 'react';
import { MapPin, ArrowRight, X, Clock, Navigation } from 'lucide-react';
import { DESTINATIONS, IMAGES } from '../../lib/constants';
import { Destination } from '../../types';

export const ExploreAlibaug: React.FC = () => {
  const [selectedDest, setSelectedDest] = useState<Destination | null>(null);

  return (
    <section id="explore-alibaug" className="relative w-full overflow-hidden text-white pt-12 lg:pt-16 pb-0">
      {/* Background Image: Aerial Coastal Panorama */}
      <div className="absolute inset-0 z-0">
        <img
          src={IMAGES.alibaugPanorama}
          alt="Panoramic coastline of Alibaug, Maharashtra"
          className="w-full h-full object-cover object-center"
          loading="lazy"
        />
        {/* Dark gradient overlay on left for readable white text */}
        <div className="absolute inset-0 bg-gradient-to-r from-black/85 via-black/60 to-black/30 lg:from-black/80 lg:via-black/50 lg:to-black/20" />
      </div>

      {/* Content */}
      <div className="relative z-10 max-w-[1440px] mx-auto px-5 sm:px-8 lg:px-12 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          {/* Left Text Block */}
          <div className="lg:col-span-5 flex flex-col items-start max-w-md">
            <span className="text-[11px] font-semibold tracking-[0.2em] text-[#E8C77F] uppercase mb-1.5">
              Explore Alibaug
            </span>
            <h2 className="font-editorial text-2xl sm:text-3xl lg:text-4xl font-normal text-white leading-[1.05] mb-3">
              <span className="block">Beaches, Nature &</span>
              <span className="block italic text-[#FDF9F3]">Coastal Charm</span>
            </h2>
            <p className="text-xs sm:text-[13px] text-white/90 leading-relaxed mb-5">
              Discover pristine beaches, historic forts, local cafés and hidden gems — all within easy reach.
            </p>
            <button
              onClick={() => setSelectedDest(DESTINATIONS[0])}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-[11px] font-semibold text-[#171916] bg-[#E8C77F] hover:bg-[#D8AD57] active:scale-[0.98] rounded-[6px] shadow-sm transition-all"
            >
              <span>Explore Alibaug</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Right: 4 Destination Thumbnails in a horizontal row on desktop */}
          <div className="lg:col-span-7">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-3.5">
              {DESTINATIONS.map((dest) => (
                <div
                  key={dest.id}
                  onClick={() => setSelectedDest(dest)}
                  className="group cursor-pointer flex flex-col focus:outline-none"
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      setSelectedDest(dest);
                    }
                  }}
                >
                  {/* Thumbnail Image with Thin White Border */}
                  <div className="aspect-[1.4/1] w-full rounded-[7px] overflow-hidden border border-white/90 shadow-md bg-black/40">
                    <img
                      src={dest.image}
                      alt={dest.name}
                      className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                      loading="lazy"
                    />
                  </div>

                  {/* Location Pin, Name & Travel Time */}
                  <div className="mt-2 flex items-start gap-1">
                    <MapPin className="w-3 h-3 text-[#E8C77F] shrink-0 mt-0.5" />
                    <div className="flex flex-col">
                      <span className="text-[11px] font-semibold text-white leading-tight">
                        {dest.name}
                      </span>
                      <span className="text-[11px] text-white/80 font-medium">
                        {dest.travelTime}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Destination Detail Modal */}
      {selectedDest && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200"
          role="dialog"
          aria-modal="true"
        >
          <div className="bg-white rounded-xl max-w-lg w-full overflow-hidden shadow-2xl border border-[#EAE3D8] relative animate-in zoom-in-95 duration-200 text-[#171916]">
            <button
              onClick={() => setSelectedDest(null)}
              className="absolute top-4 right-4 z-10 w-7 h-7 rounded-full bg-white/80 backdrop-blur-sm flex items-center justify-center text-[#171916] hover:bg-white shadow"
              aria-label="Close dialog"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="h-52 w-full bg-[#171916]">
              <img src={selectedDest.image} alt={selectedDest.name} className="w-full h-full object-cover" />
            </div>

            <div className="p-6">
              <div className="flex items-center gap-3 text-xs text-[#7A5410] font-semibold mb-1">
                <span className="flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5" />
                  {selectedDest.travelTime} drive
                </span>
                <span>·</span>
                <span className="flex items-center gap-1">
                  <Navigation className="w-3.5 h-3.5" />
                  {selectedDest.distance} from center
                </span>
              </div>

              <h3 className="font-editorial text-2xl font-semibold text-[#171916] mb-2">
                {selectedDest.name}
              </h3>

              <p className="text-xs sm:text-sm text-[#42403B] leading-relaxed mb-6">
                {selectedDest.description}
              </p>

              <div className="flex gap-3">
                <button
                  onClick={() => setSelectedDest(null)}
                  className="flex-1 py-2 text-xs font-semibold text-[#171916] bg-[#E8C77F] hover:bg-[#D8AD57] rounded-md transition-colors text-center"
                >
                  Close Guide
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Curved Bottom Transition back to Warm Ivory */}
      <div className="relative w-full leading-none z-10 -mb-[1px] mt-6 pointer-events-none">
        <svg
          viewBox="0 0 1440 64"
          fill="none"
          preserveAspectRatio="none"
          className="w-full h-10 sm:h-12 lg:h-14 text-[#FBF7EF]"
        >
          <path
            d="M0,20 C360,60 780,10 1140,40 C1300,52 1380,36 1440,24 L1440,64 L0,64 Z"
            fill="#FBF7EF"
          />
        </svg>
      </div>
    </section>
  );
};
