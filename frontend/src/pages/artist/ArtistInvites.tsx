import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { artistService } from '../../services/artistService';
import { trackService } from '../../services/trackService';

import './ArtistInvites.scss';

type InviteStatus = 'PENDING' | 'DISPUTED';

type Invite = {
  id: string;
  share: number;
  status: InviteStatus;
  track: {
    id: string;
    title: string;
    labelShare: number;
    owner?: {
      id: string;
      name: string;
      email: string;
    };
  };
};

const formatPercent = (value: number) => {
  return Number.isInteger(value) ? value.toString() : value.toFixed(2);
};

const getTotalIncomeShare = (artistShare: number, labelShare: number) => {
  const artistsPool = 100 - labelShare;

  return (artistsPool * artistShare) / 100;
};

const ArtistInvites = () => {
  const queryClient = useQueryClient();

  const {
    data,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ['artist-invites'],
    queryFn: artistService.getInvites,
  });

  const invites: Invite[] = data?.invites ?? [];

  const respondMutation = useMutation({
    mutationFn: ({
      trackId,
      action,
    }: {
      trackId: string;
      action: 'accept' | 'dispute';
    }) => trackService.respondToSplit(trackId, action),

    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['artist-invites'] });
      queryClient.invalidateQueries({ queryKey: ['artist-tracks'] });
      queryClient.invalidateQueries({ queryKey: ['artist-dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['admin-tracks'] });
      queryClient.invalidateQueries({ queryKey: ['admin-dashboard-summary'] });
    },
  });

  const handleRespond = (trackId: string, action: 'accept' | 'dispute') => {
    respondMutation.mutate({ trackId, action });
  };

  if (isLoading) {
    return (
      <main className="artist-invites">
        <h1>Приглашения</h1>

        <p className="artist-invites__message">
          Загружаем приглашения...
        </p>
      </main>
    );
  }

  if (isError) {
    return (
      <main className="artist-invites">
        <h1>Приглашения</h1>

        <p className="artist-invites__message">
          Не удалось загрузить приглашения. Проверь, что backend запущен и ты вошла как артист.
        </p>
      </main>
    );
  }

  return (
    <main className="artist-invites">
      <h1>Приглашения</h1>

      <section className="artist-invites__list">
        {invites.length > 0 ? (
          invites.map((invite) => {
            const ownerName = invite.track.owner?.name || 'Артист';
            const artistShare = invite.share;
            const totalIncomeShare = getTotalIncomeShare(
              artistShare,
              invite.track.labelShare,
            );

            const isCurrentInvitePending =
              respondMutation.isPending &&
              respondMutation.variables?.trackId === invite.track.id;

            return (
              <article className="artist-invites__card" key={invite.id}>
                <p className="artist-invites__title">
                  {ownerName} добавил(а) Вас на трек «{invite.track.title}» как featured артиста.
                </p>

                <div className="artist-invites__bottom">
                  <p className="artist-invites__description">
                    Вам предложена доля:{' '}
                    <strong>{formatPercent(totalIncomeShare)}%</strong> от общего дохода трека{' '}
                    <span>
                      или {formatPercent(artistShare)}% от доли артистов
                    </span>
                  </p>

                  <div className="artist-invites__actions">
                    <button
                      type="button"
                      disabled={isCurrentInvitePending}
                      onClick={() => handleRespond(invite.track.id, 'accept')}
                    >
                      Принять
                    </button>

                    <button
                      type="button"
                      disabled={isCurrentInvitePending}
                      onClick={() => handleRespond(invite.track.id, 'dispute')}
                    >
                      Отклонить
                    </button>
                  </div>
                </div>
              </article>
            );
          })
        ) : (
          <div className="artist-invites__empty">
            Новых приглашений пока нет.
          </div>
        )}
      </section>
    </main>
  );
};

export default ArtistInvites;