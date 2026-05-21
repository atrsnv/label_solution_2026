import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';

import { adminService } from '../../services/adminService';
import { useAuthStore } from '../../store/authStore';

import AdminDatalensDashboard from '../../components/AdminDatalensDashboard/AdminDatalensDashboard';

import './AdminDashboard.scss';

const formatMoney = (value: number) =>
  `${value.toLocaleString('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ₽`;

type StatCard = {
  title: string;
  value: string;
  hint?: string;
  buttonText: string;
  path: string;
  accent?: 'default' | 'yellow' | 'green';
  highlight?: boolean;
};

const AdminDashboard = () => {
  const user = useAuthStore((state) => state.user);

  const {
    data: summary,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ['admin-dashboard-summary'],
    queryFn: adminService.getDashboardSummary,
  });

  if (isLoading) {
    return (
      <main className="admin-dashboard">
        <section className="admin-dashboard__hero">
          <div>
            <p>Панель администратора</p>
            <h1>Загружаем данные…</h1>
          </div>
        </section>
      </main>
    );
  }

  if (isError || !summary) {
    return (
      <main className="admin-dashboard">
        <section className="admin-dashboard__hero">
          <div>
            <p>Панель администратора</p>
            <h1>Не удалось загрузить данные</h1>
          </div>
        </section>
        <p className="admin-dashboard__message">
          Проверь, что backend запущен и ты вошла как администратор.
        </p>
      </main>
    );
  }

  const stats: StatCard[] = [
    {
      title: 'Общая выручка',
      value: formatMoney(summary.totalEarnings),
      hint: 'Все источники дохода лейбла',
      buttonText: 'Финансовый центр',
      path: '/admin/finance',
      accent: 'yellow',
    },
    {
      title: 'Артистов на лейбле',
      value: summary.artistsCount.toString(),
      hint: 'Зарегистрированных аккаунтов',
      buttonText: 'Реестр артистов',
      path: '/admin/artists',
    },
    {
      title: 'Одобренных релизов',
      value: summary.approvedTracks.toString(),
      hint: 'Активные релизы на площадках',
      buttonText: 'Реестр релизов',
      path: '/admin/releases',
      accent: 'green',
    },
    {
      title: 'Ожидают выплат',
      value: formatMoney(summary.pendingPayouts),
      hint: 'Свободный остаток к выплате',
      buttonText: 'Финансовый центр',
      path: '/admin/finance',
    },
    {
      title: 'Заявки на вывод',
      value: summary.pendingPayouts > 0 ? 'Есть заявки' : 'Нет заявок',
      hint: 'Обработка запросов артистов',
      buttonText: 'Перейти к заявкам',
      path: '/admin/payouts',
    },
    {
      title: 'Доход со сторонних проектов',
      value: 'Фильм · игра · реклама',
      hint: 'Прямые сделки с заказчиками',
      buttonText: 'Провести сделку',
      path: '/admin/deals',
      highlight: true,
    },
  ];

  return (
    <main className="admin-dashboard">
      <section className="admin-dashboard__hero">
        <div>
          <p>Панель администратора</p>
          <h1>Добро пожаловать,<br />{user?.name || 'Администратор'}!</h1>
        </div>
        <span className="admin-dashboard__hero-badge">VAULT label</span>
      </section>

      <section className="admin-dashboard__stats">
        {stats.map((stat) => (
          <article
            key={stat.title}
            className={[
              'admin-dashboard__card',
              stat.accent ? `admin-dashboard__card--${stat.accent}` : '',
              stat.highlight ? 'admin-dashboard__card--highlight' : '',
            ].filter(Boolean).join(' ')}
          >
            <div className="admin-dashboard__card-top">
              <p>{stat.title}</p>
              <strong>{stat.value}</strong>
              {stat.hint && <span>{stat.hint}</span>}
            </div>

            <Link to={stat.path} className="admin-dashboard__card-btn">
              {stat.buttonText}
              <i>›</i>
            </Link>
          </article>
        ))}
      </section>

      <AdminDatalensDashboard />
    </main>
  );
};

export default AdminDashboard;
