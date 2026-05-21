import { useRef, useState } from 'react';
import type { ChangeEvent, DragEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { adminService } from '../../services/adminService';
import { dealService, type CreateDealPayload } from '../../services/dealService';
import DatalensPanel from '../../components/DatalensPanel/DatalensPanel';
import BackButton from '../../components/BackButton/BackButton';

import './AdminFinanceCenter.scss';

type FinanceReport = {
  id: string;
  filename: string;
  rowsCount: number;
  totalAmount: number | string;
  createdAt: string;
};

type ApiError = {
  response?: { data?: { error?: string } };
};

const formatMoney = (value: number | string | null | undefined) => {
  const numericValue = Number(value || 0);
  return `${numericValue.toLocaleString('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ₽`;
};

const formatDate = (date: string) => new Date(date).toLocaleDateString('ru-RU');

const EMPTY_DEAL: CreateDealPayload = { artistId: '', organization: '', totalAmount: 0, artistPercent: 50, comment: '' };

const AdminFinanceCenter = () => {
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [uploadMessage, setUploadMessage] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const [isDealModalOpen, setIsDealModalOpen] = useState(false);
  const [dealForm, setDealForm] = useState<CreateDealPayload>(EMPTY_DEAL);
  const [dealError, setDealError] = useState<string | null>(null);

  const { data: reportsData, isLoading: isReportsLoading, isError: isReportsError } = useQuery({
    queryKey: ['finance-reports'],
    queryFn: adminService.getReports,
  });

  const { data: artistsData } = useQuery({
    queryKey: ['admin-artists'],
    queryFn: adminService.getArtists,
    enabled: isDealModalOpen,
  });

  const reports: FinanceReport[] = reportsData?.reports ?? [];
  const artists = artistsData?.artists ?? [];

  const importReportMutation = useMutation({
    mutationFn: adminService.importReport,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['finance-reports'] });
      queryClient.invalidateQueries({ queryKey: ['admin-dashboard-summary'] });
      queryClient.invalidateQueries({ queryKey: ['native-analytics'] });
      queryClient.invalidateQueries({ queryKey: ['admin-artists'] });
      queryClient.invalidateQueries({ queryKey: ['artist-dashboard'] });
    },
  });

  const createDealMutation = useMutation({
    mutationFn: dealService.createDeal,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-deals'] });
      queryClient.invalidateQueries({ queryKey: ['admin-dashboard-summary'] });
      setIsDealModalOpen(false);
      setDealForm(EMPTY_DEAL);
      setDealError(null);
    },
    onError: (err: unknown) => {
      const e = err as ApiError;
      setDealError(e.response?.data?.error || 'Не удалось провести сделку');
    },
  });

  const handleFiles = (files: FileList | null) => {
    if (!files) return;
    setUploadMessage(null);
    setUploadError(null);
    setSelectedFiles(Array.from(files));
  };

  const handleInputChange = (event: ChangeEvent<HTMLInputElement>) => handleFiles(event.target.files);

  const handleDrop = (event: DragEvent<HTMLLabelElement>) => {
    event.preventDefault();
    handleFiles(event.dataTransfer.files);
  };

  const handleUploadReports = async () => {
    if (selectedFiles.length === 0) { setUploadError('Сначала выбери файл отчета.'); return; }
    setUploadMessage(null);
    setUploadError(null);
    try {
      let lastResult: { ok?: boolean; rowsCount?: number; totalAmount?: number } = {};
      for (const file of selectedFiles) {
        lastResult = await importReportMutation.mutateAsync(file);
      }
      const suffix = lastResult.totalAmount != null
        ? ` Общая сумма: ${formatMoney(lastResult.totalAmount)}, строк: ${lastResult.rowsCount}.` : '';
      setUploadMessage(selectedFiles.length === 1
        ? `Отчет успешно загружен и обработан.${suffix}`
        : `Отчеты успешно загружены и обработаны: ${selectedFiles.length}.${suffix}`);
      setSelectedFiles([]);
      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch (error: unknown) {
      const apiError = error as ApiError;
      setUploadError(apiError.response?.data?.error || 'Не удалось загрузить отчет. Проверь формат файла и попробуй еще раз.');
    }
  };

  const openDealModal = () => { setDealForm(EMPTY_DEAL); setDealError(null); setIsDealModalOpen(true); };
  const closeDealModal = () => { if (createDealMutation.isPending) return; setIsDealModalOpen(false); setDealError(null); };

  const handleDealSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setDealError(null);
    if (!dealForm.artistId) { setDealError('Выбери артиста'); return; }
    if (!dealForm.organization.trim()) { setDealError('Укажи организацию'); return; }
    if (!dealForm.totalAmount || dealForm.totalAmount <= 0) { setDealError('Укажи сумму больше 0'); return; }
    createDealMutation.mutate({ ...dealForm, comment: dealForm.comment?.trim() || undefined });
  };

  const previewArtistAmount = dealForm.totalAmount > 0
    ? (dealForm.totalAmount * dealForm.artistPercent) / 100 : null;

  return (
    <main className="admin-finance">
      <BackButton />
      <label
        className="admin-finance__upload"
        onDragOver={(event) => event.preventDefault()}
        onDrop={handleDrop}
      >
        <input ref={fileInputRef} type="file" accept=".csv,.xlsx,.xls" multiple onChange={handleInputChange} />
        <span className="admin-finance__upload-icon" />
        <span className="admin-finance__upload-text">Перетащите файлы сюда или нажмите, чтобы загрузить</span>
        <span className="admin-finance__upload-subtext">Поддерживаемые форматы: .csv, .xlsx, .xls</span>
        {selectedFiles.length > 0 && (
          <span className="admin-finance__upload-count">Выбрано файлов: {selectedFiles.length}</span>
        )}
      </label>

      <div className="admin-finance__upload-actions">
        <button
          type="button"
          className="admin-finance__upload-button"
          disabled={selectedFiles.length === 0 || importReportMutation.isPending}
          onClick={handleUploadReports}
        >
          {importReportMutation.isPending ? 'Загружаем...' : 'Отправить отчет'}
        </button>
        {uploadMessage && <p className="admin-finance__upload-message admin-finance__upload-message--success">{uploadMessage}</p>}
        {uploadError && <p className="admin-finance__upload-message admin-finance__upload-message--error">{uploadError}</p>}
      </div>

      <DatalensPanel title="Финансовая аналитика" className="admin-finance__datalens" />

      <section className="admin-finance__panel">
        <div className="admin-finance__top">
          <h1>Финансовые отчеты</h1>
          <button type="button" className="admin-finance__deal-button" onClick={openDealModal}>
            + Провести прямую сделку
          </button>
        </div>

        {isReportsLoading && <p className="admin-finance__message">Загружаем отчеты...</p>}
        {isReportsError && <p className="admin-finance__message">Не удалось загрузить отчеты. Проверь, что backend запущен и ты вошла как администратор.</p>}

        {!isReportsLoading && !isReportsError && (
          <table>
            <thead>
              <tr>
                <th>Файл</th>
                <th>Строк в отчете</th>
                <th>Дата загрузки</th>
                <th>Общая сумма</th>
                <th>Статус</th>
              </tr>
            </thead>
            <tbody>
              {reports.length > 0 ? reports.map((report) => (
                <tr key={report.id}>
                  <td>{report.filename}</td>
                  <td>{report.rowsCount}</td>
                  <td>{formatDate(report.createdAt)}</td>
                  <td>{formatMoney(report.totalAmount)}</td>
                  <td><span className="admin-finance__status admin-finance__status--paid">Обработан</span></td>
                </tr>
              )) : (
                <tr><td colSpan={5} className="admin-finance__empty">Финансовые отчеты пока не загружены</td></tr>
              )}
            </tbody>
          </table>
        )}
      </section>

      {isDealModalOpen && (
        <div className="admin-finance__deal-overlay" onMouseDown={closeDealModal}>
          <form className="admin-finance__deal-modal" onSubmit={handleDealSubmit} onMouseDown={(e) => e.stopPropagation()}>
            <div className="admin-finance__deal-head">
              <h2>Прямая сделка</h2>
              <button type="button" className="admin-finance__deal-close" onClick={closeDealModal}>×</button>
            </div>

            <label className="admin-finance__deal-field">
              <span>Артист</span>
              <select value={dealForm.artistId} onChange={(e) => setDealForm((f) => ({ ...f, artistId: e.target.value }))}>
                <option value="">— выбери артиста —</option>
                {artists.map((a) => <option key={a.id} value={a.id}>{a.name} ({a.email})</option>)}
              </select>
            </label>

            <label className="admin-finance__deal-field">
              <span>Организация / заказчик</span>
              <input
                type="text" placeholder="Студия, игровая компания, фильм..."
                value={dealForm.organization}
                onChange={(e) => setDealForm((f) => ({ ...f, organization: e.target.value }))}
              />
            </label>

            <label className="admin-finance__deal-field">
              <span>Сумма сделки, ₽</span>
              <input
                type="number" min="1" step="0.01" placeholder="100 000"
                value={dealForm.totalAmount || ''}
                onChange={(e) => setDealForm((f) => ({ ...f, totalAmount: Number(e.target.value) }))}
              />
            </label>

            <label className="admin-finance__deal-field">
              <span>Процент артиста: <strong>{dealForm.artistPercent}%</strong></span>
              <input
                type="range" min="0" max="100" step="1"
                value={dealForm.artistPercent}
                onChange={(e) => setDealForm((f) => ({ ...f, artistPercent: Number(e.target.value) }))}
              />
            </label>

            {previewArtistAmount !== null && (
              <div className="admin-finance__deal-preview">
                <span>Артисту: <strong>{formatMoney(previewArtistAmount)}</strong></span>
                <span>Лейблу: <strong>{formatMoney(dealForm.totalAmount - previewArtistAmount)}</strong></span>
              </div>
            )}

            <label className="admin-finance__deal-field">
              <span>Комментарий (необязательно)</span>
              <input
                type="text" placeholder="Саундтрек к фильму X"
                value={dealForm.comment ?? ''}
                onChange={(e) => setDealForm((f) => ({ ...f, comment: e.target.value }))}
              />
            </label>

            {dealError && <p className="admin-finance__deal-error">{dealError}</p>}

            <div className="admin-finance__deal-actions">
              <button type="button" onClick={closeDealModal} disabled={createDealMutation.isPending}>Отмена</button>
              <button type="submit" className="admin-finance__deal-submit" disabled={createDealMutation.isPending}>
                {createDealMutation.isPending ? 'Проводим...' : 'Провести сделку'}
              </button>
            </div>
          </form>
        </div>
      )}
    </main>
  );
};

export default AdminFinanceCenter;
