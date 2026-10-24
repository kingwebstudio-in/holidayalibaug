import React from 'react';
import { Link } from 'react-router-dom';
import { Compass, Home } from 'lucide-react';
import { StaticPageLayout } from '../components/layout/StaticPageLayout';
import { useSeo } from '../hooks/useSeo';

export const NotFoundPage: React.FC<{ what?: 'page' | 'villa' }> = ({ what = 'page' }) => {
  useSeo({ title: 'Page not found — HolidayAlibag', description: 'The page you are looking for does not exist or has moved.', noindex: true });
  return (
    <StaticPageLayout>
      <section className="max-w-2xl mx-auto px-5 sm:px-8 py-16 sm:py-24 text-center" data-testid="not-found">
        <p className="text-sm font-semibold tracking-[0.2em] uppercase text-[#7A5410]">Error 404</p>
        <h1 className="font-editorial text-4xl sm:text-5xl font-semibold text-[#092D28] mt-3">{what === 'villa' ? 'This villa is not available' : 'We can’t find that page'}</h1>
        <p className="mt-4 text-[16px] leading-relaxed text-[#42403B]">
          {what === 'villa'
            ? 'The villa you are looking for is no longer listed, or the link is incorrect. Browse our current villas instead.'
            : 'The page you are looking for may have moved or never existed. Let’s get you back to the coast.'}
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link to="/" className="min-h-[44px] inline-flex items-center gap-2 px-6 rounded-md bg-[#092D28] text-white text-sm font-semibold hover:bg-[#123B33]"><Home className="w-4 h-4" aria-hidden="true" />Back to homepage</Link>
          <Link to="/#villas" className="min-h-[44px] inline-flex items-center gap-2 px-6 rounded-md bg-[#E8C77F] text-[#171916] text-sm font-semibold hover:bg-[#D8AD57]"><Compass className="w-4 h-4" aria-hidden="true" />Browse villas</Link>
        </div>
      </section>
    </StaticPageLayout>
  );
};
