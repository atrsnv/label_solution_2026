import { useRef, useState } from 'react';
import type { ChangeEvent, DragEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { adminService } from '../../services/adminService';
import DatalensPanel from '../../components/DatalensPanel/DatalensPanel';

import './AdminFinanceCenter.scss';
import BackButton from '../../components/BackButton/BackButton';

type FinanceReport = {
  id: string;
  filename: string;
  rowsCount: number;
  totalAmount: number | string;
  createdAt: string;
};

type ApiError = {
  response?: {
    data?: {
      error?: string;
    };
  };
};

const formatMoney = (value: number | string | null | undefined) => {
  const numericValue = Number(value || 0);

  return `${numericValue.toLocaleString('ru-RU', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} ₽`;
};

const formatDate = (date: string) => {
  return new Date(date).toLocaleDateString('ru-RU');
};

const AdminFinanceCenter = () => {
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [uploadMessage, setUploadMessage] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const {
    data: reportsData,
    isLoading: isReportsLoading,
    isError: isReportsError,
  } = useQuery({
    queryKey: ['finance-reports'],
    queryFn: adminService.getReports,
  });

  const reports: FinanceReport[] = reportsData?.reports ?? [];

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

  const handleFiles = (files: FileList | null) => {
    if (!files) return;

    setUploadMessage(null);
    setUploadError(null);
    setSelectedFiles(Array.from(files));
  };

  const handleInputChange = (event: ChangeEvent<HTMLInputElement>) => {
    handleFiles(event.target.files);
  };

  const handleDrop = (event: DragEvent<HTMLLabelElement>) => {
    event.preventDefault();
    handleFiles(event.dataTransfer.files);
  };

  const handleUploadReports = async () => {
    if (selectedFiles.length === 0) {
      setUploadError('Сначала выбери файл отчета.');
      return;
    }

    setUploadMessage(null);
    setUploadError(null);

    try {
      let lastResult: { ok?: boolean; rowsCount?: number; totalAmount?: number } = {};
      for (const file of selectedFiles) {
        lastResult = await importReportMutation.mutateAsync(file);
      }

      const suffix = lastResult.totalAmount != null
        ? ` Общая сумма: ${formatMoney(lastResult.totalAmount)}, строк: ${lastResult.rowsCount}.`
        : '';
      setUploadMessage(
        selectedFiles.length === 1
          ? `Отчет успешно загружен и обработан.${suffix}`
          : `Отчеты успешно загружены и обработаны: ${selectedFiles.length}.${suffix}`,
      );

      setSelectedFiles([]);

      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (error: unknown) {
      const apiError = error as ApiError;
      const message =
        apiError.response?.data?.error ||
        'Не удалось загрузить отчет. Проверь формат файла и попробуй еще раз.';

      setUploadError(message);
    }
  };

  return (
    <main className="admin-finance">
      <BackButton />
      <label
        className="admin-finance__upload"
        onDragOver={(event) => event.preventDefault()}
        onDrop={handleDrop}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv,.xlsx,.xls"
          multiple
          onChange={handleInputChange}
        />

        <span className="admin-finance__upload-icon" />

        <span className="admin-finance__upload-text">
          Перетащите файлы сюда или нажмите, чтобы загрузить
        </span>

        <span className="admin-finance__upload-subtext">
          Поддерживаемые форматы: .csv, .xlsx, .xls
        </span>

        {selectedFiles.length > 0 && (
          <span className="admin-finance__upload-count">
            Выбрано файлов: {selectedFiles.length}
          </span>
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

        {uploadMessage && (
          <p className="admin-finance__upload-message admin-finance__upload-message--success">
            {uploadMessage}
          </p>
        )}

        {uploadError && (
          <p className="admin-finance__upload-message admin-finance__upload-message--error">
            {uploadError}
          </p>
        )}
      </div>

      <DatalensPanel
        title="Финансовая аналитика"
        className="admin-finance__datalens"
      />

      <section className="admin-finance__panel">
        <div className="admin-finance__top">
          <h1>Финансовые отчеты</h1>

          <button
            type="button"
            className="admin-finance__deal-button"
            disabled
            title="Функция появится в следующей версии"
          >
            + Провести прямую сделку
          </button>
        </div>

        {isReportsLoading && (
          <p className="admin-finance__message">Загружаем отчеты...</p>
        )}

        {isReportsError && (
          <p className="admin-finance__message">
            Не удалось загрузить отчеты. Проверь, что backend запущен и ты вошла как администратор.
          </p>
        )}

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
              {reports.length > 0 ? (
                reports.map((report) => (
                  <tr key={report.id}>
                    <td>{report.filename}</td>
                    <td>{report.rowsCount}</td>
                    <td>{formatDate(report.createdAt)}</td>
                    <td>{formatMoney(report.totalAmount)}</td>
                    <td>
                      <span className="admin-finance__status admin-finance__status--paid">
                        Обработан
                      </span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="admin-finance__empty">
                    Финансовые отчеты пока не загружены
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </section>
    </main>
  );
};

export default AdminFinanceCenter;
