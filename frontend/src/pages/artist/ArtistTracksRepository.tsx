import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';

import { artistService } from '../../services/artistService';

import './ArtistTracksRepository.scss';

const TRACK_STATUS_LABELS = {
  PENDING: 'Ожидает',
  APPROVED: 'Одобрен',
  ERROR: 'Ошибка',
} as const;

const formatDate = (date: string) => {
  return new Date(date).toLocaleDateString('ru-RU');
};

const ArtistTracksRepository = () => {
  const {
    data,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ['artist-tracks'],
    queryFn: artistService.getTracks,
  });

  const tracks = data?.tracks ?? [];

  if (isLoading) {
    return (
      <main className="artist-tracks">
        <h1>Мои релизы</h1>

        <p className="artist-tracks__message">Загружаем релизы...</p>
      </main>
    );
  }

  if (isError) {
    return (
      <main className="artist-tracks">
        <h1>Мои релизы</h1>

        <p className="artist-tracks__message">
          Не удалось загрузить релизы. Проверь, что backend запущен и ты вошла как артист.
        </p>
      </main>
    );
  }

  return (
    <main className="artist-tracks">
      <h1>Мои релизы</h1>

      <section className="artist-tracks__grid">
        <Link to="/artist/upload" className="artist-tracks__upload-card">
          <span className="artist-tracks__upload-icon" />

          <span>
            Загрузить
            <br />
            новый релиз
          </span>
        </Link>

        {tracks.map((track) => (
          <article className="artist-tracks__card" key={track.id}>
            <div className="artist-tracks__cover">
              {track.coverUrl ? (
                <img src={track.coverUrl} alt={track.title} />
              ) : (
                <span className="artist-tracks__cover-placeholder">VAULT</span>
              )}
            </div>

            <div className="artist-tracks__info">
              <h2>{track.title}</h2>

              <p>
                Дата релиза:{' '}
                {formatDate(track.releaseDate || track.createdAt)}
              </p>

              <span
                className={`artist-tracks__status artist-tracks__status--${track.status.toLowerCase()}`}
              >
                {TRACK_STATUS_LABELS[track.status]}
              </span>
            </div>
          </article>
        ))}
      </section>

      {tracks.length === 0 && (
        <p className="artist-tracks__empty">
          Релизов пока нет. Можно загрузить первый.
        </p>
      )}
    </main>
  );
};

export default ArtistTracksRepository;