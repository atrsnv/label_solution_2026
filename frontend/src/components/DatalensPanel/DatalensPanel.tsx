import { useQuery } from '@tanstack/react-query';

import { api } from '../../services/api';
import { useAuthStore } from '../../store/authStore';

import './DatalensPanel.scss';

type DatalensPanelProps = {
  title?: string;
  className?: string;
};

type ChartItem = {
  amount: number;
  artistName?: string;
  trackTitle?: string;
  period?: string;
};

type AdminAnalytics = {
  summary: {
    artistsCount: number;
    tracksCount: number;
    totalEarnings: number;
    pendingPayouts: number;
  };
  byArtist: ChartItem[];
  byTrack: ChartItem[];
  byMonth: ChartItem[];
};

type ArtistAnalytics = {
  title?: string;
  source?: {
    mode: string;
    dashboardTitle?: string;
    entryId?: string | null;
    dataUrlConfigured?: boolean;
    fallbackReason?: string;
    apiStatus?: string;
  };
  summary: {
    balance: number;
    totalEarned: number;
    tracksCount: number;
    labelShare: number;
  };
  byTrack: ChartItem[];
  byMonth: ChartItem[];
};

type AnalyticsData = AdminAnalytics | ArtistAnalytics;

const formatMoney = (value: number) =>
  `${value.toLocaleString('ru-RU', {
    maximumFractionDigits: 0,
  })} ₽`;

const getAnalytics = async (role: string): Promise<AnalyticsData> => {
  const endpoint = role === 'ADMIN' ? '/admin/analytics' : '/artist/analytics';
  const response = await api.get<AnalyticsData>(endpoint);

  return response.data;
};

const getItemLabel = (item: ChartItem) =>
  item.artistName || item.trackTitle || item.period || 'Без названия';

const DatalensPanel = ({
  title = 'Аналитика',
  className = '',
}: DatalensPanelProps) => {
  const user = useAuthStore((state) => state.user);

  const {
    data,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ['native-analytics', user?.id, user?.role],
    queryFn: () => getAnalytics(user?.role || 'ARTIST'),
    enabled: Boolean(user),
    staleTime: 60_000,
  });

  const primaryList = user?.role === 'ADMIN'
    ? (data as AdminAnalytics | undefined)?.byArtist || []
    : (data as ArtistAnalytics | undefined)?.byTrack || [];
  const periodList = data?.byMonth || [];
  const maxPrimary = Math.max(...primaryList.map((item) => item.amount), 1);
  const maxPeriod = Math.max(...periodList.map((item) => item.amount), 1);
  const sourceTitle = user?.role === 'ARTIST'
    ? (data as ArtistAnalytics | undefined)?.source?.dashboardTitle
      || (data as ArtistAnalytics | undefined)?.title
      || 'Панель артиста'
    : 'Лейбл';

  return (
    <section className={`datalens-panel ${className}`.trim()}>
      <div className="datalens-panel__top">
        <h2>{title}</h2>
        <span>{sourceTitle}</span>
      </div>

      {isLoading && (
        <p className="datalens-panel__message">Загружаем аналитику...</p>
      )}

      {isError && (
        <p className="datalens-panel__message">
          Не удалось загрузить аналитику. Проверь backend и авторизацию.
        </p>
      )}

      {!isLoading && !isError && primaryList.length === 0 && periodList.length === 0 && (
        <p className="datalens-panel__message">
          Пока нет начислений для отображения.
        </p>
      )}

      {!isLoading && !isError && (primaryList.length > 0 || periodList.length > 0) && (
        <div className="datalens-panel__grid">
          <article className="datalens-panel__chart">
            <h3>{user?.role === 'ADMIN' ? 'Доход по артистам' : 'Доход по трекам'}</h3>

            <div className="datalens-panel__bars">
              {primaryList.slice(0, 6).map((item) => (
                <div className="datalens-panel__bar" key={getItemLabel(item)}>
                  <div className="datalens-panel__bar-head">
                    <span>{getItemLabel(item)}</span>
                    <strong>{formatMoney(item.amount)}</strong>
                  </div>
                  <div className="datalens-panel__bar-track">
                    <i style={{ width: `${Math.max((item.amount / maxPrimary) * 100, 6)}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </article>

          <article className="datalens-panel__chart">
            <h3>Динамика по периодам</h3>

            <div className="datalens-panel__columns">
              {periodList.slice(0, 8).map((item) => (
                <div className="datalens-panel__column" key={item.period}>
                  <div>
                    <i style={{ height: `${Math.max((item.amount / maxPeriod) * 100, 8)}%` }} />
                  </div>
                  <span>{item.period}</span>
                </div>
              ))}
            </div>
          </article>
        </div>
      )}
    </section>
  );
};

export default DatalensPanel;
