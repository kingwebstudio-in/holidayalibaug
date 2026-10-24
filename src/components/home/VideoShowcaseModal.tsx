import React, { useState } from 'react';
import { X, Play, ArrowRight, Pause, Volume2, VolumeX } from 'lucide-react';
import { useSiteData } from '../../context/SiteDataContext';
import { useModal } from '../../hooks/useModal';
import { Villa } from '../../types';

interface VideoShowcaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectVilla: (villa: Villa) => void;
}

export const VideoShowcaseModal: React.FC<VideoShowcaseModalProps> = (props) =>
  props.isOpen ? <Showcase {...props} /> : null;

const Showcase: React.FC<VideoShowcaseModalProps> = ({ onClose, onSelectVilla }) => {
  const { showcaseVillas: villas } = useSiteData();
  const dialogRef = useModal<HTMLDivElement>(true, onClose);
  const [activeVillaIdx, setActiveVillaIdx] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [isMuted, setIsMuted] = useState(true);

  const currentVilla = villas[Math.min(activeVillaIdx, villas.length - 1)];
  if (!currentVilla) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85" onMouseDown={onClose}>
        <div ref={dialogRef} tabIndex={-1} role="dialog" aria-modal="true" aria-label="Villa showcase" className="bg-[#092D28] text-white rounded-xl p-6 max-w-sm text-center" onMouseDown={(e) => e.stopPropagation()}>
          <p className="text-sm mb-4">No villas are listed yet. Please check back soon.</p>
          <button onClick={onClose} className="px-4 py-2 text-xs font-semibold text-[#171916] bg-[#E8C77F] rounded">Close</button>
        </div>
      </div>
    );
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/85 backdrop-blur-md overscroll-none"
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        ref={dialogRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label="Watch Our Villas Showcase"
        className="relative w-full max-w-4xl bg-[#092D28] text-white rounded-2xl shadow-2xl border border-[#D8AD57]/30 overflow-hidden max-h-[92vh] max-h-[92dvh] flex flex-col focus:outline-none"
      >
        {/* Header Controls */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 z-10 bg-[#062722]">
          <div className="flex items-center gap-3">
            <span className="font-editorial text-xl font-semibold text-white">
              Watch Our Villas — <span className="text-[#E8C77F]">{currentVilla.name}</span>
            </span>
            <span className="px-2 py-0.5 rounded text-[11px] bg-[#E8C77F] text-[#171916] font-semibold">
              Photo Tour
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsMuted(!isMuted)}
              className="p-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white/80 hover:text-white transition-colors"
              aria-label={isMuted ? 'Unmute' : 'Mute'}
            >
              {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white/80 hover:text-white transition-colors"
              aria-label="Close modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain">
        {/* Photo stage */}
        <div className="relative aspect-[16/9] w-full bg-black overflow-hidden flex items-center justify-center">
          <img
            src={currentVilla.image}
            alt={currentVilla.name}
            decoding="async"
            className={`w-full h-full object-cover transition-transform duration-1000 ${
              isPlaying ? 'scale-105' : 'scale-100'
            }`}
          />

          {/* Cinematic Vignette Overlays */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/30 pointer-events-none" />

          {/* Play/Pause Overlay Button */}
          <button
            onClick={() => setIsPlaying(!isPlaying)}
            className="absolute z-10 w-16 h-16 rounded-full bg-white/25 hover:bg-white/40 backdrop-blur-md border border-white/40 flex items-center justify-center text-white shadow-2xl transition-transform hover:scale-110"
            aria-label={isPlaying ? 'Pause video tour' : 'Play video tour'}
          >
            {isPlaying ? (
              <Pause className="w-7 h-7 fill-white" />
            ) : (
              <Play className="w-7 h-7 fill-white ml-1" />
            )}
          </button>

          {/* Lower Cinematic Subtitle Bar */}
          <div className="absolute bottom-6 left-6 right-6 z-10 flex flex-col sm:flex-row items-start sm:items-end justify-between gap-3">
            <div>
              <div className="text-[11px] uppercase tracking-[0.25em] text-[#E8C77F] font-semibold mb-1">
                Alibaug Coastal Retreats
              </div>
              <h3 className="font-editorial text-2xl sm:text-3xl font-semibold text-white">
                {currentVilla.name}
              </h3>
              <p className="text-xs text-white/80 max-w-md mt-1 leading-relaxed">
                {currentVilla.shortDescription}
              </p>
            </div>

            <button
              onClick={() => {
                onClose();
                onSelectVilla(currentVilla);
              }}
              className="px-4 py-2 text-xs font-semibold text-[#171916] bg-[#E8C77F] hover:bg-[#D8AD57] rounded-md flex items-center gap-1.5 shadow-md transition-transform hover:scale-105 shrink-0"
            >
              <span>Explore Villa Details</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Villa Carousel Switcher */}
        <div className="p-4 bg-[#062722] border-t border-white/10 flex items-center justify-between gap-3 overflow-x-auto">
          <div className="text-xs text-white/60 font-medium shrink-0">
            Select Villa Tour:
          </div>

          <div className="flex items-center gap-2.5 overflow-x-auto">
            {villas.map((villa, idx) => (
              <button
                key={villa.id}
                onClick={() => setActiveVillaIdx(idx)}
                className={`flex items-center gap-2 p-1.5 pr-3 rounded-lg border transition-all shrink-0 ${
                  activeVillaIdx === idx
                    ? 'bg-[#123B33] border-[#E8C77F] text-white'
                    : 'bg-white/5 border-white/10 text-white/70 hover:bg-white/10'
                }`}
              >
                <div className="w-10 h-7 rounded overflow-hidden shrink-0">
                  <img src={villa.image} alt={villa.name} loading="lazy" decoding="async" className="w-full h-full object-cover" />
                </div>
                <div className="text-left">
                  <div className="text-[11px] font-semibold leading-tight">{villa.name}</div>
                  <div className="text-[11px] text-[#E8C77F]">{villa.specs}</div>
                </div>
              </button>
            ))}
          </div>
        </div>
        </div>
      </div>
    </div>
  );
};
