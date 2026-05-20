import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { adminService } from '../../services/adminService';
import type { AdminPayout } from '../../services/adminService';

import './AdminPayouts.scss';
import BackButton from '../../components/BackButton/BackButton';

const STATUS_LABELS = { REQUESTED: 'Ожидает', APPROVED: 'Одобрено', REJECTED: 'Отклонено' } as const;
const STATUS_CLASS  = { REQUESTED: 'pending', APPROVED: 'approved', REJECTED: 'rejected' } as const;

const formatMoney = (v: number) =>
  `${v.toLocaleString('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ₽`;

const formatDate = (d: string) => new Date(d).toLocaleDateString('ru-RU');

type ActionState = { id: string; status: 'APPROVED' | 'REJECTED'; comment: string } | null;

const AdminPayouts = () => {
  const queryClient = useQueryClient();
  const [action, setAction] = useState<ActionState>(null);

  const { data, isLoading, isError } = useQuery({
    queryKey: ['admin-payouts'],
    queryFn: adminService.getPayouts,
  });

  const resolveMutation = useMutation({
    mutationFn: ({ id, status, comment }: { id: string; status: 'APPROVED' | 'REJECTED'; comment: string }) =>
      adminService.resolvePayout(id, status, comment),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-payouts'] });
      queryClient.invalidateQueries({ queryKey: ['admin-dashboard-summary'] });
      setAction(null);
    },
  });

  const payouts = data?.payouts ?? [];
  const pending = payouts.filter((p) => p.status === 'REQUESTED');
  const done    = payouts.filter((p) => p.status !== 'REQUESTED');

  const renderRequisites = (details: AdminPayout['details']) => {
    if (!details) return '—';
    if (details.type === 'bank') {
      return (
        <span className="admin-payouts__requisites">
          <span>{details.fullName}</span>
          <span>{details.bank} · БИК {details.bik}</span>
          <span>р/с {details.account}</span>
        </span>
      );
    }
    return (
      <span className="admin-payouts__requisites">
        <span>{details.fullName}</span>
        <span>СБП · {details.phone}</span>
      </span>
    );
  };

  if (isLoading) return <main className="admin-payouts"><p className="admin-payouts__msg">Загружаем...</p></main>;
  if (isError)   return <main className="admin-payouts"><p className="admin-payouts__msg">Ошибка загрузки</p></main>;

  return (
    <main className="admin-payouts">
      <BackButton />
      <h1>Заявки на вывод</h1>

      {pending.length === 0 && done.length === 0 && (
        <p className="admin-payouts__msg">Заявок пока нет</p>
      )}

      {pending.length > 0 && (
        <section className="admin-payouts__section">
          <h2>Ожидают обработки · {pending.length}</h2>
          <div className="admin-payouts__table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Дата</th>
                  <th>Артист</th>
                  <th>Сумма</th>
                  <th>Реквизиты</th>
                  <th>Действие</th>
                </tr>
              </thead>
              <tbody>
                {pending.map((p) => (
                  <tr key={p.id}>
                    <td>{formatDate(p.createdAt)}</td>
                    <td>
                      <span className="admin-payouts__artist">{p.user.name}</span>
                      <span className="admin-payouts__email">{p.user.email}</span>
                    </td>
                    <td className="admin-payouts__amount">{formatMoney(p.amount)}</td>
                    <td>{renderRequisites(p.details)}</td>
                    <td>
                      <div className="admin-payouts__actions">
                        <button
                          type="button"
                          className="admin-payouts__btn admin-payouts__btn--approve"
                          onClick={() => setAction({ id: p.id, status: 'APPROVED', comment: '' })}
                        >
                          Одобрить
                        </button>
                        <button
                          type="button"
                          className="admin-payouts__btn admin-payouts__btn--reject"
                          onClick={() => setAction({ id: p.id, status: 'REJECTED', comment: '' })}
                        >
                          Отклонить
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {done.length > 0 && (
        <section className="admin-payouts__section">
          <h2>Обработанные</h2>
          <div className="admin-payouts__table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Дата</th>
                  <th>Артист</th>
                  <th>Сумма</th>
                  <th>Реквизиты</th>
                  <th>Статус</th>
                  <th>Комментарий</th>
                </tr>
              </thead>
              <tbody>
                {done.map((p) => (
                  <tr key={p.id}>
                    <td>{formatDate(p.createdAt)}</td>
                    <td>
                      <span className="admin-payouts__artist">{p.user.name}</span>
                      <span className="admin-payouts__email">{p.user.email}</span>
                    </td>
                    <td className="admin-payouts__amount">{formatMoney(p.amount)}</td>
                    <td>{renderRequisites(p.details)}</td>
                    <td>
                      <span className={`admin-payouts__status admin-payouts__status--${STATUS_CLASS[p.status]}`}>
                        {STATUS_LABELS[p.status]}
                      </span>
                    </td>
                    <td>{p.comment || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* Confirm modal */}
      {action && (
        <div className="admin-payouts__overlay" onMouseDown={() => !resolveMutation.isPending && setAction(null)}>
          <div className="admin-payouts__modal" onMouseDown={(e) => e.stopPropagation()}>
            <h2>{action.status === 'APPROVED' ? 'Одобрить заявку?' : 'Отклонить заявку?'}</h2>
            <label className="admin-payouts__modal-field">
              <span>Комментарий {action.status === 'REJECTED' ? '(обязателен)' : '(необязателен)'}</span>
              <textarea
                rows={3}
                placeholder={action.status === 'REJECTED' ? 'Причина отказа...' : 'Примечание...'}
                value={action.comment}
                onChange={(e) => setAction((a) => a && ({ ...a, comment: e.target.value }))}
              />
            </label>
            {resolveMutation.isError && (
              <p className="admin-payouts__modal-error">Не удалось обработать заявку. Попробуй ещё раз.</p>
            )}
            <div className="admin-payouts__modal-actions">
              <button
                type="button"
                onClick={() => setAction(null)}
                disabled={resolveMutation.isPending}
              >
                Отмена
              </button>
              <button
                type="button"
                className={action.status === 'APPROVED' ? 'admin-payouts__btn--approve' : 'admin-payouts__btn--reject'}
                disabled={resolveMutation.isPending || (action.status === 'REJECTED' && !action.comment.trim())}
                onClick={() => resolveMutation.mutate(action)}
              >
                {resolveMutation.isPending ? 'Сохраняем...' : action.status === 'APPROVED' ? 'Одобрить' : 'Отклонить'}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
};

export default AdminPayouts;
