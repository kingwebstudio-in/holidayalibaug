import React from 'react';

interface State { failed: boolean }

/** Last line of defence: an unexpected rendering error shows a friendly page instead of a blank screen. Details stay in the console only. */
export class ErrorBoundary extends React.Component<{ children: React.ReactNode }, State> {
  state: State = { failed: false };
  static getDerivedStateFromError(): State { return { failed: true }; }
  componentDidCatch(error: unknown) { console.error('Unexpected application error:', error); }
  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <main className="min-h-dvh grid place-items-center bg-[#FBF7EF] px-6 text-center" role="alert">
        <div className="max-w-md">
          <p className="font-editorial text-3xl font-semibold text-[#092D28]">Something went wrong</p>
          <p className="mt-3 text-[15px] leading-relaxed text-[#42403B]">We hit an unexpected problem showing this page. Your enquiries are not affected. Please reload the page, or come back in a few minutes.</p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <button type="button" onClick={() => window.location.reload()} className="min-h-[44px] px-5 rounded-md bg-[#092D28] text-white text-sm font-semibold hover:bg-[#123B33]">Reload page</button>
            <a href="/" className="min-h-[44px] inline-flex items-center px-5 rounded-md border border-[#092D28] text-[#092D28] text-sm font-semibold hover:bg-[#F5EFE4]">Go to homepage</a>
          </div>
        </div>
      </main>
    );
  }
}
