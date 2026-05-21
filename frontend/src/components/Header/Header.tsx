import React from 'react';
import { useNavigate } from 'react-router-dom';

import { useAuthStore } from '../../store/authStore';

import './Header.scss';

const Header: React.FC = () => {
  const navigate = useNavigate();

  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);

  const handleHomeClick = () => {
    navigate('/');
  };

  const handleCabinetClick = () => {
    if (!user) return;
    navigate(user.role === 'ADMIN' ? '/admin' : '/artist');
  };

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <header className="header">
      <div className="header-content">
        <button
          type="button"
          className="logo"
          onClick={handleHomeClick}
        >
          VAULT
        </button>

        <nav className="menu">
          <button
            type="button"
            onClick={handleHomeClick}
          >
            Главная
          </button>

          <button
            type="button"
            onClick={() => navigate('/artists')}
          >
            Артисты
          </button>

          <button
            type="button"
            onClick={() => navigate('/releases')}
          >
            Релизы
          </button>

          <button
            type="button"
            onClick={() => {}}
          >
            Сотрудничество
          </button>
        </nav>

        <div className="auth-buttons">
          {user ? (
            <>
              <button type="button" onClick={handleCabinetClick}>
                {user.role === 'ADMIN' ? 'Кабинет админа' : 'Кабинет артиста'}
              </button>

              <button type="button" onClick={handleLogout}>
                Выйти
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={() => navigate('/login?tab=login')}
              >
                Войти
              </button>

              <button
                type="button"
                onClick={() => navigate('/login?tab=register&role=artist')}
              >
                Регистрация
              </button>
            </>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;
