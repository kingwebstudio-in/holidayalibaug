import React, { useEffect, useState } from 'react';
import { responsiveImage } from '../../lib/images';

const FALLBACK =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(
    `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 400 280'><defs><linearGradient id='g' x1='0' y1='0' x2='1' y2='1'><stop offset='0' stop-color='#F5EFE4'/><stop offset='1' stop-color='#E7DFD0'/></linearGradient></defs><rect width='400' height='280' fill='url(#g)'/><g fill='none' stroke='#B58B35' stroke-width='6' stroke-linecap='round' stroke-linejoin='round' opacity='.7'><path d='M130 150 L200 100 L270 150'/><path d='M145 140 V190 H255 V140'/><path d='M185 190 V160 H215 V190'/></g><text x='200' y='232' text-anchor='middle' font-family='sans-serif' font-size='14' fill='#8C877D'>Image unavailable</text></svg>`,
  );

/** <img> with a loading shimmer and a graceful fallback if the URL fails to load. */
export const SafeImage: React.FC<React.ImgHTMLAttributes<HTMLImageElement> & { widths?: number[] }> = ({ src: rawSrc, widths, alt = '', className = '', onLoad, onError, ...rest }) => {
  const [state, setState] = useState<'loading' | 'ok' | 'failed'>('loading');
  // `widths` asks for resized candidates (Cloudinary f_auto/q_auto, bundled -640 variants); other URLs pass through unchanged.
  const { src, srcSet } = widths && rawSrc ? responsiveImage(rawSrc, widths) : { src: rawSrc, srcSet: undefined };
  useEffect(() => setState('loading'), [rawSrc]);
  const broken = state === 'failed' || !src;
  return (
    <img
      {...rest}
      src={broken ? FALLBACK : src}
      srcSet={broken ? undefined : srcSet}
      alt={alt}
      loading={rest.loading ?? 'lazy'}
      decoding="async"
      // A load event from the fallback placeholder must not clear the 'failed' state (that would retry the broken URL forever).
      onLoad={(e) => { setState((cur) => (cur === 'failed' ? 'failed' : 'ok')); onLoad?.(e); }}
      onError={(e) => { setState('failed'); onError?.(e); }}
      className={`${className} ${state === 'loading' ? 'bg-[#F0EAE1] animate-pulse' : ''}`}
    />
  );
};
