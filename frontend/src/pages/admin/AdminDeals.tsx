import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { dealService, type CreateDealPayload } from '../../services/dealService';
import { adminService } from '../../services/adminService';
import BackButton from '../../components/BackButton/BackButton';

import './AdminDeals.scss';

const formatMoney = (v: number) =>
  v.toLocaleString('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' ₽';

const formatDate = (d: string) => new Date(d).toLocaleDateString('ru-RU');

const EMPTY_FORM: CreateDealPayload = {
  artistId: '',
  organization: '',
  totalAmount: 0,
  artistPercent: 50,
  comment: '',
};

const AdminDeals = () => {
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [form, setForm] = useState<CreateDealPayload>(EMPTY_FORM);
  const [formError, setFormError] = useState<string | null>(null);

  const { data: dealsData, isLoading, isError } = useQuery({
    queryKey: ['admin-deals'],
    queryFn: dealService.listDeals,
  });

  const { data: artistsData } = useQuery({
    queryKey: ['admin-artists'],
    queryFn: adminService.getArtists,
  });

  const createMutation = useMutation({
    mutationFn: dealService.createDeal,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-deals'] });
      queryClient.invalidateQueries({ queryKey: ['admin-dashboard-summary'] });
      setIsModalOpen(false);
      setForm(EMPTY_FORM);
      setFormError(null);
    },
    onError: (err: unknown) => {
      const e = err as { response?: { data?: { error?: string } } };
      setFormError(e.response?.data?.error || 'Не удалось провести сделку');
    },
  });

  const artists = (artistsData?.artists ?? []).filter((a) => a.hasAccount !== false);

  const deals = dealsData?.deals ?? [];

  const previewArtistAmount =
    form.totalAmount > 0 && form.artistPercent >= 0
      ? (form.totalAmount * form.artistPercent) / 100
      : null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    if (!form.artistId) { setFormError('Выбери артиста'); return; }
    if (!form.organization.trim()) { setFormError('Укажи организацию'); return; }
    if (!form.totalAmount || form.totalAmount <= 0) { setFormError('Укажи сумму больше 0'); return; }
    createMutation.mutate({
      ...form,
      comment: form.comment?.trim() || undefined,
    });
  };

  const openModal = () => { setForm(EMPTY_FORM); setFormError(null); setIsModalOpen(true); };
  const closeModal = () => { if (createMutation.isPending) return; setIsModalOpen(false); setFormError(null); };

  return (
    <main className="admin-deals">
      <BackButton />
      <section className="admin-deals__panel">
        <div className="admin-deals__top">
          <h1>Доход со сторонних проектов</h1>
          <button type="button" className="admin-deals__create-btn" onClick={openModal}>
            Провести прямую сделку
          </button>
        </div>

        {isLoading && <p className="admin-deals__message">Загружаем сделки...</p>}
        {isError && <p className="admin-deals__message">Не удалось загрузить сделки.</p>}

        {!isLoading && !isError && (
          <div className="admin-deals__table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Дата</th>
                  <th>Организация</th>
                  <th>Артист</th>
                  <th>Сумма сделки</th>
                  <th>% артиста</th>
                  <th>Артисту</th>
                  <th>Лейблу</th>
                  <th>Комментарий</th>
                </tr>
              </thead>
              <tbody>
                {deals.length > 0 ? deals.map((deal) => (
                  <tr key={deal.id}>
                    <td>{formatDate(deal.createdAt)}</td>
                    <td className="admin-deals__org">{deal.organization}</td>
                    <td>{deal.artist?.name ?? '—'}</td>
                    <td className="admin-deals__amount">{formatMoney(deal.totalAmount)}</td>
                    <td>{deal.artistPercent}%</td>
                    <td className="admin-deals__amount admin-deals__amount--artist">{formatMoney(deal.artistAmount)}</td>
                    <td className="admin-deals__amount admin-deals__amount--label">{formatMoney(deal.labelAmount)}</td>
                    <td className="admin-deals__comment">{deal.comment || '—'}</td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan={8} className="admin-deals__empty">Сделок пока нет</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {isModalOpen && (
        <div className="admin-deals__overlay" onMouseDown={closeModal}>
          <form
            className="admin-deals__modal"
            onSubmit={handleSubmit}
            onMouseDown={(e) => e.stopPropagation()}
          >
            <div className="admin-deals__modal-head">
              <h2>Прямая сделка</h2>
              <button type="button" className="admin-deals__modal-close" onClick={closeModal}>×</button>
            </div>

            <label className="admin-deals__field">
              <span>Артист</span>
              <select
                value={form.artistId}
                onChange={(e) => setForm((f) => ({ ...f, artistId: e.target.value }))}
              >
                <option value="">— выбери артиста —</option>
                {artists.map((a) => (
                  <option key={a.id} value={a.id}>{a.name} ({a.email})</option>
                ))}
              </select>
            </label>

            <label className="admin-deals__field">
              <span>Организация / заказчик</span>
              <input
                type="text"
                placeholder="Студия, игровая компания, фильм..."
                value={form.organization}
                onChange={(e) => setForm((f) => ({ ...f, organization: e.target.value }))}
              />
            </label>

            <label className="admin-deals__field">
              <span>Сумма сделки, ₽</span>
              <input
                type="number"
                min="1"
                step="0.01"
                placeholder="100 000"
                value={form.totalAmount || ''}
                onChange={(e) => setForm((f) => ({ ...f, totalAmount: Number(e.target.value) }))}
              />
            </label>

            <label className="admin-deals__field">
              <span>Процент артиста: <strong>{form.artistPercent}%</strong></span>
              <input
                type="range"
                min="0"
                max="100"
                step="1"
                value={form.artistPercent}
                onChange={(e) => setForm((f) => ({ ...f, artistPercent: Number(e.target.value) }))}
              />
            </label>

            {previewArtistAmount !== null && (
              <div className="admin-deals__preview">
                <span>Артисту: <strong>{formatMoney(previewArtistAmount)}</strong></span>
                <span>Лейблу: <strong>{formatMoney(form.totalAmount - previewArtistAmount)}</strong></span>
              </div>
            )}

            <label className="admin-deals__field">
              <span>Комментарий (необязательно)</span>
              <input
                type="text"
                placeholder="Саундтрек к фильму X"
                value={form.comment ?? ''}
                onChange={(e) => setForm((f) => ({ ...f, comment: e.target.value }))}
              />
            </label>

            {formError && <p className="admin-deals__error">{formError}</p>}

            <div className="admin-deals__modal-actions">
              <button type="button" onClick={closeModal} disabled={createMutation.isPending}>
                Отмена
              </button>
              <button type="submit" className="admin-deals__submit" disabled={createMutation.isPending}>
                {createMutation.isPending ? 'Проводим...' : 'Провести сделку'}
              </button>
            </div>
          </form>
        </div>
      )}
    </main>
  );
};

export default AdminDeals;
