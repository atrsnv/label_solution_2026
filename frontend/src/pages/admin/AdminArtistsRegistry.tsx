import { useMemo, useState } from 'react';
import type { FormEvent, MouseEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { adminService, type AdminArtist } from '../../services/adminService';

import './AdminArtistsRegistry.scss';
import BackButton from '../../components/BackButton/BackButton';

type ArtistStatus = 'Активен' | 'Нет аккаунта';

type Artist = {
  id: string;
  name: string;
  email: string;
  releases: number;
  labelShare: number;
  status: ArtistStatus;
  avatar: string;
  source: string;
  hasAccount: boolean;
  datalensArtistId: string | null;
};

type CreateArtistForm = {
  name: string;
  email: string;
  password: string;
  labelShare: string;
};

type EditArtistForm = {
  name: string;
  email: string;
  datalensArtistId: string;
  labelShare: string;
};

type InviteForm = {
  email: string;
};

type CreatedInvite = {
  token: string;
  email?: string | null;
  expiresAt?: string;
  path?: string;
};

type ApiError = {
  response?: {
    data?: {
      error?: string;
    };
  };
};

const DEFAULT_ARTIST_FORM: CreateArtistForm = {
  name: '',
  email: '',
  password: '',
  labelShare: '10',
};

const DEFAULT_EDIT_ARTIST_FORM: EditArtistForm = {
  name: '',
  email: '',
  datalensArtistId: '',
  labelShare: '10',
};

const DEFAULT_INVITE_FORM: InviteForm = {
  email: '',
};

const getArtistAvatar = (name: string) => {
  return name.trim().charAt(0).toUpperCase() || '?';
};

const mapArtistFromApi = (artist: AdminArtist): Artist => ({
  id: artist.id,
  name: artist.name,
  email: artist.email,
  releases: artist.tracksCount ?? artist.releases ?? artist._count?.ownedTracks ?? 0,
  labelShare: artist.labelShare ?? 0,
  status: artist.hasAccount === false ? 'Нет аккаунта' : 'Активен',
  avatar: getArtistAvatar(artist.name),
  source: artist.source || 'ERP',
  hasAccount: artist.hasAccount !== false,
  datalensArtistId: artist.datalensArtistId ?? null,
});

const buildInviteUrl = (invite: CreatedInvite) => {
  return `${window.location.origin}/login?tab=register&role=artist&token=${invite.token}`;
};

const AdminArtistsRegistry = () => {
  const queryClient = useQueryClient();

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [createArtistForm, setCreateArtistForm] =
    useState<CreateArtistForm>(DEFAULT_ARTIST_FORM);
  const [createArtistError, setCreateArtistError] = useState<string | null>(null);

  const [selectedArtistId, setSelectedArtistId] = useState<string | null>(null);
  const [editArtistForm, setEditArtistForm] =
    useState<EditArtistForm>(DEFAULT_EDIT_ARTIST_FORM);
  const [editArtistError, setEditArtistError] = useState<string | null>(null);

  const [deleteArtistId, setDeleteArtistId] = useState<string | null>(null);

  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [inviteForm, setInviteForm] = useState<InviteForm>(DEFAULT_INVITE_FORM);
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [createdInvite, setCreatedInvite] = useState<CreatedInvite | null>(null);
  const [copyMessage, setCopyMessage] = useState<string | null>(null);

  const {
    data,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ['admin-artists'],
    queryFn: adminService.getArtists,
  });

  const artists = useMemo(() => {
    return data?.artists.map(mapArtistFromApi) ?? [];
  }, [data?.artists]);

  const selectedArtist = useMemo(
    () => artists.find((artist) => artist.id === selectedArtistId),
    [artists, selectedArtistId],
  );

  const updateArtistMutation = useMutation({
    mutationFn: ({
      id,
      name,
      datalensArtistId,
      labelShare,
    }: {
      id: string;
      name: string;
      datalensArtistId?: string | null;
      labelShare: number;
    }) => adminService.updateArtist(id, { name, datalensArtistId, labelShare }),

    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-artists'] });
      queryClient.invalidateQueries({ queryKey: ['admin-dashboard-summary'] });

      setSelectedArtistId(null);
      setEditArtistForm(DEFAULT_EDIT_ARTIST_FORM);
      setEditArtistError(null);
    },
  });

  const deleteArtistMutation = useMutation({
    mutationFn: adminService.deleteArtist,

    onSuccess: (_data, deletedId) => {
      queryClient.invalidateQueries({ queryKey: ['admin-artists'] });
      queryClient.invalidateQueries({ queryKey: ['admin-dashboard-summary'] });
      setDeleteArtistId(null);
      if (selectedArtistId === deletedId) {
        setSelectedArtistId(null);
        setEditArtistForm(DEFAULT_EDIT_ARTIST_FORM);
        setEditArtistError(null);
      }
    },
  });

  const createArtistMutation = useMutation({
    mutationFn: adminService.createArtist,

    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-artists'] });
      queryClient.invalidateQueries({ queryKey: ['admin-dashboard-summary'] });

      setIsCreateModalOpen(false);
      setCreateArtistForm(DEFAULT_ARTIST_FORM);
      setCreateArtistError(null);
    },
  });

  const createInviteMutation = useMutation({
    mutationFn: adminService.createInvite,

    onSuccess: (response) => {
      setCreatedInvite(response.invite);
      setInviteError(null);
      setCopyMessage(null);
    },
  });

  const openCreateModal = () => {
    setSelectedArtistId(null);
    setIsInviteModalOpen(false);
    setCreateArtistError(null);
    setCreateArtistForm(DEFAULT_ARTIST_FORM);
    setIsCreateModalOpen(true);
  };

  const closeCreateModal = () => {
    if (createArtistMutation.isPending) return;

    setIsCreateModalOpen(false);
    setCreateArtistError(null);
    setCreateArtistForm(DEFAULT_ARTIST_FORM);
  };

  const openInviteModal = () => {
    setSelectedArtistId(null);
    setIsCreateModalOpen(false);
    setInviteForm(DEFAULT_INVITE_FORM);
    setInviteError(null);
    setCreatedInvite(null);
    setCopyMessage(null);
    setIsInviteModalOpen(true);
  };

  const closeInviteModal = () => {
    if (createInviteMutation.isPending) return;

    setIsInviteModalOpen(false);
    setInviteForm(DEFAULT_INVITE_FORM);
    setInviteError(null);
    setCreatedInvite(null);
    setCopyMessage(null);
  };

  const openEditArtistModal = (artist: Artist) => {
    setIsCreateModalOpen(false);
    setIsInviteModalOpen(false);
    setEditArtistError(null);
    setSelectedArtistId(artist.id);

    setEditArtistForm({
      name: artist.name,
      email: artist.email,
      datalensArtistId: artist.datalensArtistId || '',
      labelShare: String(artist.labelShare),
    });
  };

  const closeEditArtistModal = () => {
    if (updateArtistMutation.isPending) return;

    setSelectedArtistId(null);
    setEditArtistForm(DEFAULT_EDIT_ARTIST_FORM);
    setEditArtistError(null);
  };

  const handleCreateArtistChange = (
    field: keyof CreateArtistForm,
    value: string,
  ) => {
    setCreateArtistError(null);

    setCreateArtistForm((prevForm) => ({
      ...prevForm,
      [field]: value,
    }));
  };

  const handleEditArtistChange = (
    field: keyof EditArtistForm,
    value: string,
  ) => {
    setEditArtistError(null);

    setEditArtistForm((prevForm) => ({
      ...prevForm,
      [field]: value,
    }));
  };

  const handleInviteChange = (value: string) => {
    setInviteError(null);
    setCopyMessage(null);
    setCreatedInvite(null);

    setInviteForm({
      email: value,
    });
  };

  const handleCreateArtistSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    setCreateArtistError(null);

    const name = createArtistForm.name.trim();
    const email = createArtistForm.email.trim().toLowerCase();
    const password = createArtistForm.password.trim();
    const labelShare = Number(createArtistForm.labelShare);

    if (!name || !email || !password) {
      setCreateArtistError('Заполни имя, email и временный пароль.');
      return;
    }

    if (Number.isNaN(labelShare) || labelShare < 0 || labelShare > 100) {
      setCreateArtistError('Процент лейбла должен быть от 0 до 100.');
      return;
    }

    createArtistMutation.mutate(
      {
        name,
        email,
        password,
        labelShare,
      },
      {
        onError: (error: unknown) => {
          const apiError = error as ApiError;
          const message =
            apiError.response?.data?.error ||
            'Не удалось создать артиста. Проверь данные и попробуй еще раз.';

          setCreateArtistError(message);
        },
      },
    );
  };

  const handleEditArtistSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!selectedArtist) return;

    setEditArtistError(null);

    const name = editArtistForm.name.trim();
    const labelShare = Number(editArtistForm.labelShare);

    if (!name) {
      setEditArtistError('Имя артиста не может быть пустым.');
      return;
    }

    if (Number.isNaN(labelShare) || labelShare < 0 || labelShare > 100) {
      setEditArtistError('Процент лейбла должен быть от 0 до 100.');
      return;
    }

    updateArtistMutation.mutate(
      {
        id: selectedArtist.id,
        name,
        datalensArtistId: editArtistForm.datalensArtistId.trim() || null,
        labelShare,
      },
      {
        onError: (error: unknown) => {
          const apiError = error as ApiError;
          const message =
            apiError.response?.data?.error ||
            'Не удалось обновить артиста. Проверь данные и попробуй еще раз.';

          setEditArtistError(message);
        },
      },
    );
  };

  const handleCreateInviteSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    setInviteError(null);
    setCopyMessage(null);
    setCreatedInvite(null);

    const email = inviteForm.email.trim().toLowerCase();

    createInviteMutation.mutate(
      {
        email: email || undefined,
      },
      {
        onError: (error: unknown) => {
          const apiError = error as ApiError;
          const message =
            apiError.response?.data?.error ||
            'Не удалось создать инвайт. Попробуй еще раз.';

          setInviteError(message);
        },
      },
    );
  };

  const handleCopyInviteLink = async () => {
    if (!createdInvite) return;

    const inviteUrl = buildInviteUrl(createdInvite);

    try {
      await navigator.clipboard.writeText(inviteUrl);
      setCopyMessage('Ссылка скопирована.');
    } catch {
      setCopyMessage('Не удалось скопировать ссылку. Скопируй ее вручную.');
    }
  };

  const handleArtistRowClick = (
    artist: Artist,
    event: MouseEvent<HTMLTableRowElement>,
  ) => {
    const target = event.target as HTMLElement;

    if (target.closest('button')) return;
    if (!artist.hasAccount) return;

    openEditArtistModal(artist);
  };

  if (isLoading) {
    return (
      <main className="admin-artists">
        <section className="admin-artists__panel">
          <div className="admin-artists__top">
            <h1>Реестр артистов</h1>
          </div>

          <p className="admin-artists__message">Загружаем артистов...</p>
        </section>
      </main>
    );
  }

  if (isError) {
    return (
      <main className="admin-artists">
        <section className="admin-artists__panel">
          <div className="admin-artists__top">
            <h1>Реестр артистов</h1>
          </div>

          <p className="admin-artists__message">
            Не удалось загрузить артистов. Проверь, что backend запущен и ты вошла как администратор.
          </p>
        </section>
      </main>
    );
  }

  return (
    <main className="admin-artists">
      <BackButton />
      <section className="admin-artists__panel">
        <div className="admin-artists__top">
          <h1>Реестр артистов</h1>

          <div className="admin-artists__top-actions">
            <button
              type="button"
              className="admin-artists__add-button"
              onClick={openInviteModal}
            >
              + Создать инвайт
            </button>

            <button
              type="button"
              className="admin-artists__add-button"
              onClick={openCreateModal}
            >
              + Добавить артиста
            </button>
          </div>
        </div>

        <div className="admin-artists__table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Артист</th>
                <th>Электронная почта</th>
                <th>Количество релизов</th>
                <th>Процент лейбла</th>
                <th>Источник</th>
                <th>Статус</th>
              </tr>
            </thead>

            <tbody>
              {artists.length > 0 ? (
                artists.map((artist) => (
                  <tr
                    key={artist.id}
                    className={
                      selectedArtistId === artist.id
                        ? 'admin-artists__row admin-artists__row--active'
                        : 'admin-artists__row'
                    }
                    onClick={(event) => handleArtistRowClick(artist, event)}
                  >
                    <td>
                      <div className="admin-artists__artist">
                        <div className="admin-artists__avatar">
                          {artist.avatar}
                        </div>
                        <span>{artist.name}</span>
                      </div>
                    </td>

                    <td>{artist.email}</td>
                    <td>{artist.releases}</td>
                    <td>{artist.hasAccount ? `${artist.labelShare}%` : '—'}</td>
                    <td>{artist.source}</td>

                    <td>
                      <div className="admin-artists__status-cell">
                        <span
                          className={
                            artist.status === 'Активен'
                              ? 'admin-artists__status admin-artists__status--active'
                              : 'admin-artists__status admin-artists__status--inactive'
                          }
                        >
                          {artist.status}
                        </span>

                        <button
                          type="button"
                          className="admin-artists__delete-btn"
                          title="Удалить артиста"
                          onClick={(e) => { e.stopPropagation(); setDeleteArtistId(artist.id); }}
                        >
                          ✕
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="admin-artists__empty">
                    Артисты пока не добавлены
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {selectedArtist && (
        <div
          className="admin-artists__modal-overlay"
          onMouseDown={closeEditArtistModal}
        >
          <form
            className="admin-artists__modal"
            onSubmit={handleEditArtistSubmit}
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className="admin-artists__modal-head">
              <h2>Редактировать артиста</h2>

              <button
                type="button"
                className="admin-artists__modal-close"
                onClick={closeEditArtistModal}
              >
                ×
              </button>
            </div>

            <label className="admin-artists__modal-field">
              <span>Имя артиста</span>
              <input
                type="text"
                value={editArtistForm.name}
                onChange={(event) =>
                  handleEditArtistChange('name', event.target.value)
                }
              />
            </label>

            <label className="admin-artists__modal-field">
              <span>Email</span>
              <input
                type="email"
                value={editArtistForm.email}
                disabled
                title="Backend пока не поддерживает редактирование email"
                onChange={(event) =>
                  handleEditArtistChange('email', event.target.value)
                }
              />
            </label>

            <p className="admin-artists__modal-hint">
              Email сейчас нельзя изменить: backend обновляет только имя auth-аккаунта.
            </p>

            <label className="admin-artists__modal-field">
              <span>DataLens Artist ID</span>
              <input
                type="text"
                placeholder="Например: Instasamka или ART-01"
                value={editArtistForm.datalensArtistId}
                onChange={(event) =>
                  handleEditArtistChange('datalensArtistId', event.target.value)
                }
              />
            </label>

            <label className="admin-artists__modal-field">
              <span>Процент лейбла</span>
              <input
                type="number"
                min="0"
                max="100"
                step="1"
                value={editArtistForm.labelShare}
                onChange={(event) =>
                  handleEditArtistChange('labelShare', event.target.value)
                }
              />
            </label>

            <p className="admin-artists__modal-hint">
              Artist ID связывает аккаунт с DataLens, а процент лейбла задает
              базовую долю договора для этого артиста.
            </p>

            {editArtistError && (
              <p className="admin-artists__modal-error">
                {editArtistError}
              </p>
            )}

            <div className="admin-artists__modal-actions">
              <button
                type="button"
                onClick={closeEditArtistModal}
                disabled={updateArtistMutation.isPending}
              >
                Отмена
              </button>

              <button
                type="submit"
                disabled={updateArtistMutation.isPending}
              >
                {updateArtistMutation.isPending ? 'Сохраняем...' : 'Сохранить'}
              </button>
            </div>
          </form>
        </div>
      )}

      {isCreateModalOpen && (
        <div
          className="admin-artists__modal-overlay"
          onMouseDown={closeCreateModal}
        >
          <form
            className="admin-artists__modal"
            onSubmit={handleCreateArtistSubmit}
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className="admin-artists__modal-head">
              <h2>Добавить артиста</h2>

              <button
                type="button"
                className="admin-artists__modal-close"
                onClick={closeCreateModal}
              >
                ×
              </button>
            </div>

            <label className="admin-artists__modal-field">
              <span>Имя артиста</span>
              <input
                type="text"
                placeholder="Например, New Artist"
                value={createArtistForm.name}
                onChange={(event) =>
                  handleCreateArtistChange('name', event.target.value)
                }
              />
            </label>

            <label className="admin-artists__modal-field">
              <span>Email</span>
              <input
                type="email"
                placeholder="artist@example.com"
                value={createArtistForm.email}
                onChange={(event) =>
                  handleCreateArtistChange('email', event.target.value)
                }
              />
            </label>

            <label className="admin-artists__modal-field">
              <span>Временный пароль</span>
              <input
                type="text"
                placeholder="Например, artist123"
                value={createArtistForm.password}
                onChange={(event) =>
                  handleCreateArtistChange('password', event.target.value)
                }
              />
            </label>

            <label className="admin-artists__modal-field">
              <span>Процент лейбла</span>
              <input
                type="number"
                min="0"
                max="100"
                step="1"
                value={createArtistForm.labelShare}
                onChange={(event) =>
                  handleCreateArtistChange('labelShare', event.target.value)
                }
              />
            </label>

            {createArtistError && (
              <p className="admin-artists__modal-error">
                {createArtistError}
              </p>
            )}

            <div className="admin-artists__modal-actions">
              <button
                type="button"
                onClick={closeCreateModal}
                disabled={createArtistMutation.isPending}
              >
                Отмена
              </button>

              <button
                type="submit"
                disabled={createArtistMutation.isPending}
              >
                {createArtistMutation.isPending ? 'Создаем...' : 'Создать'}
              </button>
            </div>
          </form>
        </div>
      )}

      {isInviteModalOpen && (
        <div
          className="admin-artists__modal-overlay"
          onMouseDown={closeInviteModal}
        >
          <form
            className="admin-artists__modal"
            onSubmit={handleCreateInviteSubmit}
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className="admin-artists__modal-head">
              <h2>Создать инвайт</h2>

              <button
                type="button"
                className="admin-artists__modal-close"
                onClick={closeInviteModal}
              >
                ×
              </button>
            </div>

            <label className="admin-artists__modal-field">
              <span>Email артиста, необязательно</span>
              <input
                type="email"
                placeholder="artist@example.com"
                value={inviteForm.email}
                onChange={(event) => handleInviteChange(event.target.value)}
              />
            </label>

            <p className="admin-artists__modal-hint">
              Если указать email, инвайт будет привязан к нему. Если оставить поле пустым,
              артист сможет указать email сам при регистрации.
            </p>

            {inviteError && (
              <p className="admin-artists__modal-error">
                {inviteError}
              </p>
            )}

            {createdInvite && (
              <div className="admin-artists__invite-result">
                <span>Инвайт-токен</span>
                <code>{createdInvite.token}</code>

                <span>Ссылка для артиста</span>
                <code>{buildInviteUrl(createdInvite)}</code>

                {createdInvite.expiresAt && (
                  <p>
                    Действует до:{' '}
                    {new Date(createdInvite.expiresAt).toLocaleDateString('ru-RU')}
                  </p>
                )}

                <button
                  type="button"
                  className="admin-artists__copy-button"
                  onClick={handleCopyInviteLink}
                >
                  Скопировать ссылку
                </button>

                {copyMessage && (
                  <p className="admin-artists__copy-message">
                    {copyMessage}
                  </p>
                )}
              </div>
            )}

            <div className="admin-artists__modal-actions">
              <button
                type="button"
                onClick={closeInviteModal}
                disabled={createInviteMutation.isPending}
              >
                Закрыть
              </button>

              <button
                type="submit"
                disabled={createInviteMutation.isPending}
              >
                {createInviteMutation.isPending ? 'Создаем...' : 'Создать'}
              </button>
            </div>
          </form>
        </div>
      )}

      {deleteArtistId && (
        <div
          className="admin-artists__modal-overlay"
          onMouseDown={() => !deleteArtistMutation.isPending && setDeleteArtistId(null)}
        >
          <div
            className="admin-artists__modal"
            onMouseDown={(e) => e.stopPropagation()}
          >
            <div className="admin-artists__modal-head">
              <h2>Удалить артиста</h2>

              <button
                type="button"
                className="admin-artists__modal-close"
                onClick={() => setDeleteArtistId(null)}
                disabled={deleteArtistMutation.isPending}
              >
                ×
              </button>
            </div>

            <p className="admin-artists__modal-hint">
              Аккаунт будет удалён безвозвратно. Данные DataLens не затрагиваются.
            </p>

            {deleteArtistMutation.isError && (
              <p className="admin-artists__modal-error">
                Не удалось удалить артиста. Попробуй ещё раз.
              </p>
            )}

            <div className="admin-artists__modal-actions">
              <button
                type="button"
                onClick={() => setDeleteArtistId(null)}
                disabled={deleteArtistMutation.isPending}
              >
                Отмена
              </button>

              <button
                type="button"
                className="admin-artists__delete-confirm"
                disabled={deleteArtistMutation.isPending}
                onClick={() => deleteArtistMutation.mutate(deleteArtistId)}
              >
                {deleteArtistMutation.isPending ? 'Удаляем...' : 'Удалить'}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
};

export default AdminArtistsRegistry;
