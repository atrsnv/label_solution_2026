import { Link, NavLink, useLocation } from 'react-router-dom';
import { useAuthStore } from '../context/authStore';

export default function PublicHeader() {
  const { user } = useAuthStore();
  const loc = useLocation();
  const cabinet = user
    ? user.role === 'ADMIN' ? '/admin/dashboard' : '/artist/dashboard'
    : null;

  const navItem = ({ isActive }) => (isActive ? 'active' : undefined);

  return (
    <header className="public-nav">
      <Link to="/" className="public-brand">VAULT</Link>

      <nav className="public-menu">
        <NavLink to="/" end className={navItem}>Главная</NavLink>
        <NavLink to="/#artists" className={navItem}>Артисты</NavLink>
        <NavLink to="/#releases" className={navItem}>Релизы</NavLink>
        <NavLink to="/#partners" className={navItem}>Сотрудничество</NavLink>
      </nav>

      <div className="public-auth">
        {cabinet ? (
          <Link to={cabinet} className="pill-btn active">В кабинет</Link>
        ) : (
          <>
            <Link
              to="/login"
              className={`pill-btn${loc.pathname === '/login' ? ' active' : ''}`}
            >
              Войти
            </Link>
            <Link
              to="/register"
              className={`pill-btn${loc.pathname === '/register' ? ' active' : ''}`}
            >
              Регистрация
            </Link>
          </>
        )}
      </div>
    </header>
  );
}
