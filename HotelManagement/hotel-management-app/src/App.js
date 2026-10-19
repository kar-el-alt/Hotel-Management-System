import { useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate, Link, useNavigate } from 'react-router-dom';
import './App.css';
import Navbar from './components/Navbar';
import HomePage from './pages/HomePage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import ProfilePage from './pages/ProfilePage';
import Dashboard from './pages/Dashboard';
import ReservationsPage from './pages/ReservationsPage';
import GuestsPage from './pages/GuestsPage';
import HousekeepingPage from './pages/HousekeepingPage';
import RoomManagementPage from './pages/RoomManagementPage';
import UsersPage from './pages/UsersPage';
import ReportsPage from './pages/ReportsPage';
import { api } from './services/api';
import { readSession, saveSession, clearSession } from './services/session';
import { canAccess, homePath } from './utils/permissions';

function Shell({ user, onLogout, plain, children }) {
  return (
    <div className={`app ${user ? 'app--authenticated' : ''}`}>
      <Navbar user={user} onLogout={onLogout} />
      {plain ? <main>{children}</main> : <main className="page">{children}</main>}
    </div>
  );
}

function NoAccess({ home }) {
  return (
    <div className="panel">
      <h1>You don't have access to this page</h1>
      <p className="muted">Your role can't open it. Ask an admin if you need access.</p>
      <p>
        <Link to={home}>Go back</Link>
      </p>
    </div>
  );
}

function HotelApp() {
  const navigate = useNavigate();
  const [user, setUser] = useState(readSession);

  const login = async (email, password) => {
    const account = await api.login(email, password); // throws if wrong
    saveSession(account);
    setUser(account);
    navigate(homePath(account.role), { replace: true });
  };

  const updateUser = (updated) => {
    saveSession(updated);
    setUser(updated);
  };

  const logout = () => {
    clearSession();
    setUser(null);
    navigate('/', { replace: true });
  };

  // ---------- Signed out: the public home page and the account pages ----------
  if (!user) {
    return (
      <Routes>
        <Route path="/login" element={<LoginPage onLogin={login} />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route
          path="/"
          element={
            <Shell user={null} plain>
              <HomePage user={null} />
            </Shell>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    );
  }

  const home = homePath(user.role);
  // Blocks a page when the role isn't allowed to open it
  const guard = (page, element) => (canAccess(user.role, page) ? element : <NoAccess home={home} />);

  return (
    <Routes>
      <Route
        path="/"
        element={
          <Shell user={user} onLogout={logout} plain>
            <HomePage user={user} />
          </Shell>
        }
      />
      <Route
        path="*"
        element={
          <Shell user={user} onLogout={logout}>
            <Routes>
              <Route path="/login" element={<Navigate to={home} replace />} />
              <Route path="/register" element={<Navigate to={home} replace />} />
              <Route path="/forgot-password" element={<Navigate to={home} replace />} />
              <Route path="/dashboard" element={guard('dashboard', <Dashboard user={user} />)} />
              <Route path="/book" element={guard('book', <BookPage user={user} />)} />
              <Route path="/reservations" element={guard('reservations', <ReservationsPage user={user} mode="all" />)} />
              <Route path="/my-bookings" element={guard('bookings', <ReservationsPage user={user} mode="mine" />)} />
              <Route path="/archive" element={guard('archive', <ReservationsPage user={user} mode="archive" />)} />
              <Route path="/guests" element={guard('guests', <GuestsPage />)} />
              <Route path="/housekeeping" element={guard('housekeeping', <HousekeepingPage />)} />
              <Route path="/manage-rooms" element={guard('manage-rooms', <RoomManagementPage />)} />
              <Route path="/users" element={guard('users', <UsersPage currentUser={user} />)} />
              <Route path="/reports" element={guard('reports', <ReportsPage />)} />
              <Route path="/profile" element={<ProfilePage user={user} onUserChange={updateUser} />} />
              <Route
                path="*"
                element={
                  <div className="panel">
                    <h1>Page not found</h1>
                    <p className="muted">That address does not exist.</p>
                    <p>
                      <Link to={home}>Go back</Link>
                    </p>
                  </div>
                }
              />
            </Routes>
          </Shell>
        }
      />
    </Routes>
  );
}

// The front desk books rooms for walk-in and phone guests from the same room search
function BookPage({ user }) {
  return <HomePage user={user} hero={false} />;
}

export default function App() {
  return (
    <BrowserRouter>
      <HotelApp />
    </BrowserRouter>
  );
}
