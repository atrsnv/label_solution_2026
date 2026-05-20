import { Form, Input, Button, App } from 'antd';
import { useMutation } from '@tanstack/react-query';
import { useNavigate, useSearchParams } from 'react-router-dom';
import PublicHeader from '../components/PublicHeader';
import { authApi } from '../services/auth';
import { useAuthStore } from '../context/authStore';

export default function Auth({ mode }) {
  return (
    <div className="landing">
      <PublicHeader />
      <div className="auth-wrap">
        <div className="auth-card">
          <Tabs mode={mode} />
          {mode === 'login' ? <LoginForm /> : <RegisterForm />}
        </div>
      </div>
    </div>
  );
}

function Tabs({ mode }) {
  const nav = useNavigate();
  return (
    <div className="auth-tabs">
      <button
        className={`auth-tab${mode === 'login' ? ' active' : ''}`}
        onClick={() => nav('/login')}
      >
        Вход
      </button>
      <button
        className={`auth-tab${mode === 'register' ? ' active' : ''}`}
        onClick={() => nav('/register')}
      >
        Регистрация
      </button>
    </div>
  );
}

function LoginForm() {
  const nav = useNavigate();
  const { setSession } = useAuthStore();
  const { message } = App.useApp();

  const mut = useMutation({
    mutationFn: authApi.login,
    onSuccess: (data) => {
      setSession(data);
      message.success(`Добро пожаловать, ${data.user.name}`);
      nav(data.user.role === 'ADMIN' ? '/admin/dashboard' : '/artist/dashboard', { replace: true });
    },
    onError: (e) => message.error(e.response?.data?.error || 'Ошибка входа'),
  });

  // В демо логин по email, но поле подписано как «Имя пользователя»
  const onFinish = (v) => mut.mutate({ email: v.username, password: v.password });

  return (
    <Form layout="vertical" onFinish={onFinish} requiredMark={false}>
      <Form.Item name="username" rules={[{ required: true, message: 'Введите имя пользователя' }]}>
        <Input placeholder="Имя пользователя" autoComplete="username" />
      </Form.Item>
      <Form.Item name="password" rules={[{ required: true, message: 'Введите пароль' }]}>
        <Input.Password placeholder="Пароль" autoComplete="current-password" />
      </Form.Item>
      <div className="auth-submit-wrap">
        <Button htmlType="submit" loading={mut.isPending} className="auth-submit">
          Войти
        </Button>
      </div>
    </Form>
  );
}

function RegisterForm() {
  const nav = useNavigate();
  const [params] = useSearchParams();
  const { setSession } = useAuthStore();
  const { message } = App.useApp();

  const inviteToken = params.get('token');

  const mut = useMutation({
    mutationFn: authApi.register,
    onSuccess: (data) => {
      setSession(data);
      message.success('Аккаунт создан');
      nav('/artist/dashboard', { replace: true });
    },
    onError: (e) => message.error(e.response?.data?.error || 'Ошибка регистрации'),
  });

  const onFinish = (values) => {
    if (values.password !== values.password2) {
      message.error('Пароли не совпадают');
      return;
    }
    if (!inviteToken) {
      message.error('Для регистрации нужен инвайт-токен от админа (?token=… в URL)');
      return;
    }
    // «Имя пользователя» в макете трактуем как email, имя берём как локальную часть
    const email = values.username;
    const name = email.includes('@') ? email.split('@')[0] : email;
    mut.mutate({ token: inviteToken, email, name, password: values.password });
  };

  return (
    <Form layout="vertical" requiredMark={false} onFinish={onFinish}>
      <Form.Item
        name="username"
        rules={[
          { required: true, message: 'Введите имя пользователя' },
          { type: 'email', message: 'Это должно быть email (для входа в систему)' },
        ]}
      >
        <Input placeholder="Имя пользователя" />
      </Form.Item>
      <Form.Item name="password" rules={[{ required: true, min: 6, message: 'Минимум 6 символов' }]}>
        <Input.Password placeholder="Пароль" />
      </Form.Item>
      <Form.Item name="password2" rules={[{ required: true, message: 'Повторите пароль' }]}>
        <Input.Password placeholder="Повторите пароль" />
      </Form.Item>
      <div className="auth-submit-wrap">
        <Button htmlType="submit" loading={mut.isPending} className="auth-submit">
          Зарегистрироваться
        </Button>
      </div>
      {!inviteToken && (
        <div style={{ marginTop: 16, textAlign: 'center', color: 'var(--text-muted)', fontSize: 12 }}>
          Регистрация только по приглашению. Попросите у админа ссылку с токеном.
        </div>
      )}
    </Form>
  );
}
