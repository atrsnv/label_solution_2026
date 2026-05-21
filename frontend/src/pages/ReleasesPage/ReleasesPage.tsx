import { useQuery } from '@tanstack/react-query';

import { publicService, type PublicTrack } from '../../services/publicService';

import './ReleasesPage.scss';

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
    queryFn: publicService.getTracks,
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
          Не удалось загрузить релизы.
        </p>
      </main>
    );
  }

  return (
    <main className="releases-page">

      <section className="releases-page__grid">
        {tracks.map((track: PublicTrack) => {
          const collabs = (track.collaborators ?? [])
            .filter((c) => c.name !== track.artist?.name);

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

                {track.artist && (
                  <p className="release-card__owner">
                    {track.artist.name}

                    {collabs.length > 0 && (
                      <span className="release-card__feat">
                        {' feat. '}
                        {collabs.map((c) => c.name).join(', ')}
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