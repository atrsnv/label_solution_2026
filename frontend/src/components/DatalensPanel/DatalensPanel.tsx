import { useQuery } from '@tanstack/react-query';

import { datalensService } from '../../services/datalensService';
import { useAuthStore } from '../../store/authStore';

import './DatalensPanel.scss';

type DatalensPanelProps = {
  title?: string;
  className?: string;
};

const DatalensPanel = ({
  title = 'DataLens аналитика',
  className = '',
}: DatalensPanelProps) => {
  const user = useAuthStore((state) => state.user);

  const {
    data: datalensEmbed,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ['datalens-embed', user?.id, user?.role],
    queryFn: datalensService.getEmbed,
    enabled: Boolean(user),
    staleTime: 0,
  });

  return (
    <section className={`datalens-panel ${className}`.trim()}>
      <div className="datalens-panel__top">
        <h2>{title}</h2>
      </div>

      {isLoading && (
        <p className="datalens-panel__message">Загружаем DataLens...</p>
      )}

      {isError && (
        <p className="datalens-panel__message">
          Не удалось загрузить DataLens. Проверь backend и авторизацию.
        </p>
      )}

      {!isLoading && !isError && !datalensEmbed?.configured && (
        <p className="datalens-panel__message">
          DataLens пока не настроен. Добавь DATALENS_PUBLIC_URL или embed-настройки в backend .env.
        </p>
      )}

      {!isLoading && !isError && datalensEmbed?.url && (
        <iframe
          className="datalens-panel__frame"
          src={datalensEmbed.url}
          title={title}
          loading="lazy"
        />
      )}
    </section>
  );
};

export default DatalensPanel;