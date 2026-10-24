import React, { useState } from 'react';
import { Heart, Waves, Sun, Home, Trees, Users, Sparkles, MapPin, ArrowRight, BedDouble, Bath, Utensils, Wifi, Car, Wind, Tv, Flame, Dog, Music, FlaskConical } from 'lucide-react';
import { Villa } from '../../types';
import { SafeImage } from '../common/SafeImage';

interface VillaCardProps {
  villa: Villa;
  onViewDetails: (villa: Villa) => void;
  onBookNow: (villa: Villa) => void;
}

const ICONS: Record<string, React.ElementType> = { waves: Waves, sun: Sun, home: Home, tree: Trees, users: Users, sparkles: Sparkles, sofa: Sparkles, 'map-pin': MapPin, utensils: Utensils, wifi: Wifi, car: Car, wind: Wind, tv: Tv, flame: Flame, dog: Dog, music: Music };
export const AmenityIcon: React.FC<{ name: string; className?: string }> = ({ name, className = 'w-3.5 h-3.5 text-[#B58B35] shrink-0' }) => {
  const I = ICONS[name] ?? Sparkles;
  return <I className={className} />;
};

export const VillaCard: React.FC<VillaCardProps> = ({ villa, onViewDetails, onBookNow }) => {
  const [isLiked, setIsLiked] = useState(false);
  const preview = villa.amenities.slice(0, 3);
  const more = villa.amenities.length - preview.length;

  return (
    <article className="group bg-white rounded-[10px] border border-[#EAE3D8] overflow-hidden shadow-sm hover:shadow-md transition-all duration-300 flex flex-col">
      <div className="relative aspect-[1.38/1] w-full overflow-hidden bg-[#F5EFE4]">
        <SafeImage src={villa.image} widths={[480, 800]} sizes="(min-width:1280px) 22vw, (min-width:640px) 45vw, 92vw" width={640} height={464} alt={villa.name} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />

        <div className="absolute top-2.5 left-2.5 z-10 flex flex-col items-start gap-1">
          {villa.badge && <span className="px-2 py-0.5 text-[11px] font-semibold tracking-wider text-[#171916] bg-[#E8C77F] rounded-full shadow-sm">{villa.badge}</span>}
          {villa.isDemo && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-semibold tracking-wide text-white bg-[#171916]/80 rounded-full">
              <FlaskConical className="w-2.5 h-2.5 text-[#E8C77F]" />Sample listing
            </span>
          )}
        </div>

        <button
          onClick={(e) => { e.stopPropagation(); setIsLiked(!isLiked); }}
          className="absolute top-2.5 right-2.5 z-10 w-6 h-6 rounded-full bg-white/90 hover:bg-white flex items-center justify-center shadow-sm transition-transform active:scale-90 focus:outline-none"
          aria-label={isLiked ? `Remove ${villa.name} from favourites` : `Save ${villa.name} to favourites`}
          aria-pressed={isLiked}
        >
          <Heart className={`w-3.5 h-3.5 transition-colors ${isLiked ? 'fill-red-500 text-red-500' : 'text-[#68675F] hover:text-red-500'}`} />
        </button>
      </div>

      <div className="p-3 sm:p-3.5 flex-1 flex flex-col justify-between">
        <div>
          <p className="text-[11px] font-semibold tracking-[0.12em] uppercase text-[#7A5410]">{villa.propertyType}</p>
          <h3 className="font-editorial text-[17px] sm:text-[18px] font-semibold text-[#171916] leading-snug mt-0.5">{villa.name}</h3>
          {villa.location && (
            <p className="flex items-center gap-1 text-[12px] text-[#68675F] mt-0.5"><MapPin className="w-3 h-3 text-[#B58B35] shrink-0" /><span className="truncate">{villa.location}</span></p>
          )}

          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-2 text-[12px] font-medium text-[#42403B]">
            <span className="inline-flex items-center gap-1"><BedDouble className="w-3.5 h-3.5 text-[#645F56]" />{villa.bedrooms} bed</span>
            {villa.bathrooms > 0 && <span className="inline-flex items-center gap-1"><Bath className="w-3.5 h-3.5 text-[#645F56]" />{villa.bathrooms} bath</span>}
            <span className="inline-flex items-center gap-1"><Users className="w-3.5 h-3.5 text-[#645F56]" />Up to {villa.maxGuests}</span>
          </div>

          {preview.length > 0 && (
            <ul className="mt-2.5 space-y-1.5 pt-2 border-t border-[#F0EAE1]">
              {preview.map((a, i) => (
                <li key={i} className="flex items-center gap-2 text-[12px] text-[#42403B]"><AmenityIcon name={a.icon} /><span className="truncate">{a.label}</span></li>
              ))}
              {more > 0 && <li className="text-[11px] text-[#6B665D] pl-[22px]">+{more} more</li>}
            </ul>
          )}
        </div>

        <div className="mt-3 pt-2.5 border-t border-[#F0EAE1]">
          <div className="flex items-baseline justify-between mb-2">
            {villa.displayPrice ? (
              <span className="text-[12px] font-bold text-[#092D28]">
                <span className="text-[11px] font-medium text-[#645F56] mr-1">{villa.isDemo ? 'Sample from' : 'From'}</span>{villa.displayPrice}
              </span>
            ) : (
              <span className="text-[11px] font-semibold text-[#92621C]">Price on enquiry</span>
            )}
          </div>
          <div className="grid grid-cols-2 gap-1.5">
            <button onClick={() => onViewDetails(villa)} className="py-1.5 px-2 text-[12px] font-semibold text-[#092D28] bg-[#FBF7EF] hover:bg-[#F5EFE4] border border-[#EAE3D8] rounded-[5px] transition-colors flex items-center justify-center gap-1">
              <span>View Details</span><ArrowRight className="w-3 h-3" />
            </button>
            <button onClick={() => onBookNow(villa)} className="py-1.5 px-2 text-[12px] font-semibold text-[#171916] bg-[#E8C77F] hover:bg-[#D8AD57] active:scale-[0.99] rounded-[5px] transition-all">
              Enquire
            </button>
          </div>
        </div>
      </div>
    </article>
  );
};
