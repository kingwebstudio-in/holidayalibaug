import React from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider } from './AuthContext';
import { AdminLayout } from './AdminLayout';
import { LoginPage } from './pages/Login';
import { OverviewPage } from './pages/Overview';
import { BookingsPage } from './pages/Bookings';
import { BookingDetailPage } from './pages/BookingDetail';
import { InvestmentEnquiriesPage, OwnerEnquiriesPage } from './pages/Leads';
import { VillasPage } from './pages/Villas';
import { VillaFormPage } from './pages/VillaForm';
import { TestimonialsPage } from './pages/Testimonials';
import { SettingsPage } from './pages/Settings';
import { MediaPage } from './pages/Media';
import { AccountPage } from './pages/Account';

/** Full-page admin application mounted at /admin/*. Shares nothing with the public layout. */
export default function AdminApp() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="login" element={<LoginPage />} />
        <Route element={<AdminLayout />}>
          <Route index element={<OverviewPage />} />
          <Route path="bookings" element={<BookingsPage />} />
          <Route path="bookings/:id" element={<BookingDetailPage />} />
          <Route path="villas" element={<VillasPage />} />
          <Route path="villas/new" element={<VillaFormPage />} />
          <Route path="villas/:id" element={<VillaFormPage />} />
          <Route path="owner-enquiries" element={<OwnerEnquiriesPage />} />
          <Route path="investment-enquiries" element={<InvestmentEnquiriesPage />} />
          <Route path="testimonials" element={<TestimonialsPage />} />
          <Route path="media" element={<MediaPage />} />
          <Route path="settings" element={<SettingsPage />} />
          <Route path="account" element={<AccountPage />} />
          <Route path="*" element={<Navigate to="/admin" replace />} />
        </Route>
      </Routes>
    </AuthProvider>
  );
}
