import React, { Suspense, lazy } from 'react';
import { Route, Routes, useLocation } from 'react-router-dom';
import { SiteDataProvider } from './context/SiteDataContext';
import PublicSite from './PublicSite';
import { FloatingWhatsApp } from './components/common/FloatingWhatsApp';
import { ErrorBoundary } from './components/common/ErrorBoundary';
import { ConsentProvider } from './components/consent/ConsentProvider';
import { ConsentUI } from './components/consent/ConsentUI';
import { PrivacyPolicyPage } from './pages/PrivacyPolicyPage';
import { TermsPage } from './pages/TermsPage';
import { NotFoundPage } from './pages/NotFoundPage';
import { trackPageView } from './lib/analytics';

// The admin application is code-split so visitors never download it (and it never loads analytics).
const AdminApp = lazy(() => import('./admin/AdminApp'));

const VILLA_PATH = /^\/villas\/([a-z0-9]+(?:-[a-z0-9]+)*)$/;

/** Public pages. Anything not listed here is a real 404 (the server answers unknown URLs with HTTP 404 as well). */
function PublicRoutes() {
  const { pathname } = useLocation();
  React.useEffect(() => { trackPageView(pathname, document.title); }, [pathname]);
  const villa = VILLA_PATH.exec(pathname);
  let page: React.ReactNode;
  if (pathname === '/' || villa) page = <><PublicSite slug={villa?.[1]} /><FloatingWhatsApp /></>;
  else if (pathname === '/privacy-policy') page = <PrivacyPolicyPage />;
  else if (pathname === '/terms-and-conditions') page = <TermsPage />;
  else page = <NotFoundPage />;
  return <>{page}<ConsentUI /></>;
}

export default function App() {
  return (
    <ErrorBoundary>
      <Routes>
        <Route
          path="/admin/*"
          element={
            <Suspense fallback={<div className="min-h-dvh grid place-items-center bg-stone-100 text-sm text-stone-500">Loading admin…</div>}>
              <AdminApp />
            </Suspense>
          }
        />
        <Route path="*" element={<SiteDataProvider><ConsentProvider><PublicRoutes /></ConsentProvider></SiteDataProvider>} />
      </Routes>
    </ErrorBoundary>
  );
}
