import { ReactNode, Suspense } from 'react';
import { useLocation } from 'react-router-dom';
import { Box, CircularProgress } from '@mui/material';
import Sidebar from './Sidebar';
import { getAuthTokenFromStorage } from '../services/authService';

interface LayoutProps {
  children: ReactNode;
}

// Shown while a lazily-loaded route chunk is being fetched
const PageFallback = () => (
  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', width: '100%', bgcolor: '#000' }}>
    <CircularProgress sx={{ color: '#f97316' }} />
  </Box>
);

const Layout = ({ children }: LayoutProps) => {
  const location = useLocation();

  const hideNavbarRoutes = ['/login', '/unauthorized', '/*'];
  const showSidebar = !!getAuthTokenFromStorage() && !hideNavbarRoutes.includes(location.pathname);

  if (!showSidebar) {
    return <Suspense fallback={<PageFallback />}>{children}</Suspense>;
  }

  return (
    <Box sx={{ display: 'flex', height: '100vh' }}>
      <Sidebar />
      <Box component="main" sx={{ flex: 1, overflow: 'auto' }}>
        <Suspense fallback={<PageFallback />}>{children}</Suspense>
      </Box>
    </Box>
  );
};

export default Layout;
