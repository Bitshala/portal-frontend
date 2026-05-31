import { StrictMode, lazy, Suspense } from 'react';
import { createRoot } from 'react-dom/client';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';

import { queryClient } from './http/queryClient.ts';
import { ProtectedRoute } from './components/ProtectedRoute.tsx';
import { UserRole } from './types/enums.ts';
import Layout from './components/Layout.tsx';

import '@fontsource/sora';
import 'virtual:uno.css';

// Route components are lazy-loaded so each page ships as its own chunk and is
// fetched on demand, keeping the initial bundle small. Suspense fallback lives in Layout.
const Login = lazy(() => import('./pages/Login.tsx'));
const Home = lazy(() => import('./pages/Home.tsx'));
const TableView = lazy(() => import('./pages/TableView.tsx'));
const CohortSelection = lazy(() => import('./pages/CohortSelection.tsx').then((m) => ({ default: m.CohortSelection })));
const ResultPage = lazy(() => import('./pages/ResultPage.tsx').then((m) => ({ default: m.ResultPage })));
const StudentDetailPage = lazy(() => import('./pages/StudentDetailPage.tsx'));
const WeekSelector = lazy(() => import('./pages/Students/weekSelector.tsx'));
const StudentCohortSelector = lazy(() => import('./pages/Students/studentCohortSelector.tsx'));
const MBInstructions = lazy(() => import('./pages/Students/MBInstructions.tsx'));
const LBTCLInstructions = lazy(() => import('./pages/Students/LBTCLInstructions.tsx'));
const LNInstructions = lazy(() => import('./pages/Students/LNInstructions.tsx'));
const BPDInstructions = lazy(() => import('./pages/Students/BPDInstructions.tsx'));
const PBInstructions = lazy(() => import('./pages/Students/PBInstructions.tsx'));
const GeneralInstructions = lazy(() => import('./pages/Students/GeneralInstructions.tsx'));
const StudentProfileData = lazy(() => import('./components/student/StudentProfileData.tsx'));
const MyError = lazy(() => import('./pages/404error.tsx'));
const MyStudentDashboard = lazy(() => import('./pages/myProfile/myStudentDashboard.tsx'));
const ProfilePage = lazy(() => import('./pages/myProfile/profilePage.tsx'));
const MyCohortInstructions = lazy(() => import('./pages/myProfile/myCohortInstructions.tsx'));
const CohortFeedback = lazy(() => import('./pages/CohortFeedback.tsx'));
const AdminPage = lazy(() => import('./pages/admin/page.tsx'));
const FeedbackAdmin = lazy(() => import('./pages/admin/FeedbackAdmin.tsx'));
const CohortMetrics = lazy(() => import('./pages/CohortMetrics.tsx'));
const GDPresentation = lazy(() => import('./pages/GDPresentation.tsx'));

const router = createBrowserRouter([
  {
    path: '/login',
    element: <Layout><Login /></Layout>,
  },
  {
    path: '/',
    element: <Layout><Home /></Layout>,
  },
  {
    path: '/select',
    element: <Layout><ProtectedRoute><CohortSelection /></ProtectedRoute></Layout>,
  },
  {
    path: '/cohort/:cohortId/week/:weekId',
    element: <Layout><TableView /></Layout>,
  },
  {
    path: '/student/:studentId/:cohortId',
    element: <Layout><StudentDetailPage /></Layout>,
  },
  {
    path: '/results/:id',
    element: <Layout><ResultPage /></Layout>,
  },
  {
    path: '/mb-instructions',
    element: <Layout><MBInstructions /></Layout>,
  },
  {
    path: '/lbtcl-instructions',
    element: <Layout><LBTCLInstructions /></Layout>,
  },
  {
    path: '/ln-instructions',
    element: <Layout><LNInstructions /></Layout>,
  },
  {
    path: '/bpd-instructions',
    element: <Layout><BPDInstructions /></Layout>,
  },
  {
    path: '/pb-instructions',
    element: <Layout><PBInstructions /></Layout>,
  },
  {
    path: '/general-instructions',
    element: <Layout><GeneralInstructions /></Layout>,
  },
  {
    path:'/me',
    element: <Layout><StudentProfileData /></Layout>
  },
    {
      path: '/weekSelector',
      element: <Layout><WeekSelector /></Layout>,
    },
        {
      path: '/cohortSelector',
      element: <Layout><StudentCohortSelector /></Layout>,
    },
    {
      path: '/*',
      element: <Layout><MyError /></Layout>,
    },
      {
      path: '/myDashboard',
      element: <Layout><MyStudentDashboard /></Layout>,
    },
    {
      path: '/:userId/aboutMe',
      element: <Layout><ProfilePage /></Layout>,
    },
    {
      path: '/:cohortId/instructions',
      element: <Layout><MyCohortInstructions /></Layout>,
    },
    {
      path: '/cohortfeedback',
      element: <Layout><CohortFeedback /></Layout>,
    },
    {
      // Full-screen GD presentation — rendered outside Layout (no sidebar), staff only.
      path: '/:cohortId/present/:weekId',
      element: (
        <ProtectedRoute requiredRole={[UserRole.ADMIN, UserRole.TEACHING_ASSISTANT]}>
          <Suspense fallback={<div style={{ minHeight: '100vh', background: '#000' }} />}>
            <GDPresentation />
          </Suspense>
        </ProtectedRoute>
      ),
    },
    {
      path: '/admin',
      element: (
        <Layout>
          <ProtectedRoute requiredRole={[UserRole.ADMIN, UserRole.TEACHING_ASSISTANT]}>
            <AdminPage />
          </ProtectedRoute>
        </Layout>
      ),
    },
    {
      path: '/cohort-metrics',
      element: (
        <Layout>
          <ProtectedRoute requiredRole={[UserRole.ADMIN, UserRole.TEACHING_ASSISTANT]}>
            <CohortMetrics />
          </ProtectedRoute>
        </Layout>
      ),
    },
    {
      path: '/admin/feedback',
      element: (
        <Layout>
          <ProtectedRoute requiredRole={[UserRole.ADMIN, UserRole.TEACHING_ASSISTANT]}>
            <FeedbackAdmin />
          </ProtectedRoute>
        </Layout>
      ),
    },
    {
      path: '/unauthorized',
      element: <Layout><div className="min-h-screen bg-zinc-900 text-zinc-100 flex items-center justify-center">
        <div className="text-center space-y-4">
          <h1 className="text-2xl font-bold text-red-400">Unauthorized</h1>
          <p className="text-zinc-400">You don't have permission to access this resource.</p>
        </div>
      </div></Layout>,
    }
]);



createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  </StrictMode>
);