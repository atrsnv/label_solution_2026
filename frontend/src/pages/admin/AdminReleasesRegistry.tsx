import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';

import { adminService, type TrackStatus } from '../../services/adminService';

import './AdminReleasesRegistry.scss';

type ReleaseFilter = TrackStatus;

const statusFilters: Array<{
  label: string;
  value: ReleaseFilter;
  className: string;
}> = [
  {
    label: 'Одобрен',
    value: 'APPROVED',
    className: 'approved',
  },
  {
    label: 'Ожидает',
    value: 'PENDING',
    className: 'pending',
  },
  {
    label: 'Ошибка',
    value: 'ERROR',
    className: 'error',
  },
];

const TRACK_STATUS_LABELS: Record<TrackStatus, string> = {
  APPROVED: 'Одобрен',
  PENDING: 'Ожидает',
  ERROR: 'Ошибка',
};

const TRACK_STATUS_CLASSES: Record<TrackStatus, string> = {
  APPROVED: 'approved',
  PENDING: 'pending',
  ERROR: 'error',
};

const formatDate = (date: string) => {
  return new Date(date).toLocaleDateString('ru-RU');
};

const getCoverLetter = (value: string) => {
  return value.trim().charAt(0).toUpperCase() || '?';
};

const AdminReleasesRegistry = () => {
  const [activeStatus, setActiveStatus] = useState<ReleaseFilter | null>(null);

  const {
    data,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ['admin-tracks'],
    queryFn: adminService.getTracks,
  });

  const visibleTracks = useMemo(() => {
    const tracks = data?.tracks ?? [];

    return tracks
      .filter((track) => {
        if (!activeStatus) return true;

        return track.status === activeStatus;
      })
      .sort((firstTrack, secondTrack) => {
        return (
          new Date(secondTrack.createdAt).getTime() -
          new Date(firstTrack.createdAt).getTime()
        );
      });
  }, [activeStatus, data?.tracks]);

  const handleStatusClick = (status: ReleaseFilter) => {
    setActiveStatus((currentStatus) =>
      currentStatus === status ? null : status,
    );
  };

  if (isLoading) {
    return (
      <main className="admin-releases">
        <section className="admin-releases__panel">
          <div className="admin-releases__top">
            <h1>Реестр релизов</h1>
          </div>

          <p className="admin-releases__message">Загружаем релизы...</p>
        </section>
      </main>
    );
  }

  if (isError) {
    return (
      <main className="admin-releases">
        <section className="admin-releases__panel">
          <div className="admin-releases__top">
            <h1>Реестр релизов</h1>
          </div>

          <p className="admin-releases__message">
            Не удалось загрузить релизы. Проверь, что backend запущен и ты вошла как администратор.
          </p>
        </section>
      </main>
    );
  }

  return (
    <main className="admin-releases">
      <section className="admin-releases__panel">
        <div className="admin-releases__top">
          <h1>Реестр релизов</h1>

          <div className="admin-releases__filters">
            {statusFilters.map((status) => (
              <button
                key={status.value}
                type="button"
                className={`admin-releases__filter admin-releases__filter--${status.className} ${
                  activeStatus === status.value ? 'admin-releases__filter--active' : ''
                }`}
                onClick={() => handleStatusClick(status.value)}
              >
                {status.label}
              </button>
            ))}
          </div>
        </div>

        <div className="admin-releases__table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Артист</th>
                <th>Название</th>
                <th>Дата добавления</th>
                <th>Статус сплита</th>
              </tr>
            </thead>

            <tbody>
              {visibleTracks.length > 0 ? (
                visibleTracks.map((track) => (
                  <tr key={track.id}>
                    <td>
                      <div className="admin-releases__artist">
                        <div className="admin-releases__cover">
                          {getCoverLetter(track.owner?.name || track.title)}
                        </div>

                        <span>{track.owner?.name || 'Неизвестный артист'}</span>
                      </div>
                    </td>

                    <td>{track.title}</td>
                    <td>{formatDate(track.createdAt || track.releaseDate)}</td>

                    <td>
                      <span
                        className={`admin-releases__status admin-releases__status--${
                          TRACK_STATUS_CLASSES[track.status]
                        }`}
                      >
                        {TRACK_STATUS_LABELS[track.status]}
                      </span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={4} className="admin-releases__empty">
                    Релизов с таким статусом пока нет
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
};

export default AdminReleasesRegistry;
