/**
 * Responsive image URLs.
 *  - Cloudinary (res.cloudinary.com …/image/upload/…): inserts f_auto,q_auto,w_<n> so visitors get WebP/AVIF at the size they need.
 *    URLs that already carry a transformation, or that are not Cloudinary uploads, are returned unchanged (safe fallback).
 *  - Bundled sample photos (/demo-villas/x.jpg): uses the pre-generated -640 variant for small widths.
 *  - Anything else: unchanged.
 */
const CLOUDINARY = /^(https:\/\/res\.cloudinary\.com\/[^/]+\/image\/upload\/)(.*)$/;

export function sizedImage(url: string, width: number): string {
  if (!url) return url;
  const c = CLOUDINARY.exec(url);
  if (c) {
    const rest = c[2];
    // A first path segment that looks like a transformation (contains "_" and "," or starts with a known key) means one is already applied.
    const hasTransform = /^(?:[a-z]{1,3}_[^/]+)(?:,[a-z]{1,3}_[^/]+)*\//.test(rest) && !/^v\d+\//.test(rest);
    return hasTransform ? url : `${c[1]}f_auto,q_auto,w_${width}/${rest}`;
  }
  if (width <= 640 && /^\/demo-villas\/[a-z-]+\.jpg$/.test(url)) return url.replace(/\.jpg$/, '-640.jpg');
  return url;
}

/** `src` + `srcSet` for an <img>. `widths` are the candidate pixel widths; `src` is the middle one. */
export function responsiveImage(url: string, widths: number[] = [480, 800, 1200]): { src: string; srcSet?: string } {
  if (!url) return { src: url };
  const sized = widths.map((w) => [sizedImage(url, w), w] as const);
  const distinct = new Set(sized.map(([u]) => u));
  if (distinct.size < 2) return { src: sized[sized.length - 1][0] };
  const seen = new Set<string>();
  const srcSet = sized.filter(([u]) => (seen.has(u) ? false : (seen.add(u), true))).map(([u, w]) => `${u} ${w}w`).join(', ');
  return { src: sized[Math.floor(sized.length / 2)][0], srcSet };
}
