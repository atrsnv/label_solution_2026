import { useEffect, useMemo, useRef, useState } from 'react';
import type { ChangeEvent, FormEvent } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';

import { trackService, type CreateTrackPayload } from '../../services/trackService';
import { useAuthStore } from '../../store/authStore';

import './ArtistUploadRelease.scss';

type ExtraAuthor = {
  id: number;
  name: string;
  percent: number;
};

const DEFAULT_LABEL_BASE_PERCENT = 30;

const clampPercent = (value: number) => {
  if (Number.isNaN(value)) return 0;
  if (value < 0) return 0;
  if (value > 100) return 100;

  return value;
};

const formatReleaseDateInput = (value: string) => {
  const digits = value.replace(/\D/g, '').slice(0, 8);

  if (digits.length <= 2) {
    return digits;
  }

  if (digits.length <= 4) {
    return `${digits.slice(0, 2)}.${digits.slice(2)}`;
  }

  return `${digits.slice(0, 2)}.${digits.slice(2, 4)}.${digits.slice(4)}`;
};

const normalizeDateForApi = (date: string) => {
  const trimmedDate = date.trim();

  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmedDate)) {
    return trimmedDate;
  }

  const dateParts = trimmedDate.split('.');

  if (dateParts.length !== 3) {
    return '';
  }

  const [day, month, year] = dateParts;

  if (!day || !month || !year) {
    return '';
  }

  return `${year.padStart(4, '0')}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
};

const isEmail = (value: string) => {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
};

const ArtistUploadRelease = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const user = useAuthStore((state) => state.user);

  const coverInputRef = useRef<HTMLInputElement | null>(null);

  const [coverName, setCoverName] = useState('');
  const [title, setTitle] = useState('');
  const [releaseDate, setReleaseDate] = useState('');

  const [mainArtist, setMainArtist] = useState(user?.name || '');
  const [mainArtistPercent, setMainArtistPercent] = useState(100);

  const [lyricsAuthor, setLyricsAuthor] = useState('');
  const [lyricsPercent, setLyricsPercent] = useState(0);

  const [musicAuthor, setMusicAuthor] = useState('');
  const [musicPercent, setMusicPercent] = useState(0);

  const [extraAuthors, setExtraAuthors] = useState<ExtraAuthor[]>([]);

  const [formError, setFormError] = useState<string | null>(null);

  const labelBasePercent = user?.labelShare ?? DEFAULT_LABEL_BASE_PERCENT;
  const artistsPoolPercent = 100 - labelBasePercent;

  useEffect(() => {
    if (user?.name) {
      setMainArtist(user.name);
    }
  }, [user?.name]);

  const usedSplitPercent = useMemo(() => {
    const extraPercent = extraAuthors.reduce(
      (sum, author) => sum + author.percent,
      0,
    );

    return mainArtistPercent + lyricsPercent + musicPercent + extraPercent;
  }, [mainArtistPercent, lyricsPercent, musicPercent, extraAuthors]);

  const remainingSplitPercent = 100 - usedSplitPercent;

  const visibleArtistPercent = Math.max(
    0,
    Math.min(artistsPoolPercent, (usedSplitPercent / 100) * artistsPoolPercent),
  );

  const visibleRemainingPercent = Math.max(
    0,
    Math.min(artistsPoolPercent, (remainingSplitPercent / 100) * artistsPoolPercent),
  );

  const createTrackMutation = useMutation({
    mutationFn: trackService.createTrack,

    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['artist-tracks'] });
      queryClient.invalidateQueries({ queryKey: ['artist-dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['admin-tracks'] });
      queryClient.invalidateQueries({ queryKey: ['admin-dashboard-summary'] });

      navigate('/artist/tracks');
    },
  });

  const handleCoverChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];

    if (!file) return;

    setCoverName(file.name);
  };

  const handleAddAuthor = () => {
    setExtraAuthors((prevAuthors) => [
      ...prevAuthors,
      {
        id: Date.now(),
        name: '',
        percent: 0,
      },
    ]);
  };

  const handleExtraAuthorChange = (
    id: number,
    field: 'name' | 'percent',
    value: string,
  ) => {
    setExtraAuthors((prevAuthors) =>
      prevAuthors.map((author) =>
        author.id === id
          ? {
              ...author,
              [field]: field === 'percent' ? clampPercent(Number(value)) : value,
            }
          : author,
      ),
    );
  };

  const buildSplits = (): CreateTrackPayload['splits'] => {
    if (!user) return [];

    const splits: CreateTrackPayload['splits'] = [
      {
        userId: user.id,
        share: mainArtistPercent,
      },
    ];

    if (musicAuthor.trim()) {
      splits.push({
        email: musicAuthor.trim().toLowerCase(),
        share: musicPercent,
      });
    }

    if (lyricsAuthor.trim()) {
      splits.push({
        email: lyricsAuthor.trim().toLowerCase(),
        share: lyricsPercent,
      });
    }

    extraAuthors.forEach((author) => {
      if (!author.name.trim()) return;

      splits.push({
        email: author.name.trim().toLowerCase(),
        share: author.percent,
      });
    });

    return splits;
  };

  const validateForm = () => {
    if (!user) {
      return 'Не удалось определить текущего артиста. Попробуй войти заново.';
    }

    if (!title.trim()) {
      return 'Укажи название релиза.';
    }

    if (!releaseDate.trim()) {
      return 'Укажи желаемую дату релиза.';
    }

    if (!normalizeDateForApi(releaseDate)) {
      return 'Дата должна быть в формате дд.мм.гггг.';
    }

    if (usedSplitPercent !== 100) {
      return 'Сумма процентов между артистами и соавторами должна быть ровно 100%.';
    }

    if (mainArtistPercent <= 0) {
      return 'Процент основного исполнителя должен быть больше 0.';
    }

    if (musicAuthor.trim() && !isEmail(musicAuthor)) {
      return 'В поле автора музыки укажи email зарегистрированного артиста.';
    }

    if (musicAuthor.trim() && musicPercent <= 0) {
      return 'Для автора музыки нужно указать процент больше 0.';
    }

    if (lyricsAuthor.trim() && !isEmail(lyricsAuthor)) {
      return 'В поле автора текста укажи email зарегистрированного артиста.';
    }

    if (lyricsAuthor.trim() && lyricsPercent <= 0) {
      return 'Для автора текста нужно указать процент больше 0.';
    }

    const invalidExtraAuthor = extraAuthors.find((author) => {
      if (!author.name.trim()) return false;

      return !isEmail(author.name) || author.percent <= 0;
    });

    if (invalidExtraAuthor) {
      return 'Для featured артиста / соавтора укажи email зарегистрированного артиста и процент больше 0.';
    }

    return null;
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    setFormError(null);

    const validationError = validateForm();

    if (validationError) {
      setFormError(validationError);
      return;
    }

    const payload: CreateTrackPayload = {
      title: title.trim(),
      releaseDate: normalizeDateForApi(releaseDate),
      coverUrl: null,
      splits: buildSplits(),
    };

    createTrackMutation.mutate(payload, {
      onError: (error: any) => {
        const message =
          error.response?.data?.error ||
          'Не удалось отправить релиз. Проверь данные и попробуй еще раз.';

        setFormError(message);
      },
    });
  };

  return (
    <main className="artist-upload">
      <form className="artist-upload__form" onSubmit={handleSubmit}>
        <h1>Форма загрузки трека</h1>

        <div className="artist-upload__content">
          <aside className="artist-upload__aside">
            <button
              type="button"
              className="artist-upload__cover"
              onClick={() => coverInputRef.current?.click()}
            >
              <input
                ref={coverInputRef}
                type="file"
                accept=".jpg,.jpeg,.png"
                onChange={handleCoverChange}
              />

              <span className="artist-upload__cover-icon" />

              <span>
                {coverName || (
                  <>
                    Загрузить
                    <br />
                    обложку
                  </>
                )}
              </span>
            </button>

            <p className="artist-upload__formats">
              Поддерживаемые
              <br />
              форматы: .jpg, .png
            </p>

            <p className="artist-upload__cover-note">
              Обложка пока не отправляется на сервер: backend принимает только ссылку.
            </p>
          </aside>

          <section className="artist-upload__main">
            <label className="artist-upload__field">
              <span>Название</span>

              <small>
                Укажите точно так, как должно отображаться на музыкальных
                сервисах
              </small>

              <input
                type="text"
                placeholder="Царица"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
              />
            </label>

            <label className="artist-upload__field">
              <span>Желаемая дата релиза</span>

              <small>
                Укажите дату в формате дд.мм.гггг
              </small>

              <input
                type="text"
                inputMode="numeric"
                placeholder="дд.мм.гггг"
                maxLength={10}
                value={releaseDate}
                onChange={(event) =>
                  setReleaseDate(formatReleaseDateInput(event.target.value))
                }
              />
            </label>

            <section className="artist-upload__percent">
              <p>Распределение процентов</p>

              <div className="artist-upload__percent-line">
                <span
                  className="artist-upload__percent-fill artist-upload__percent-fill--base"
                  style={{ width: `${labelBasePercent}%` }}
                />

                <span
                  className="artist-upload__percent-fill artist-upload__percent-fill--artist"
                  style={{ width: `${visibleArtistPercent}%` }}
                />

                <span
                  className="artist-upload__percent-fill artist-upload__percent-fill--remaining"
                  style={{ width: `${visibleRemainingPercent}%` }}
                />

                <span className="artist-upload__percent-label artist-upload__percent-label--base">
                  Лейбл {labelBasePercent}%
                </span>

                <span
                  className="artist-upload__percent-label artist-upload__percent-label--artist"
                  style={{ left: `${labelBasePercent}%` }}
                >
                  Авторы {usedSplitPercent}%
                </span>

                <span
                  className={
                    remainingSplitPercent < 0
                      ? 'artist-upload__percent-label artist-upload__percent-label--remaining artist-upload__percent-label--error'
                      : 'artist-upload__percent-label artist-upload__percent-label--remaining'
                  }
                >
                  Осталось распределить {remainingSplitPercent}%
                </span>
              </div>
            </section>

            <section className="artist-upload__authors">
              <div className="artist-upload__authors-head">
                <h2>Список авторов</h2>

                <button
                  type="button"
                  className="artist-upload__add-author"
                  onClick={handleAddAuthor}
                >
                  + Добавить featured артиста / соавтора
                </button>
              </div>

              <div className="artist-upload__authors-grid">
                <label className="artist-upload__author-field">
                  <span>Основной исполнитель</span>

                  <div className="artist-upload__input-row">
                    <input
                      type="text"
                      value={mainArtist}
                      onChange={(event) => setMainArtist(event.target.value)}
                    />

                    <input
                      className="artist-upload__percent-input"
                      type="number"
                      min="0"
                      max="100"
                      value={mainArtistPercent}
                      onChange={(event) =>
                        setMainArtistPercent(
                          clampPercent(Number(event.target.value)),
                        )
                      }
                      onFocus={(event) => event.target.select()}
                    />

                    <b>%</b>
                  </div>
                </label>

                <label className="artist-upload__author-field">
                  <span>Автор музыки</span>

                  <div className="artist-upload__input-row">
                    <input
                      type="email"
                      placeholder="email зарегистрированного артиста"
                      value={musicAuthor}
                      onChange={(event) => setMusicAuthor(event.target.value)}
                    />

                    <input
                      className="artist-upload__percent-input"
                      type="number"
                      min="0"
                      max="100"
                      value={musicPercent}
                      onChange={(event) =>
                        setMusicPercent(
                          clampPercent(Number(event.target.value)),
                        )
                      }
                      onFocus={(event) => event.target.select()}
                    />

                    <b>%</b>
                  </div>
                </label>

                <label className="artist-upload__author-field">
                  <span>Автор текста</span>

                  <div className="artist-upload__input-row">
                    <input
                      type="email"
                      placeholder="email зарегистрированного артиста"
                      value={lyricsAuthor}
                      onChange={(event) => setLyricsAuthor(event.target.value)}
                    />

                    <input
                      className="artist-upload__percent-input"
                      type="number"
                      min="0"
                      max="100"
                      value={lyricsPercent}
                      onChange={(event) =>
                        setLyricsPercent(
                          clampPercent(Number(event.target.value)),
                        )
                      }
                      onFocus={(event) => event.target.select()}
                    />

                    <b>%</b>
                  </div>
                </label>

                {extraAuthors.length > 0 ? (
                  extraAuthors.map((author) => (
                    <label
                      className="artist-upload__author-field"
                      key={author.id}
                    >
                      <span>Соавтор / featured артист</span>

                      <div className="artist-upload__input-row">
                        <input
                          type="email"
                          placeholder="email зарегистрированного артиста"
                          value={author.name}
                          onChange={(event) =>
                            handleExtraAuthorChange(
                              author.id,
                              'name',
                              event.target.value,
                            )
                          }
                        />

                        <input
                          className="artist-upload__percent-input"
                          type="number"
                          min="0"
                          max="100"
                          value={author.percent}
                          onChange={(event) =>
                            handleExtraAuthorChange(
                              author.id,
                              'percent',
                              event.target.value,
                            )
                          }
                          onFocus={(event) => event.target.select()}
                        />

                        <b>%</b>
                      </div>
                    </label>
                  ))
                ) : (
                  <div className="artist-upload__author-placeholder" />
                )}
              </div>
            </section>

            {formError && (
              <p className="artist-upload__error">
                {formError}
              </p>
            )}

            <div className="artist-upload__actions">
              <button type="button" onClick={() => navigate('/artist/tracks')}>
                Отменить
              </button>

              <button
                type="submit"
                className="artist-upload__submit"
                disabled={
                  remainingSplitPercent !== 0 ||
                  createTrackMutation.isPending
                }
              >
                {createTrackMutation.isPending ? 'Отправляем...' : 'Отправить'}
              </button>
            </div>
          </section>
        </div>
      </form>
    </main>
  );
};

export default ArtistUploadRelease;