import { useQuery } from '@tanstack/react-query';

import { adminService, type AdminTrack } from '../../services/adminService';

import './ReleasesPage.scss';

const TRACK_STATUS_LABELS = {
  PENDING: 'Ожидает',
  APPROVED: 'Одобрен',
  ERROR: 'Ошибка',
} as const;

const formatDate = (date?: string) => {
  if (!date) return 'Дата не указана';

  return new Date(date).toLocaleDateString('ru-RU');
};

const ReleasesPage = () => {
  const {
    data,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ['public-releases'],
    queryFn: adminService.getTracks,
  });

  const tracks = data?.tracks ?? [];

  if (isLoading) {
    return (
      <main className="releases-page">
        <p className="releases-page__message">Загружаем релизы...</p>
      </main>
    );
  }

  if (isError) {
    return (
      <main className="releases-page">
        <p className="releases-page__message">
          Не удалось загрузить релизы. Войди в аккаунт администратора.
        </p>
      </main>
    );
  }

  return (
    <main className="releases-page">

      <section className="releases-page__grid">
        {tracks.map((track: AdminTrack) => {
          const collabs = track.splits
            .map((split) => split.user)
            .filter((artist) => artist.name !== track.owner?.name);

          const statusLabel =
            TRACK_STATUS_LABELS[
              track.status as keyof typeof TRACK_STATUS_LABELS
            ] ?? track.status;

          return (
            <article className="release-card" key={track.id}>
              <div className="release-card__cover">
                {track.coverUrl ? (
                  <img src={track.coverUrl} alt={track.title} />
                ) : (
                  <span className="release-card__cover-placeholder">
                    VAULT
                  </span>
                )}
              </div>

              <div className="release-card__info">
                <h2>{track.title}</h2>

                {track.owner && (
                  <p className="release-card__owner">
                    {track.owner.name}

                    {collabs.length > 0 && (
                      <span className="release-card__feat">
                        {' feat. '}
                        {collabs.map((artist) => artist.name).join(', ')}
                      </span>
                    )}
                  </p>
                )}

                <p>
                  Дата релиза:{' '}
                  {formatDate(track.releaseDate || track.createdAt)}
                </p>
              </div>
            </article>
          );
        })}
      </section>

      {tracks.length === 0 && (
        <p className="releases-page__message">
          Релизы пока не найдены
        </p>
      )}
    </main>
  );
};

export default ReleasesPage;