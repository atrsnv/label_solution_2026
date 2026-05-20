import { Typography, Card, Empty, Space, Button, Tag, App, Row, Col } from 'antd';
import { CheckOutlined, CloseOutlined } from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { artistApi } from '../../services/artist';
import { tracksApi } from '../../services/tracks';

export default function Invites() {
  const qc = useQueryClient();
  const { message } = App.useApp();

  const { data, isLoading } = useQuery({
    queryKey: ['my-invites'],
    queryFn: artistApi.myInvites,
  });

  const respondMut = useMutation({
    mutationFn: ({ trackId, action }) => tracksApi.respond(trackId, action),
    onSuccess: (_, vars) => {
      message.success(vars.action === 'accept' ? 'Принято' : 'Оспорено');
      qc.invalidateQueries({ queryKey: ['my-invites'] });
      qc.invalidateQueries({ queryKey: ['invites-count'] });
    },
    onError: (e) => message.error(e.response?.data?.error || 'Ошибка'),
  });

  const invites = data?.invites || [];

  return (
    <>
      <Typography.Title level={3} style={{ marginTop: 0 }}>Входящие фиты</Typography.Title>

      {isLoading ? null : invites.length === 0 ? (
        <Empty description="Никто не зовёт на фит" />
      ) : (
        <Row gutter={[16, 16]}>
          {invites.map((sp) => (
            <Col xs={24} md={12} key={sp.id}>
              <Card
                title={sp.track.title}
                extra={<Tag color={sp.status === 'DISPUTED' ? 'red' : 'gold'}>{sp.status}</Tag>}
              >
                <p>От: <b>{sp.track.owner?.name}</b> ({sp.track.owner?.email})</p>
                <p>Лейбл лейбла берёт: {sp.track.labelShare}%</p>
                <p>Ваша доля: <Tag color="purple">{sp.share}%</Tag> от артистской части</p>

                <p style={{ marginTop: 12, marginBottom: 4, color: '#888' }}>Полный сплит:</p>
                <Space size={[4, 4]} wrap>
                  {sp.track.splits.map((s) => (
                    <Tag
                      key={s.id}
                      color={s.status === 'ACCEPTED' ? 'green' : s.status === 'DISPUTED' ? 'red' : 'default'}
                    >
                      {s.user?.name}: {s.share}%
                    </Tag>
                  ))}
                </Space>

                <Space style={{ marginTop: 16 }}>
                  <Button
                    type="primary"
                    icon={<CheckOutlined />}
                    loading={respondMut.isPending && respondMut.variables?.trackId === sp.track.id && respondMut.variables?.action === 'accept'}
                    onClick={() => respondMut.mutate({ trackId: sp.track.id, action: 'accept' })}
                  >
                    Принять сплит
                  </Button>
                  <Button
                    danger
                    icon={<CloseOutlined />}
                    loading={respondMut.isPending && respondMut.variables?.trackId === sp.track.id && respondMut.variables?.action === 'dispute'}
                    onClick={() => respondMut.mutate({ trackId: sp.track.id, action: 'dispute' })}
                  >
                    Оспорить
                  </Button>
                </Space>
              </Card>
            </Col>
          ))}
        </Row>
      )}
    </>
  );
}
