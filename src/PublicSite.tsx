/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { Suspense, lazy, useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { SiteHeader } from './components/layout/SiteHeader';
import { MobileNavigation } from './components/layout/MobileNavigation';
import { HeroSection } from './components/home/HeroSection';
import { VillaShowcase } from './components/home/VillaShowcase';
import { ExperiencesSection } from './components/home/ExperiencesSection';
import { ExploreAlibaug } from './components/home/ExploreAlibaug';
import { GuestReviews } from './components/home/GuestReviews';
import { VillaOwnerSection } from './components/home/VillaOwnerSection';
import { PropertyInvestmentSection } from './components/home/PropertyInvestmentSection';
import { SiteFooter } from './components/layout/SiteFooter';
// Modals are only needed after a click, so they load on demand (smaller first download).
const VillaDetailModal = lazy(() => import('./components/villas/VillaDetailModal').then((m) => ({ default: m.VillaDetailModal })));
const BookingEnquiryModal = lazy(() => import('./components/booking/BookingEnquiryModal').then((m) => ({ default: m.BookingEnquiryModal })));
const VideoShowcaseModal = lazy(() => import('./components/home/VideoShowcaseModal').then((m) => ({ default: m.VideoShowcaseModal })));
import { ToastContainer, ToastMessage } from './components/ui/Toast';
import { Villa } from './types';
import { fetchVillaBySlug } from './services/publicApi';
import { DemoModeBanner } from './components/common/DemoModeBanner';
import { useSiteData } from './context/SiteDataContext';
import { ApiError } from './services/api';
import { NotFoundPage } from './pages/NotFoundPage';
import { useSeo } from './hooks/useSeo';
import { events } from './lib/analytics';
import { DEFAULT_DESCRIPTION, DEFAULT_TITLE } from './lib/seoDefaults';

export default function PublicSite({ slug }: { slug?: string }) {
  const { settings, status } = useSiteData();
  const navigate = useNavigate();
  const { hash } = useLocation();
  const [villaMissing, setVillaMissing] = useState(false);
  // Navigation & Modals State
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
  const [selectedVilla, setSelectedVilla] = useState<Villa | null>(null);
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);
  const [bookingParams, setBookingParams] = useState<{
    villaId?: string;
    villaName?: string;
    checkIn?: string;
    checkOut?: string;
    adults?: number;
    children?: number;
  }>({});
  const [isVideoModalOpen, setIsVideoModalOpen] = useState(false);

  // Toast Notification System
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const addToast = (title: string, message: string, type: 'success' | 'error' | 'info' = 'success') => {
    const id = Date.now().toString();
    setToasts((prev) => [...prev, { id, title, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 5000);
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  // Handler from Hero Booking Bar
  const handleHeroCheckAvailability = (params: {
    villaId: string;
    villaName: string;
    checkIn: string;
    checkOut: string;
    adults: number;
    children: number;
  }) => {
    setBookingParams(params);
    setIsBookingModalOpen(true);
  };

  // Handler from Villa Card "View Details"
  // Generic "Enquire" action (header, footer, mobile menu): opens the booking enquiry form
  const handleGeneralEnquiry = () => {
    setBookingParams({});
    setIsBookingModalOpen(true);
  };

  // The open villa is mirrored in the URL (/villas/:slug) so it can be shared, bookmarked and indexed.
  const handleViewVillaDetails = (villa: Villa) => {
    setSelectedVilla(villa);
    navigate(`/villas/${villa.slug}`);
  };
  const closeVilla = () => { setSelectedVilla(null); navigate('/'); };

  useEffect(() => {
    if (!slug) { setSelectedVilla(null); setVillaMissing(false); return; }
    if (selectedVilla?.slug === slug) return;
    const ctl = new AbortController();
    setVillaMissing(false);
    fetchVillaBySlug(slug, ctl.signal)
      .then(setSelectedVilla)
      .catch((e) => { if (e instanceof ApiError && e.code === 'aborted') return; if (e instanceof ApiError && e.status === 404) setVillaMissing(true); else addToast('Property unavailable', 'We could not load that property right now. Please try again.', 'error'); });
    return () => ctl.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug]);

  useEffect(() => { if (selectedVilla) events.villaView(selectedVilla.slug, selectedVilla.name); }, [selectedVilla?.slug]);

  // Links such as /#villas (from the legal pages or the 404 page) scroll to their section once the page has rendered.
  useEffect(() => {
    if (!hash || status === 'loading') return;
    let tries = 0;
    const tick = () => { const el = document.getElementById(hash.slice(1)); if (el) el.scrollIntoView(); else if (tries++ < 20) requestAnimationFrame(tick); };
    tick();
  }, [hash, status]);

  useSeo(selectedVilla
    ? { title: selectedVilla.seoTitle || `${selectedVilla.name} — ${selectedVilla.locality || selectedVilla.location} | HolidayAlibag`, description: selectedVilla.seoDescription || selectedVilla.shortDescription || DEFAULT_DESCRIPTION, noindex: selectedVilla.isDemo, path: `/villas/${selectedVilla.slug}` }
    : { title: DEFAULT_TITLE, description: DEFAULT_DESCRIPTION, path: '/' });

  // Footer links only know the slug: fetch the full record, then open it
  const handleViewVillaBySlug = (v: { slug: string }) => navigate(`/villas/${v.slug}`);

  // Handler from Villa Card or Detail "Enquire to Book"
  const handleBookVilla = (villa: Villa) => {
    setBookingParams({
      villaId: villa.id,
      villaName: villa.name,
    });
    setIsBookingModalOpen(true);
  };

  if (villaMissing) return <NotFoundPage what="villa" />;

  return (
    <div className="min-h-screen bg-[#FBF7EF] text-[#171916] flex flex-col font-sans selection:bg-[#D8AD57]/30 selection:text-[#092D28]">
      {/* Site Header */}
      <SiteHeader
        onOpenMobileNav={() => setIsMobileNavOpen(true)}
        onEnquire={handleGeneralEnquiry}
      />

      {/* Main Content Area */}
      <main className="flex-1">
        {/* 1. Cinematic Hero Section */}
        <HeroSection
          onCheckAvailability={handleHeroCheckAvailability}
          onOpenVideoShowcase={() => setIsVideoModalOpen(true)}
        />

        {/* 2. Four Luxury Villa Cards Showcase */}
        <VillaShowcase
          onViewDetails={handleViewVillaDetails}
          onBookNow={handleBookVilla}
        />

        {/* 3. Signature Experiences */}
        <ExperiencesSection />

        {/* 4. Explore Alibaug Panoramic Destination Showcase */}
        <ExploreAlibaug />

        {/* 5. Refined Guest Reviews Testimonials */}
        <GuestReviews />

        {/* 6. Villa Owner Listing Partnership Section */}
        <VillaOwnerSection onShowToast={addToast} />

        {/* 7. Property Investment Enquiry Section */}
        <PropertyInvestmentSection onShowToast={addToast} />
      </main>

      {/* Site Footer */}
      <SiteFooter
        onSelectVilla={handleViewVillaBySlug}
        onEnquire={handleGeneralEnquiry}
      />

      {/* Mobile Navigation Drawer */}
      <MobileNavigation
        isOpen={isMobileNavOpen}
        onClose={() => setIsMobileNavOpen(false)}
        onEnquire={handleGeneralEnquiry}
      />

      {/* Villa Architectural Detail Modal */}
      <Suspense fallback={null}>
      <VillaDetailModal
        villa={selectedVilla}
        onClose={closeVilla}
        onBookEnquiry={handleBookVilla}
        onSelectVilla={handleViewVillaDetails}
      />

      {/* Booking Enquiry Modal */}
      <BookingEnquiryModal
        isOpen={isBookingModalOpen}
        onClose={() => setIsBookingModalOpen(false)}
        initialParams={bookingParams}
        onShowToast={addToast}
      />

      <DemoModeBanner />

      {/* Villa photo showcase modal */}
      <VideoShowcaseModal
        isOpen={isVideoModalOpen}
        onClose={() => setIsVideoModalOpen(false)}
        onSelectVilla={handleViewVillaDetails}
      />

      {/* Toast Notifications */}
      </Suspense>

      <ToastContainer toasts={toasts} onDismiss={removeToast} />
    </div>
  );
}
