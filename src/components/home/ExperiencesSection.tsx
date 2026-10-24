import React, { useState } from 'react';
import { Waves, UtensilsCrossed, Flame, Umbrella, Landmark, Sailboat, Sparkles, X } from 'lucide-react';
import { EXPERIENCES } from '../../lib/constants';
import { Experience } from '../../types';

export const ExperiencesSection: React.FC = () => {
  const [activeExp, setActiveExp] = useState<Experience | null>(null);

  const getExperienceIcon = (iconName: string) => {
    switch (iconName) {
      case 'waves':
        return <Waves className="w-5 h-5 text-[#7A5410]" />;
      case 'chef-hat':
        return <UtensilsCrossed className="w-5 h-5 text-[#7A5410]" />;
      case 'flame':
        return <Flame className="w-5 h-5 text-[#7A5410]" />;
      case 'umbrella':
        return <Umbrella className="w-5 h-5 text-[#7A5410]" />;
      case 'landmark':
        return <Landmark className="w-5 h-5 text-[#7A5410]" />;
      case 'sailboat':
        return <Sailboat className="w-5 h-5 text-[#7A5410]" />;
      default:
        return <Sparkles className="w-5 h-5 text-[#7A5410]" />;
    }
  };

  return (
    <section id="experiences" className="relative w-full bg-[#FBF7EF] py-10 sm:py-12 border-t border-[#F0EAE1]">
      <div className="max-w-[1440px] mx-auto px-5 sm:px-8 lg:px-12">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          {/* Left Heading Column */}
          <div className="lg:col-span-4 flex flex-col justify-center">
            <span className="text-[11px] font-semibold tracking-[0.2em] text-[#7A5410] uppercase mb-1">
              Experiences
            </span>
            <h2 className="font-editorial text-2xl sm:text-3xl lg:text-[30px] font-semibold text-[#171916] leading-tight mb-2">
              More Than Just a Stay
            </h2>
            <p className="text-xs sm:text-[13px] text-[#68675F] leading-relaxed max-w-sm">
              From relaxing by the pool to exploring the coastline, make your Alibaug trip truly memorable.
            </p>
          </div>

          {/* Right 6 Circular Experience Badges */}
          <div className="lg:col-span-8">
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-3 sm:gap-4 justify-items-center">
              {EXPERIENCES.map((exp) => (
                <button
                  key={exp.id}
                  onClick={() => setActiveExp(exp)}
                  className="group flex flex-col items-center text-center p-1.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#D8AD57] rounded-lg transition-transform hover:-translate-y-1"
                >
                  {/* Circular Pale Beige Background */}
                  <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-[#F5EEE1] group-hover:bg-[#EFE5D3] border border-[#EBE1CF] flex items-center justify-center transition-colors shadow-xs">
                    {getExperienceIcon(exp.icon)}
                  </div>

                  {/* Label */}
                  <span className="mt-2 text-[12px] sm:text-[11px] font-semibold text-[#171916] leading-tight">
                    {exp.label}
                  </span>

                  {/* Optional Sublabel */}
                  {exp.sublabel && (
                    <span className="text-[8.5px] text-[#6B665D] mt-0.5 font-medium">
                      {exp.sublabel}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Experience Details Modal when clicked */}
      {activeExp && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200"
          role="dialog"
          aria-modal="true"
        >
          <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-2xl border border-[#EAE3D8] relative animate-in zoom-in-95 duration-200">
            <button
              onClick={() => setActiveExp(null)}
              className="absolute top-4 right-4 p-1 text-[#68675F] hover:text-[#171916] rounded"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-full bg-[#F5EEE1] flex items-center justify-center">
                {getExperienceIcon(activeExp.icon)}
              </div>
              <div>
                <h3 className="font-editorial text-xl font-semibold text-[#171916]">
                  {activeExp.label}
                </h3>
                {activeExp.sublabel && (
                  <span className="text-xs text-[#7A5410] font-medium">{activeExp.sublabel}</span>
                )}
              </div>
            </div>

            <p className="text-xs sm:text-sm text-[#42403B] leading-relaxed mb-5">
              {activeExp.description}
            </p>

            <div className="p-3 bg-[#FBF7EF] rounded-lg text-xs text-[#68675F] border border-[#EAE3D8] mb-4">
              <strong>Holiday Alibaug Concierge:</strong> All experiences can be tailored to your group. Simply mention your preferences during booking enquiry or via WhatsApp.
            </div>

            <button
              onClick={() => setActiveExp(null)}
              className="w-full py-2 text-xs font-semibold text-[#171916] bg-[#E8C77F] hover:bg-[#D8AD57] rounded-md transition-colors"
            >
              Got It
            </button>
          </div>
        </div>
      )}
    </section>
  );
};
