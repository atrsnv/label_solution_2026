import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';

import { dealService } from '../../services/dealService';

import './ArtistDeals.scss';

const formatMoney = (v: number) =>
  v.toLocaleString('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' ₽';

const formatDate = (d: string) => new Date(d).toLocaleDateString('ru-RU');

const ArtistDeals = () => {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['artist-deals'],
    queryFn: dealService.myDeals,
    refetchOnWindowFocus: true,
    staleTime: 0,
  });

  const deals = data?.deals ?? [];

  const totalEarned = deals.reduce((sum, d) => sum + d.artistAmount, 0);

  return (
    <main className="artist-deals">
      <div className="artist-deals__header">
        <h1>Доход со сторонних проектов</h1>
        <Link to="/artist" className="artist-deals__back">← Назад в кабинет</Link>
      </div>

      {isLoading && <p className="artist-deals__message">Загружаем сделки...</p>}
      {isError && <p className="artist-deals__message">Не удалось загрузить сделки.</p>}

      {!isLoading && !isError && (
        <>
          {totalEarned > 0 && (
            <div className="artist-deals__summary">
              <span>Всего получено со сторонних проектов</span>
              <strong>{formatMoney(totalEarned)}</strong>
            </div>
          )}

          <div className="artist-deals__table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Дата</th>
                  <th>Организация</th>
                  <th>Сумма сделки</th>
                  <th>Твой %</th>
                  <th>Твой доход</th>
                  <th>Комментарий</th>
                </tr>
              </thead>
              <tbody>
                {deals.length > 0 ? deals.map((deal) => (
                  <tr key={deal.id}>
                    <td>{formatDate(deal.createdAt)}</td>
                    <td className="artist-deals__org">{deal.organization}</td>
                    <td className="artist-deals__amount">{formatMoney(deal.totalAmount)}</td>
                    <td>{deal.artistPercent}%</td>
                    <td className="artist-deals__amount artist-deals__amount--earned">{formatMoney(deal.artistAmount)}</td>
                    <td className="artist-deals__comment">{deal.comment || '—'}</td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan={6} className="artist-deals__empty">
                      Сторонних сделок пока нет
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      )}
    </main>
  );
};

export default ArtistDeals;
