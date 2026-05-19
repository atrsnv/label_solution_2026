import { useQuery } from '@tanstack/react-query';

import { adminService } from '../../services/adminService';

import './AdminDatalensDashboard.scss';

const formatMoney = (value: number) =>
  `${value.toLocaleString('ru-RU', {
    maximumFractionDigits: 0,
  })} ₽`;

const formatNumber = (value: number) =>
  value.toLocaleString('ru-RU', {
    maximumFractionDigits: 0,
  });

type BarItem = {
  id: string;
  label: string;
  value: number;
  valueText: string;
};

const Bars = ({ items }: { items: BarItem[] }) => {
  const maxValue = Math.max(...items.map((item) => item.value), 1);

  return (
    <div className="admin-datalens__bars">
      {items.map((item) => (
        <div className="admin-datalens__bar" key={item.id}>
          <div className="admin-datalens__bar-head">
            <span>{item.label}</span>
            <strong>{item.valueText}</strong>
          </div>

          <div className="admin-datalens__bar-track">
            <i style={{ width: `${Math.max((item.value / maxValue) * 100, 5)}%` }} />
          </div>
        </div>
      ))}
    </div>
  );
};

const AdminDatalensDashboard = () => {
  const {
    data,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ['admin-datalens-dashboard'],
    queryFn: adminService.getDatalensDashboard,
    staleTime: 60_000,
  });

  if (isLoading) {
    return (
      <section className="admin-datalens">
        <p className="admin-datalens__message">Загружаем DataLens-данные...</p>
      </section>
    );
  }

  if (isError || !data) {
    return (
      <section className="admin-datalens">
        <p className="admin-datalens__message">
          Не удалось загрузить витрину DataLens. Проверь backend и авторизацию.
        </p>
      </section>
    );
  }

  const maxPeriod = Math.max(...data.byPeriod.map((item) => item.amount), 1);
  const totalDistribution = data.distribution.reduce((sum, item) => sum + item.amount, 0) || 1;
  const sourceLabel = typeof data.source === 'string'
    ? data.source
    : data.source.dashboardTitle || data.source.mode;

  return (
    <section className="admin-datalens">
      <div className="admin-datalens__top">
        <div>
          <p>{sourceLabel}</p>
          <h2>{data.title}</h2>
        </div>

        <span>Нативная ERP-витрина</span>
      </div>

      <div className="admin-datalens__kpis">
        <article>
          <span>Общий оборот</span>
          <strong>{formatMoney(data.summary.totalTurnover)}</strong>
        </article>

        <article>
          <span>Прибыль лейбла</span>
          <strong>{formatMoney(data.summary.labelProfit)}</strong>
        </article>

        <article>
          <span>Выплаты артистам</span>
          <strong>{formatMoney(data.summary.artistPayouts)}</strong>
        </article>

        <article>
          <span>Прослушивания</span>
          <strong>{formatNumber(data.summary.totalStreams)}</strong>
        </article>
      </div>

      <div className="admin-datalens__grid">
        <article className="admin-datalens__panel admin-datalens__panel--wide">
          <h3>Динамика прибыли лейбла</h3>

          <div className="admin-datalens__columns">
            {data.byPeriod.map((item) => (
              <div className="admin-datalens__column" key={item.period}>
                <div>
                  <i style={{ height: `${Math.max((item.amount / maxPeriod) * 100, 8)}%` }} />
                </div>
                <span>{item.period}</span>
                <b>{formatMoney(item.amount)}</b>
              </div>
            ))}
          </div>
        </article>

        <article className="admin-datalens__panel">
          <h3>Распределение дохода</h3>

          <div className="admin-datalens__split">
            {data.distribution.map((item) => (
              <div key={item.name}>
                <span>{item.name}</span>
                <strong>{formatMoney(item.amount)}</strong>
                <i style={{ width: `${(item.amount / totalDistribution) * 100}%` }} />
              </div>
            ))}
          </div>
        </article>

        <article className="admin-datalens__panel">
          <h3>ТОП артистов по доходности</h3>
          <Bars
            items={data.byArtist.slice(0, 6).map((item) => ({
              id: item.artistId,
              label: item.artistName,
              value: item.amount,
              valueText: formatMoney(item.amount),
            }))}
          />
        </article>

        <article className="admin-datalens__panel">
          <h3>ТОП треков по прибыли</h3>
          <Bars
            items={data.byTrack.slice(0, 6).map((item) => ({
              id: item.trackId,
              label: item.trackTitle,
              value: item.amount,
              valueText: formatMoney(item.amount),
            }))}
          />
        </article>

        <article className="admin-datalens__panel">
          <h3>Прослушивания по площадкам</h3>
          <Bars
            items={data.bySource.slice(0, 6).map((item) => ({
              id: item.source,
              label: item.source,
              value: item.streams,
              valueText: formatNumber(item.streams),
            }))}
          />
        </article>

        <article className="admin-datalens__panel">
          <h3>Структура типов доходов</h3>
          <Bars
            items={data.byIncomeType.map((item) => ({
              id: item.incomeType,
              label: item.incomeType,
              value: item.amount,
              valueText: formatMoney(item.amount),
            }))}
          />
        </article>

        <article className="admin-datalens__panel admin-datalens__panel--wide">
          <h3>Проверка автораспределения доходности</h3>

          <div className="admin-datalens__table">
            {data.profitability.slice(0, 6).map((item) => (
              <div className="admin-datalens__table-row" key={item.trackId}>
                <span>{item.trackTitle}</span>
                <b>{formatMoney(item.labelProfit)}</b>
                <small>{item.labelSharePercent}% лейблу</small>
              </div>
            ))}
          </div>
        </article>
      </div>
    </section>
  );
};

export default AdminDatalensDashboard;
