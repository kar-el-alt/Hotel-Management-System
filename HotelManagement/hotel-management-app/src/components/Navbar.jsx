import { NavLink, Link } from 'react-router-dom';
import { navFor, homePath } from '../utils/permissions';

export default function Navbar({ user, onLogout }) {
  const links = user ? navFor(user.role) : [];

  return (
    <header className={`navbar ${user ? 'navbar--sidebar' : ''}`}>
      <div className="navbar__inner">
        <Link className="brand" to={user ? homePath(user.role) : '/'}>
          <img className="brand__logo" src="/images/heritage-hotel-logo.png" alt="" />
          <span className="brand__name">Heritage Hotel</span>
        </Link>
        <nav aria-label="Main">
          <ul className="navbar__links">
            {!user && (
              <li>
                <NavLink to="/" end className="navbar__link">
                  Rooms
                </NavLink>
              </li>
            )}
            {links.map((link) => (
              <li key={link.page}>
                <NavLink
                  to={link.path}
                  end={link.path === '/'}
                  className={`navbar__link ${link.page === 'dashboard' ? 'navbar__link--dashboard' : ''}`}
                >
                  {link.label}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>
        {user ? (
          <div className="navbar__account">
            <Link to="/profile" className="navbar__who" title="Your profile">
              <strong>{user.name}</strong>
              {user.role}
            </Link>
            <button className="navbar__logout" onClick={onLogout}>
              Log out
            </button>
          </div>
        ) : (
          <div className="navbar__account">
            <Link className="navbar__logout" to="/login">
              Sign in
            </Link>
            <Link className="navbar__cta" to="/register">
              Create account
            </Link>
          </div>
        )}
      </div>
    </header>
  );
}
