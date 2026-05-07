import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { hasUsableAuthState, readStoredAuthState } from '@/lib/storage';
import { GamePage } from '@/pages/GamePage';
import { LoginPage } from '@/pages/LoginPage';

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
  );
};

export default App;
