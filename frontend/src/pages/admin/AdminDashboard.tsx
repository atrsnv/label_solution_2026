import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';

import { adminService } from '../../services/adminService';
import { useAuthStore } from '../../store/authStore';

import AdminDatalensDashboard from '../../components/AdminDatalensDashboard/AdminDatalensDashboard';

import './AdminDashboard.scss';

const formatMoney = (value: number) =>
  `${value.toLocaleString('ru-RU', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} ₽`;

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
          <h1>Загружаем данные...</h1>
        </section>
      </main>
    );
  }

  if (isError || !summary) {
    return (
      <main className="admin-dashboard">
        <section className="admin-dashboard__hero">
          <h1>Не удалось загрузить данные</h1>

          <p className="admin-dashboard__error">
            Проверь, что backend запущен и ты вошла как администратор.
          </p>
        </section>
      </main>
    );
  }

  const adminStats = [
    {
      title: 'Общая выручка',
      value: formatMoney(summary.totalEarnings),
      buttonText: 'Финансовый центр',
      path: '/admin/finance',
    },
    {
      title: 'Артистов на лейбле',
      value: summary.artistsCount.toString(),
      buttonText: 'Реестр артистов',
      path: '/admin/artists',
    },
    {
      title: 'Одобренных релизов',
      value: summary.approvedTracks.toString(),
      buttonText: 'Реестр релизов',
      path: '/admin/releases',
    },
    {
      title: 'Ожидают выплат',
      value: formatMoney(summary.pendingPayouts),
      buttonText: 'Финансовый центр',
      path: '/admin/finance',
    },
    {
      title: 'Заявки на вывод',
      value: String(summary.pendingPayouts > 0 ? '!' : '—'),
      buttonText: 'Обработать заявки',
      path: '/admin/payouts',
    },
  ];

  return (
    <main className="admin-dashboard">
      <section className="admin-dashboard__hero">
        <h1>
          Добро пожаловать,
          <br />
          {user?.name || 'Администратор'}!
        </h1>
      </section>

      <section className="admin-dashboard__stats">
        {adminStats.map((stat) => (
          <div className="admin-dashboard__stat" key={stat.title}>
            <article className="admin-dashboard__card">
              <p>{stat.title}</p>
              <strong>{stat.value}</strong>
            </article>

            <Link to={stat.path} className="admin-dashboard__button">
              {stat.buttonText}
            </Link>
          </div>
        ))}
      </section>

      <AdminDatalensDashboard />

    </main>
  );
};

export default AdminDashboard;
