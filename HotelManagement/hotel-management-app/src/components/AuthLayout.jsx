import { Link } from 'react-router-dom';

// Split-screen layout shared by the sign-in, register and forgot-password pages
export default function AuthLayout({ children }) {
  return (
    <div className="login">
      <aside
        className="login__side"
        style={{
          backgroundImage:
            'linear-gradient(160deg, rgba(25, 64, 86, 0.86), rgba(36, 80, 107, 0.7)), url("/images/heritage-hotel-exterior.png")',
        }}
      >
        <Link to="/" className="login__brand">
          <img className="brand__logo" src="/images/heritage-hotel-logo.png" alt="" />
          <span>Heritage Hotel</span>
        </Link>
        <p className="login__tagline">Rest well. Stay with history.</p>
      </aside>
      <main className="login__main">{children}</main>
    </div>
  );
}
