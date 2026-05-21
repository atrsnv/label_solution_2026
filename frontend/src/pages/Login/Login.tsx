import React, { type FormEvent, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

import { authService } from '../../services/authService';
import { useAuthStore, type UserRole } from '../../store/authStore';

import './Login.scss';

const Login: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const initialTab = searchParams.get('tab') === 'register' ? 'register' : 'login';

  const [tab, setTab] = useState<'login' | 'register'>(initialTab);

  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [repeatPassword, setRepeatPassword] = useState('');
  const [inviteToken, setInviteToken] = useState(searchParams.get('token') || '');

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const setSession = useAuthStore((state) => state.setSession);

  const handleTabChange = (nextTab: 'login' | 'register') => {
    setTab(nextTab);
    setError(null);

    setSearchParams((prev) => {
      const nextParams = new URLSearchParams(prev);

      nextParams.set('tab', nextTab);

      return nextParams;
    });
  };

  const redirectByRole = (role: UserRole) => {
    if (role === 'ADMIN') {
      navigate('/admin', { replace: true });

      return;
    }

    navigate('/artist', { replace: true });
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    setIsLoading(true);
    setError(null);

    try {
      if (tab === 'register' && password !== repeatPassword) {
        setError('Пароли не совпадают.');
        return;
      }

      const response =
        tab === 'login'
          ? await authService.login({
              email,
              password,
            })
          : await authService.register({
              token: inviteToken,
              name,
              email,
              password,
            });

      setSession(response);
      redirectByRole(response.user.role);
    } catch (requestError: unknown) {
      const apiError = requestError as { response?: { data?: { error?: string } } };
      const message =
        apiError.response?.data?.error ||
        'Не получилось выполнить запрос. Проверь данные и попробуй еще раз.';

      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-box">
        <div className="tabs">
          <button
            type="button"
            className={tab === 'login' ? 'active' : ''}
            onClick={() => handleTabChange('login')}
          >
            Вход
          </button>

          <button
            type="button"
            className={tab === 'register' ? 'active' : ''}
            onClick={() => handleTabChange('register')}
          >
            Регистрация
          </button>
        </div>

        {tab === 'register' && (
          <p className="login-hint">
            Регистрация доступна артистам по приглашению от администратора.
          </p>
        )}

        {tab === 'login' ? (
          <form className="form" onSubmit={handleSubmit}>
            <input
              placeholder="Email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />

            <input
              placeholder="Пароль"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
            />

            {error && <p className="login-error">{error}</p>}

            <button type="submit" disabled={isLoading}>
              {isLoading ? 'Входим...' : 'Войти'}
            </button>
          </form>
        ) : (
          <form className="form" onSubmit={handleSubmit}>
            <input
              placeholder="Инвайт-токен"
              type="text"
              value={inviteToken}
              onChange={(event) => setInviteToken(event.target.value)}
              required
            />

            <input
              placeholder="Email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />

            <input
              placeholder="Имя артиста"
              type="text"
              value={name}
              onChange={(event) => setName(event.target.value)}
              required
            />

            <input
              placeholder="Пароль"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
            />

            <input
              placeholder="Повторите пароль"
              type="password"
              value={repeatPassword}
              onChange={(event) => setRepeatPassword(event.target.value)}
              required
            />

            {error && <p className="login-error">{error}</p>}

            <button type="submit" disabled={isLoading}>
              {isLoading ? 'Регистрируем...' : 'Зарегистрироваться'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};

export default Login;
