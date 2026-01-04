import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import NavigationTracker from '@/lib/NavigationTracker'
import { pagesConfig } from './pages.config'
import { BrowserRouter as Router, Route, Routes, useLocation } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import Gatekeeper from '@/components/auth/Gatekeeper';

const { Pages, Layout, mainPage } = pagesConfig;
const mainPageKey = mainPage ?? Object.keys(Pages)[0];
const MainPage = mainPageKey ? Pages[mainPageKey] : <></>;

const LayoutWrapper = ({ children, currentPageName }) => Layout ?
  <Layout currentPageName={currentPageName}>{children}</Layout>
  : <>{children}</>;

const AuthenticatedApp = () => {
  const { isLoadingAuth, authError, navigateToLogin } = useAuth();
  const location = useLocation();
  const isLoginRoute = location.pathname === '/Login';
  const publicRoutes = new Set([
    '/',
    '/Login',
    // Allow the configured landing page to render without auth.
    mainPageKey ? `/${mainPageKey}` : null,
    // Guest-browsable pages
    '/Home',
    '/Globe',
    '/Events',
    '/Marketplace',
    '/ProductDetail',
  ].filter(Boolean));

  // Show loading spinner while checking app public settings or auth
  if (isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
      </div>
    );
  }

  // Handle authentication errors
  if (authError) {
    if (authError.type === 'auth_required') {
      // Do not force /Login as the first screen; only redirect when the user
      // navigates to a protected route.
      if (!isLoginRoute && !publicRoutes.has(location.pathname)) {
        navigateToLogin();
        return null;
      }
    }
  }

  // Render the main app
  return (
    <Routes>
      <Route path="/" element={
        <LayoutWrapper currentPageName={mainPageKey}>
          <MainPage />
        </LayoutWrapper>
      } />
      {Object.entries(Pages).map(([path, Page]) => (
        <Route
          key={path}
          path={`/${path}`}
          element={
            path === 'Login' ? (
              <Page />
            ) : (
              <LayoutWrapper currentPageName={path}>
                <Page />
              </LayoutWrapper>
            )
          }
        />
      ))}
      <Route path="*" element={<PageNotFound />} />
    </Routes>
  );
};


function App() {

  return (
    <AuthProvider>
      <QueryClientProvider client={queryClientInstance}>
        <Gatekeeper>
          <Router>
            <NavigationTracker />
            <AuthenticatedApp />
          </Router>
        </Gatekeeper>
        <Toaster />
      </QueryClientProvider>
    </AuthProvider>
  )
}

export default App
