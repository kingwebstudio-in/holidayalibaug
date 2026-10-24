import { useEffect } from 'react';

interface Seo { title: string; description?: string; noindex?: boolean; path?: string }

function setMeta(selector: string, attr: 'name' | 'property', key: string, content: string) {
  let el = document.head.querySelector<HTMLMetaElement>(selector);
  if (!el) { el = document.createElement('meta'); el.setAttribute(attr, key); document.head.appendChild(el); }
  el.setAttribute('content', content);
}

/**
 * Keeps <title>, description, robots and canonical in step with client-side navigation. The server already wrote the right
 * tags into the first HTML response (that is what crawlers and link previews read); this keeps tabs, history and
 * in-browser sharing accurate afterwards. The canonical origin is taken from the server-rendered canonical tag, so it is
 * always the configured production domain.
 */
export function useSeo({ title, description, noindex = false, path }: Seo) {
  useEffect(() => {
    document.title = title;
    if (description) {
      setMeta('meta[name="description"]', 'name', 'description', description);
      setMeta('meta[property="og:description"]', 'property', 'og:description', description);
      setMeta('meta[name="twitter:description"]', 'name', 'twitter:description', description);
    }
    setMeta('meta[property="og:title"]', 'property', 'og:title', title);
    setMeta('meta[name="twitter:title"]', 'name', 'twitter:title', title);
    setMeta('meta[name="robots"]', 'name', 'robots', noindex ? 'noindex,nofollow' : 'index,follow');
    const existing = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    if (noindex || path === undefined) existing?.remove();
    else {
      let origin = window.location.origin;
      try { if (existing?.href) origin = new URL(existing.href).origin; } catch { /* keep window origin */ }
      const link = existing ?? Object.assign(document.createElement('link'), { rel: 'canonical' });
      link.href = `${origin}${path}`;
      if (!existing) document.head.appendChild(link);
      setMeta('meta[property="og:url"]', 'property', 'og:url', link.href);
    }
  }, [title, description, noindex, path]);
}
