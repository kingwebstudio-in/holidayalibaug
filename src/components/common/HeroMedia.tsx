import React, { useEffect, useState } from 'react';
import { HERO_SRCSET, IMAGES } from '../../lib/constants';
import { responsiveImage } from '../../lib/images';
import type { PublicSettings } from '../../types';

const DEFAULT_ALT = 'Luxury coastal villa in Alibaug at sunset with private swimming pool';

const prefersReducedData = () => {
  if (typeof window === 'undefined') return false;
  const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  const saveData = (navigator as any).connection?.saveData === true;
  return !!(reduced || saveData);
};

interface Props {
  image?: PublicSettings['heroImage'];
  video?: PublicSettings['heroVideo'];
  /** Admin preview: show video controls and ignore reduced-motion/save-data so the admin can check the clip. */
  preview?: boolean;
  className?: string;
}

/**
 * Homepage hero background. Falls back gracefully at every level:
 * configured image → bundled default image; video → poster → hero image; no video if the visitor prefers reduced
 * motion / data saving, or if the video fails to load.
 */
export const HeroMedia: React.FC<Props> = ({ image, video, preview = false, className = '' }) => {
  const [imgFailed, setImgFailed] = useState(false);
  const [videoFailed, setVideoFailed] = useState(false);
  const [playing, setPlaying] = useState(false);
  const usingDefault = !(image?.url && !imgFailed);
  const imgUrl = usingDefault ? IMAGES.hero : image!.url;
  const responsive = usingDefault ? { src: IMAGES.hero, srcSet: HERO_SRCSET } : responsiveImage(imgUrl, [768, 1280, 1920]);
  const videoUrl = video?.url;
  useEffect(() => setImgFailed(false), [image?.url]);
  useEffect(() => { setVideoFailed(false); setPlaying(false); }, [videoUrl]);
  const showVideo = !!videoUrl && !videoFailed && (preview || !prefersReducedData());
  const poster = video?.posterUrl || imgUrl;

  return (
    <div className={`absolute inset-0 ${className}`} data-testid="hero-media">
      <img
        src={responsive.src}
        srcSet={responsive.srcSet}
        sizes="100vw"
        width={1376}
        height={768}
        alt={image?.alt || DEFAULT_ALT}
        loading="eager"
        decoding="async"
        className="w-full h-full object-cover object-[70%_center] lg:object-center"
        fetchPriority="high"
        onError={() => { if (image?.url) setImgFailed(true); }}
        data-testid="hero-image"
      />
      {showVideo && (
        <video
          key={videoUrl}
          src={videoUrl}
          poster={poster}
          autoPlay
          muted
          loop
          playsInline
          controls={preview}
          preload="metadata"
          aria-hidden={preview ? undefined : true}
          onPlaying={() => setPlaying(true)}
          onError={() => setVideoFailed(true)}
          className={`absolute inset-0 w-full h-full object-cover object-[70%_center] lg:object-center transition-opacity duration-700 ${playing || preview ? 'opacity-100' : 'opacity-0'}`}
          data-testid="hero-video"
        />
      )}
    </div>
  );
};
