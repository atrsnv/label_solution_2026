import { useState } from 'react';
import type { FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';

import { artistService } from '../../services/artistService';
import type { PayoutDetails } from '../../services/artistService';
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
  onClick?: () => void;
  disabled?: boolean;
};

type ApiError = {
  response?: { data?: { error?: string } };
};

const formatMoney = (value: number) =>
  `${value.toLocaleString('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ₽`;

const formatNumber = (value: number) =>
  value.toLocaleString('ru-RU', { maximumFractionDigits: 0 });

const formatDate = (date: string) => new Date(date).toLocaleDateString('ru-RU');

const PAYOUT_STATUS_LABELS = {
  REQUESTED: 'Ожидает',
  APPROVED: 'Одобрено',
  REJECTED: 'Отклонено',
} as const;

const PAYOUT_STATUS_CLASS = {
  REQUESTED: 'pending',
  APPROVED: 'approved',
  REJECTED: 'rejected',
} as const;

const DEFAULT_BANK = { type: 'bank' as const, fullName: '', bank: '', bik: '', account: '' };
const DEFAULT_SBP  = { type: 'sbp'  as const, fullName: '', phone: '+7' };

const ArtistDashboard = () => {
  const queryClient = useQueryClient();
  const user = useAuthStore((state) => state.user);

  const [isWithdrawModalOpen, setIsWithdrawModalOpen] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [withdrawError, setWithdrawError] = useState<string | null>(null);
  const [detailsType, setDetailsType] = useState<'bank' | 'sbp'>('bank');
  const [bankForm, setBankForm] = useState(DEFAULT_BANK);
  const [sbpForm, setSbpForm] = useState(DEFAULT_SBP);

  const { data: dashboard, isLoading, isError } = useQuery({
    queryKey: ['artist-dashboard'],
    queryFn: artistService.getDashboard,
  });

  const { data: profileData } = useQuery({
    queryKey: ['artist-profile'],
    queryFn: artistService.getProfile,
  });

  const { data: payoutsData } = useQuery({
    queryKey: ['artist-payouts'],
    queryFn: artistService.getPayouts,
  });

  const payouts = payoutsData?.payouts ?? [];

  const withdrawMutation = useMutation({
    mutationFn: artistService.withdraw,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['artist-dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['admin-dashboard-summary'] });
      queryClient.invalidateQueries({ queryKey: ['artist-payouts'] });
      setIsWithdrawModalOpen(false);
      setWithdrawAmount('');
      setWithdrawError(null);
    },
  });

  const openWithdrawModal = () => {
    const saved = profileData?.profile?.payoutDetails;

    if (saved?.type === 'bank') {
      setBankForm({ ...DEFAULT_BANK, ...saved });
      setDetailsType('bank');
    } else if (saved?.type === 'sbp') {
      setSbpForm({ ...DEFAULT_SBP, ...saved });
      setDetailsType('sbp');
    }

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

    const details: PayoutDetails = detailsType === 'bank' ? bankForm : sbpForm;
    withdrawMutation.mutate({ amount, details }, {
      onError: (error: unknown) => {
        const apiError = error as ApiError;
        setWithdrawError(apiError.response?.data?.error || 'Не удалось отправить заявку. Попробуй ещё раз.');
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
          <p className="artist-dashboard__error">Проверь, что backend запущен и ты вошла как артист.</p>
        </section>
      </main>
    );
  }

  const welcomeName = dashboard.datalensArtist?.artistName || user?.name || 'Артист';
  const isUnlinked = dashboard.source?.apiStatus === 'no-link';
  const sourceBadge = isUnlinked
    ? 'DataLens не привязан'
    : dashboard.source?.mode === 'datalens-export' ? 'DataLens live' : 'DataLens linked';

  const artistStats: Stat[] = [
    {
      title: 'Текущий баланс',
      value: formatMoney(dashboard.balance),
      variant: 'yellow',
      buttonText: 'Запросить вывод',
      meta: 'Доступно к выплате',
      onClick: openWithdrawModal,
    },
    {
      title: 'Всего заработано',
      value: formatMoney(dashboard.totalEarned),
      variant: 'green',
      buttonText: 'По данным DataLens',
      meta: 'Сумма всех поступлений',
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
    {
      title: 'Процент лейбла',
      value: `${dashboard.labelShare}%`,
      variant: 'orange',
      buttonText: 'Задано лейблом',
      meta: 'Базовая доля договора',
      disabled: true,
    },
    {
      title: 'Доход со сторонних проектов',
      value: formatMoney(dashboard.dealEarnings ?? 0),
      variant: 'yellow',
      buttonText: 'Мои сделки',
      meta: 'Фильм, игра, реклама',
      path: '/artist/deals',
    },
  ];

  return (
    <main className="artist-dashboard">
      <section className="artist-dashboard__hero">
        <div>
          <p className="artist-dashboard__label">Дэшборд артиста</p>
          <h1>Добро пожаловать,<br />{welcomeName}!</h1>
        </div>
        <span className="artist-dashboard__source">{sourceBadge}</span>
      </section>

      {isUnlinked && (
        <section className="artist-dashboard__alert">
          <strong>Аккаунт пока не привязан к данным DataLens.</strong>
          <span>
            {dashboard.source?.message ||
              'Попроси администратора добавить тебя в DATALENS_ARTIST_ID_MAP, либо проверь, что имя артиста в DataLens совпадает с именем аккаунта.'}
          </span>
        </section>
      )}

      <section className="artist-dashboard__stats">
        {artistStats.map((stat) => (
          <article className="artist-dashboard__card" key={stat.title}>
            <div>
              <p>{stat.title}</p>
              <strong className={`artist-dashboard__value artist-dashboard__value--${stat.variant}`}>
                {stat.value}
              </strong>
              {stat.meta && <span>{stat.meta}</span>}
            </div>

            {stat.path ? (
              <Link to={stat.path} className="artist-dashboard__button">{stat.buttonText}</Link>
            ) : (
              <button
                type="button"
                className={
                  stat.onClick
                    ? 'artist-dashboard__button artist-dashboard__button--glow'
                    : 'artist-dashboard__button'
                }
                onClick={stat.onClick}
                disabled={stat.disabled}
              >
                {stat.buttonText}
                {stat.onClick && <span>›</span>}
              </button>
            )}
          </article>
        ))}
      </section>

      <DatalensPanel title="Моя аналитика" className="artist-dashboard__datalens" />

      {/* Earnings breakdown */}
      <section className="artist-dashboard__history">
        <div className="artist-dashboard__history-top">
          <h2>История поступлений</h2>
        </div>
        <table>
          <thead>
            <tr>
              <th>Дата</th>
              <th>Трек</th>
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
                  <td className="artist-dashboard__source-cell">{earning.source || 'DataLens'}</td>
                  <td className="artist-dashboard__amount">{formatMoney(earning.amount)}</td>
                </tr>
              ))
            ) : (
              <tr><td colSpan={5} className="artist-dashboard__empty">Пока нет поступлений</td></tr>
            )}
          </tbody>
        </table>
      </section>

      {/* Payout requests history */}
      {payouts.length > 0 && (
        <section className="artist-dashboard__history">
          <div className="artist-dashboard__history-top">
            <h2>Заявки на вывод</h2>
          </div>
          <table>
            <thead>
              <tr>
                <th>Дата</th>
                <th>Сумма</th>
                <th>Реквизиты</th>
                <th>Статус</th>
                <th>Комментарий</th>
              </tr>
            </thead>
            <tbody>
              {payouts.map((p) => (
                <tr key={p.id}>
                  <td>{formatDate(p.createdAt)}</td>
                  <td className="artist-dashboard__amount">{formatMoney(p.amount)}</td>
                  <td className="artist-dashboard__requisites">
                    {p.details?.type === 'bank'
                      ? `${p.details.bank} · ${p.details.account.slice(-4).padStart(p.details.account.length, '·')}`
                      : p.details?.type === 'sbp' ? `СБП · ${p.details.phone}` : '—'}
                  </td>
                  <td>
                    <span className={`artist-dashboard__payout-status artist-dashboard__payout-status--${PAYOUT_STATUS_CLASS[p.status]}`}>
                      {PAYOUT_STATUS_LABELS[p.status]}
                    </span>
                  </td>
                  <td>{p.comment || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      {/* Withdraw modal */}
      {isWithdrawModalOpen && (
        <div className="artist-dashboard__modal-overlay" onMouseDown={closeWithdrawModal}>
          <form
            className="artist-dashboard__modal artist-dashboard__modal--wide"
            onSubmit={handleWithdrawSubmit}
            onMouseDown={(e) => e.stopPropagation()}
          >
            <div className="artist-dashboard__modal-head">
              <h2>Запросить вывод</h2>
              <button type="button" className="artist-dashboard__modal-close" onClick={closeWithdrawModal}>×</button>
            </div>

            <p className="artist-dashboard__modal-balance">
              Доступно: <strong>{formatMoney(dashboard.balance)}</strong>
            </p>

            <label className="artist-dashboard__modal-field">
              <span>Сумма вывода, ₽</span>
              <input
                type="number" min="1" step="0.01" placeholder="Например, 5000"
                value={withdrawAmount}
                onChange={(e) => { setWithdrawError(null); setWithdrawAmount(e.target.value); }}
                autoFocus
              />
            </label>

            {/* Requisites type selector */}
            <div className="artist-dashboard__modal-tabs">
              <button
                type="button"
                className={detailsType === 'bank' ? 'active' : ''}
                onClick={() => setDetailsType('bank')}
              >
                Банковский перевод
              </button>
              <button
                type="button"
                className={detailsType === 'sbp' ? 'active' : ''}
                onClick={() => setDetailsType('sbp')}
              >
                СБП
              </button>
            </div>

            {detailsType === 'bank' ? (
              <div className="artist-dashboard__modal-fields">
                <label className="artist-dashboard__modal-field">
                  <span>ФИО получателя</span>
                  <input
                    type="text" placeholder="Иванов Иван Иванович"
                    value={bankForm.fullName}
                    onChange={(e) => setBankForm((f) => ({ ...f, fullName: e.target.value }))}
                  />
                </label>
                <label className="artist-dashboard__modal-field">
                  <span>Название банка</span>
                  <input
                    type="text" placeholder="Сбербанк"
                    value={bankForm.bank}
                    onChange={(e) => setBankForm((f) => ({ ...f, bank: e.target.value }))}
                  />
                </label>
                <div className="artist-dashboard__modal-row">
                  <label className="artist-dashboard__modal-field">
                    <span>БИК</span>
                    <input
                      type="text" placeholder="044525225" maxLength={9}
                      value={bankForm.bik}
                      onChange={(e) => setBankForm((f) => ({ ...f, bik: e.target.value.replace(/\D/g, '') }))}
                    />
                  </label>
                  <label className="artist-dashboard__modal-field">
                    <span>Расчётный счёт</span>
                    <input
                      type="text" placeholder="40817810099910004312" maxLength={20}
                      value={bankForm.account}
                      onChange={(e) => setBankForm((f) => ({ ...f, account: e.target.value.replace(/\D/g, '') }))}
                    />
                  </label>
                </div>
              </div>
            ) : (
              <div className="artist-dashboard__modal-fields">
                <label className="artist-dashboard__modal-field">
                  <span>ФИО получателя</span>
                  <input
                    type="text" placeholder="Иванов Иван Иванович"
                    value={sbpForm.fullName}
                    onChange={(e) => setSbpForm((f) => ({ ...f, fullName: e.target.value }))}
                  />
                </label>
                <label className="artist-dashboard__modal-field">
                  <span>Номер телефона (СБП)</span>
                  <input
                    type="tel" placeholder="+79001234567"
                    value={sbpForm.phone}
                    onChange={(e) => setSbpForm((f) => ({ ...f, phone: e.target.value }))}
                  />
                </label>
              </div>
            )}

            {withdrawError && (
              <p className="artist-dashboard__modal-error">{withdrawError}</p>
            )}

            <div className="artist-dashboard__modal-actions">
              <button type="button" onClick={closeWithdrawModal} disabled={withdrawMutation.isPending}>
                Отмена
              </button>
              <button type="submit" disabled={withdrawMutation.isPending}>
                {withdrawMutation.isPending ? 'Отправляем...' : 'Отправить заявку'}
              </button>
            </div>
          </form>
        </div>
      )}
    </main>
  );
};

export default ArtistDashboard;
