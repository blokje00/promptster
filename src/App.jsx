import './App.css'
import { Suspense } from 'react';
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import VisualEditAgent from '@/lib/VisualEditAgent'
import NavigationTracker from '@/lib/NavigationTracker'
import { pagesConfig } from './pages.config'
import { getRouteAccess, isRoutablePage } from './routes.config'
import RouteGuard from '@/components/auth/RouteGuard';
import { BrowserRouter as Router, Route, Routes, Outlet, useLocation } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
import { prefetchPage } from '@/components/PrefetchLink';

const { Pages, Layout, mainPage } = pagesConfig;
const mainPageKey = mainPage ?? Object.keys(Pages)[0];
const MainPage = mainPageKey ? Pages[mainPageKey] : <></>;

// Start loading the landing page chunk immediately, in parallel with the
// rest of the entry bundle executing, instead of waiting for React to
// render far enough to hit its lazy() import. prefetchPage() no-ops if
// mainPageKey isn't in the prefetchers map.
prefetchPage(mainPageKey);

// Computed once at module scope - route metadata lives in routes.config.js
const filteredPages = Object.entries(Pages).filter(([path]) => isRoutablePage(path));

// Layout route: mounts Layout (providers, header, etc.) once and keeps it
// mounted across navigations; only the page content in <Outlet /> changes.
// The inner Suspense keeps the Layout visible while lazy page chunks load.
const LayoutRoute = () => {
  const location = useLocation();
  const segment = location.pathname.split('/').filter(Boolean)[0];
  const currentPageName = segment
    ? Object.keys(Pages).find(p => p.toLowerCase() === segment.toLowerCase()) ?? segment
    : mainPageKey;

  const content = (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
      </div>
    }>
      <Outlet />
    </Suspense>
  );

  return Layout ? (
    <Layout currentPageName={currentPageName}>
      {content}
    </Layout>
  ) : (
    content
  );
};

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError, isAuthenticated, navigateToLogin } = useAuth();

  // Show loading spinner while checking app public settings or auth
  if (isLoadingPublicSettings || isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
      </div>
    );
  }

  // Handle authentication errors
  if (authError) {
    if (authError.type === 'user_not_registered') {
      return <UserNotRegisteredError />;
    }
    // For auth_required and other errors: render app normally.
    // Pages that need auth will handle it individually.
  }

  return (
    <Routes>
      <Route element={<LayoutRoute />}>
        <Route path="/" element={
          <RouteGuard access={getRouteAccess(mainPageKey)}>
            <MainPage />
          </RouteGuard>
        } />
        {filteredPages.map(([path, Page]) => (
          <Route key={path} path={`/${path}`} element={
            <RouteGuard access={getRouteAccess(path)}>
              <Page />
            </RouteGuard>
          } />
        ))}
      </Route>
      <Route path="*" element={<PageNotFound />} />
    </Routes>
  );
};


function App() {

  return (
    <QueryClientProvider client={queryClientInstance}>
      <AuthProvider>
        <Router>
          <NavigationTracker />
          <Suspense fallback={
            <div className="fixed inset-0 flex items-center justify-center">
              <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
            </div>
          }>
            <AuthenticatedApp />
          </Suspense>
        </Router>
        <VisualEditAgent />
      </AuthProvider>
    </QueryClientProvider>
  )
}

export default App