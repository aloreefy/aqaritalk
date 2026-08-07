import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import { Route, Switch, Router as WouterRouter, useLocation } from 'wouter';
import { setAuthTokenGetter } from '@workspace/api-client-react';
import { useEffect } from 'react';

// Pages
import Dashboard from './pages/dashboard';
import Login from './pages/login';
import Users from './pages/users';
import UserNew from './pages/user-new';
import UserPreview from './pages/user-preview';
import UserEdit from './pages/user-edit';
import Properties from './pages/properties';
import PropertyNew from './pages/property-new';
import PropertyPreview from './pages/property-preview';
import PropertyEdit from './pages/property-edit';
import Settings from './pages/settings';
import Commission from './pages/commission';
import NotFound from './pages/not-found';
import { Shell } from './components/layout/Shell';

setAuthTokenGetter(() => localStorage.getItem('admin_token'));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

function ProtectedRoute({ component: Component, ...rest }: { component: React.ComponentType, path: string }) {
  const [location, setLocation] = useLocation();
  const token = localStorage.getItem('admin_token');

  useEffect(() => {
    if (!token && location !== '/login') {
      setLocation('/login');
    }
  }, [token, location, setLocation]);

  if (!token) return null;

  return <Route {...rest} component={() => <Shell><Component /></Shell>} />;
}

function Router() {
  const [location] = useLocation();
  const token = localStorage.getItem('admin_token');

  if (token && location === '/login') {
    // If logged in and trying to access login page, redirect to root
    const [, setLocation] = useLocation();
    useEffect(() => setLocation('/'), [setLocation]);
    return null;
  }

  return (
    <Switch>
      <Route path="/login" component={Login} />
      <ProtectedRoute path="/" component={Dashboard} />
      <ProtectedRoute path="/users/new" component={UserNew} />
      <ProtectedRoute path="/users/:id/edit" component={UserEdit} />
      <ProtectedRoute path="/users/:id" component={UserPreview} />
      <ProtectedRoute path="/users" component={Users} />
      <ProtectedRoute path="/properties/new" component={PropertyNew} />
      <ProtectedRoute path="/properties/:id/edit" component={PropertyEdit} />
      <ProtectedRoute path="/properties/:id" component={PropertyPreview} />
      <ProtectedRoute path="/properties" component={Properties} />
      <ProtectedRoute path="/settings" component={Settings} />
      <ProtectedRoute path="/commission" component={Commission} />
      <Route component={() => (token ? <Shell><NotFound /></Shell> : <NotFound />)} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
