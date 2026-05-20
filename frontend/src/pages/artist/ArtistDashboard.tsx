import { useState } from 'react';
import type { FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';

import { artistService } from '../../services/artistService';
import { useAuthStore } from '../../store/authStore';

import DatalensPanel from '../../components/DatalensPanel/DatalensPanel';

import './ArtistDashboard.scss';

type Stat = {
  title: string;
  value: string;
  variant: 'yellow' | 'green' | 'orange';
  buttonText: string;
  meta?: string;
  path?: string;
  disabled?: boolean;
};

type ArtistInvite = {
  id: string;
  status: 'PENDING' | 'DISPUTED';
};

type ApiError = {
  response?: {
    data?: {
      error?: string;
    };
  };
};

const formatMoney = (value: number) =>
  `${value.toLocaleString('ru-RU', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} ₽`;

const formatNumber = (value: number) =>
  value.toLocaleString('ru-RU', {
    maximumFractionDigits: 0,
  });

const formatDate = (date: string) => {
  return new Date(date).toLocaleDateString('ru-RU');
};

const ArtistDashboard = () => {
  const queryClient = useQueryClient();
  const user = useAuthStore((state) => state.user);

  const [isWithdrawModalOpen, setIsWithdrawModalOpen] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [withdrawError, setWithdrawError] = useState<string | null>(null);

  const {
    data: dashboard,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ['artist-dashboard'],
    queryFn: artistService.getDashboard,
  });

  const { data: invitesData } = useQuery({
    queryKey: ['artist-invites'],
    queryFn: artistService.getInvites,
  });

  const invites: ArtistInvite[] = invitesData?.invites ?? [];
  const pendingInvitesCount = invites.filter(
    (invite) => invite.status === 'PENDING',
  ).length;

  const withdrawMutation = useMutation({
    mutationFn: artistService.withdraw,

    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['artist-dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['admin-dashboard-summary'] });

      setIsWithdrawModalOpen(false);
      setWithdrawAmount('');
      setWithdrawError(null);
    },
  });

  const openWithdrawModal = () => {
    setWithdrawError(null);
    setWithdrawAmount('');
    setIsWithdrawModalOpen(true);
  };

  const closeWithdrawModal = () => {
    if (withdrawMutation.isPending) return;

    setIsWithdrawModalOpen(false);
    setWithdrawAmount('');
    setWithdrawError(null);
  };

  const handleWithdrawSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!dashboard) return;

    setWithdrawError(null);

    const amount = Number(withdrawAmount);

    if (Number.isNaN(amount) || amount <= 0) {
      setWithdrawError('Укажи сумму больше 0.');
      return;
    }

    if (amount > dashboard.balance) {
      setWithdrawError('Сумма вывода не может быть больше текущего баланса.');
      return;
    }

    withdrawMutation.mutate(amount, {
      onError: (error: unknown) => {
        const apiError = error as ApiError;
        const message =
          apiError.response?.data?.error ||
          'Не удалось отправить заявку на вывод. Попробуй еще раз.';

        setWithdrawError(message);
      },
    });
  };

  if (isLoading) {
    return (
      <main className="artist-dashboard">
        <section className="artist-dashboard__hero">
          <p className="artist-dashboard__label">Дэшборд артиста</p>

          <h1>Загружаем данные...</h1>
        </section>
      </main>
    );
  }

  if (isError || !dashboard) {
    return (
      <main className="artist-dashboard">
        <section className="artist-dashboard__hero">
          <p className="artist-dashboard__label">Дэшборд артиста</p>

          <h1>Не удалось загрузить данные</h1>

          <p className="artist-dashboard__error">
            Проверь, что backend запущен и ты вошла как артист.
          </p>
        </section>
      </main>
    );
  }

  const invitesButtonText =
    pendingInvitesCount > 0
      ? `Приглашения · ${pendingInvitesCount}`
      : 'Приглашения';
  const welcomeName = dashboard.datalensArtist?.artistName || user?.name || 'Артист';
  const sourceBadge = dashboard.source?.mode === 'datalens-export'
    ? 'DataLens live'
    : 'DataLens linked';

  const artistStats: Stat[] = [
    {
      title: 'Текущий баланс',
      value: formatMoney(dashboard.balance),
      variant: 'yellow',
      buttonText: invitesButtonText,
      meta: 'Доступно к выплате',
      path: '/artist/invites',
    },
    {
      title: 'Всего заработано',
      value: formatMoney(dashboard.totalEarned),
      variant: 'green',
      buttonText: 'Выплаты во внешнем контуре',
      meta: 'По данным DataLens',
      disabled: true,
    },
    {
      title: 'Треков на площадках',
      value: dashboard.tracksCount.toString(),
      variant: 'orange',
      buttonText: 'Мои треки',
      meta: 'Активные релизы',
      path: '/artist/tracks',
    },
    {
      title: 'Стримов из DataLens',
      value: formatNumber(dashboard.totalStreams || 0),
      variant: 'green',
      buttonText: dashboard.datalensArtist?.artistName || 'DataLens',
      meta: 'Текущий артист',
      disabled: true,
    },
  ];

  return (
    <main className="artist-dashboard">
      <section className="artist-dashboard__hero">
        <div>
          <p className="artist-dashboard__label">Дэшборд артиста</p>

          <h1>
            Добро пожаловать,
            <br />
            {welcomeName}!
          </h1>
        </div>

        <span className="artist-dashboard__source">{sourceBadge}</span>
      </section>

      <section className="artist-dashboard__stats">
        {artistStats.map((stat) => (
          <article className="artist-dashboard__card" key={stat.title}>
            <div>
              <p>{stat.title}</p>

              <strong
                className={`artist-dashboard__value artist-dashboard__value--${stat.variant}`}
              >
                {stat.value}
              </strong>

              {stat.meta && <span>{stat.meta}</span>}
            </div>

            {stat.path ? (
              <Link to={stat.path} className="artist-dashboard__button">
                {stat.buttonText}
              </Link>
            ) : (
              <button
                type="button"
                className={
                  !stat.disabled && stat.buttonText === 'Запросить вывод'
                    ? 'artist-dashboard__button artist-dashboard__button--glow'
                    : 'artist-dashboard__button'
                }
                onClick={
                  !stat.disabled && stat.buttonText === 'Запросить вывод'
                    ? openWithdrawModal
                    : undefined
                }
                disabled={stat.disabled || stat.buttonText !== 'Запросить вывод'}
              >
                {stat.buttonText}

                {stat.buttonText === 'Запросить вывод' && <span>›</span>}
              </button>
            )}
          </article>
        ))}
      </section>

      <DatalensPanel
        title="Моя аналитика"
        className="artist-dashboard__datalens"
      />

      <section className="artist-dashboard__history">
        <div className="artist-dashboard__history-top">
          <h2>История транзакций</h2>

          <button
            type="button"
            className="artist-dashboard__deal-button"
            disabled
            title="Функция появится в следующей версии"
          >
            + Сообщить о внешней сделке
          </button>
        </div>

        <table>
          <thead>
            <tr>
              <th>Дата</th>
              <th>Название трека</th>
              <th>Тип дохода</th>
              <th>Источник</th>
              <th>Сумма</th>
            </tr>
          </thead>

          <tbody>
            {dashboard.lastEarnings.length > 0 ? (
              dashboard.lastEarnings.map((earning) => (
                <tr key={earning.id}>
                  <td>{formatDate(earning.createdAt)}</td>
                  <td>{earning.track?.title || 'Без названия'}</td>
                  <td>{earning.period || 'Стриминг'}</td>
                  <td>{earning.source || 'DataLens'}</td>
                  <td>{formatMoney(earning.amount)}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={5} className="artist-dashboard__empty">
                  Пока нет транзакций
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </section>

      {isWithdrawModalOpen && (
        <div
          className="artist-dashboard__modal-overlay"
          onMouseDown={closeWithdrawModal}
        >
          <form
            className="artist-dashboard__modal"
            onSubmit={handleWithdrawSubmit}
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className="artist-dashboard__modal-head">
              <h2>Запросить вывод</h2>

              <button
                type="button"
                className="artist-dashboard__modal-close"
                onClick={closeWithdrawModal}
              >
                ×
              </button>
            </div>

            <p className="artist-dashboard__modal-balance">
              Доступно на балансе:{' '}
              <strong>{formatMoney(dashboard.balance)}</strong>
            </p>

            <label className="artist-dashboard__modal-field">
              <span>Сумма вывода</span>

              <input
                type="number"
                min="1"
                step="0.01"
                placeholder="Например, 1000"
                value={withdrawAmount}
                onChange={(event) => {
                  setWithdrawError(null);
                  setWithdrawAmount(event.target.value);
                }}
                autoFocus
              />
            </label>

            {withdrawError && (
              <p className="artist-dashboard__modal-error">{withdrawError}</p>
            )}

            <div className="artist-dashboard__modal-actions">
              <button
                type="button"
                onClick={closeWithdrawModal}
                disabled={withdrawMutation.isPending}
              >
                Отмена
              </button>

              <button type="submit" disabled={withdrawMutation.isPending}>
                {withdrawMutation.isPending ? 'Отправляем...' : 'Отправить'}
              </button>
            </div>
          </form>
        </div>
      )}
    </main>
  );
};

export default ArtistDashboard;
