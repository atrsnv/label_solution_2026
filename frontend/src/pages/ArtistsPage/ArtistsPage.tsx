import { useQuery } from '@tanstack/react-query';

import { publicService, type PublicArtist } from '../../services/publicService';

import './ArtistsPage.scss';

const formatDate = (date?: string) => {
  if (!date) return 'Дата не указана';

  return new Date(date).toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
};

const getArtistAvatar = (name: string) => {
  return name.trim().charAt(0).toUpperCase() || '?';
};

const ArtistsPage = () => {
  const {
    data,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ['artists-page'],
    queryFn: publicService.getArtists,
  });

  const artists = data?.artists || [];

  if (isLoading) {
    return (
      <main className="artists-page">
        <p className="artists-page__message">
          Загружаем артистов...
        </p>
      </main>
    );
  }

  if (isError) {
    return (
      <main className="artists-page">
        <p className="artists-page__message">
          Не удалось загрузить артистов.
        </p>
      </main>
    );
  }

  return (
    <main className="artists-page">

      <section className="artists-page__grid">
        {artists.map((artist: PublicArtist) => (
          <article
            className="artists-page-card"
            key={artist.id}
          >
            <div className="artists-page-card__avatar">
              {getArtistAvatar(artist.name)}
            </div>

            <div className="artists-page-card__content">
              <div className="artists-page-card__info">
                <h2>{artist.name}</h2>

                <p>
                  Присоединился:{' '}
                  {formatDate(artist.createdAt)}
                </p>
              </div>

              <button
                type="button"
                className="artists-page-card__button"
              >
                Слушать
              </button>
            </div>
          </article>
        ))}
      </section>

      {artists.length === 0 && (
        <p className="artists-page__message">
          Артисты пока не найдены
        </p>
      )}
    </main>
  );
};

export default ArtistsPage;