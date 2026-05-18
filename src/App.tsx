import { Suspense, lazy } from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { FullscreenButton } from '@/components/FullscreenButton';
import { LoadingState } from '@/components/LoadingState';
import { hasUsableAuthState, readStoredAuthState } from '@/lib/storage';
import { LoginPage } from '@/pages/LoginPage';

const GamePage = lazy(() =>
  import('@/pages/GamePage').then((m) => ({ default: m.GamePage })),
);

const RequireAuth = ({ children }: { children: JSX.Element }) => {
  const location = useLocation();
  const authState = readStoredAuthState();

  if (!hasUsableAuthState(authState) || !authState?.selectedStore) {
    return (
      <Navigate
        replace
        state={{ from: `${location.pathname}${location.search}` }}
        to={`/login${location.search}`}
      />
    );
  }

  return children;
};

const RootRedirect = () => {
  const location = useLocation();
  return <Navigate replace to={`/game${location.search}`} />;
};

const App = () => {
  return (
    <>
      <FullscreenButton />
      <Suspense fallback={<LoadingState />}>
        <Routes>
          <Route element={<LoginPage />} path="/login" />
          <Route
            element={
              <RequireAuth>
                <GamePage />
              </RequireAuth>
            }
            path="/game"
          />
          <Route element={<RootRedirect />} path="*" />
        </Routes>
      </Suspense>
    </>
  );
};

export default App;
