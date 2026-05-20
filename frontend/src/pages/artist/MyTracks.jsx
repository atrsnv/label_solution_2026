import { useState } from 'react';
import { Row, Col, Card, Button, Typography, Tag, Empty, Space } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { artistApi } from '../../services/artist';
import NewTrackModal from '../../components/NewTrackModal';

const statusColor = { PENDING: 'orange', APPROVED: 'green', ERROR: 'red' };

export default function MyTracks() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const { data, isLoading } = useQuery({
    queryKey: ['my-tracks'],
    queryFn: artistApi.myTracks,
  });

  const tracks = data?.tracks || [];

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
        <Typography.Title level={3} style={{ margin: 0 }}>Мои треки</Typography.Title>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => setOpen(true)}>
          Создать новый релиз
        </Button>
      </div>

      {isLoading ? null : tracks.length === 0 ? (
        <Empty description="Пока ни одного релиза" />
      ) : (
        <Row gutter={[16, 16]}>
          {tracks.map((t) => (
            <Col xs={24} md={12} lg={8} key={t.id}>
              <Card
                cover={t.coverUrl ? <img alt={t.title} src={t.coverUrl} style={{ height: 180, objectFit: 'cover' }} /> : null}
                title={t.title}
                extra={<Tag color={statusColor[t.status]}>{t.status}</Tag>}
              >
                <p style={{ margin: 0, color: '#888' }}>
                  Релиз: {new Date(t.releaseDate).toLocaleDateString()}
                </p>
                <p style={{ marginTop: 8 }}>Лейбл: {t.labelShare}%</p>
                <Space size={[4, 4]} wrap>
                  {t.splits.map((s) => (
                    <Tag
                      key={s.id}
                      color={s.status === 'ACCEPTED' ? 'green' : s.status === 'DISPUTED' ? 'red' : 'gold'}
                    >
                      {s.user?.name}: {s.share}%
                    </Tag>
                  ))}
                </Space>
              </Card>
            </Col>
          ))}
        </Row>
      )}

      <NewTrackModal
        open={open}
        onClose={() => setOpen(false)}
        onCreated={() => qc.invalidateQueries({ queryKey: ['my-tracks'] })}
      />
    </>
  );
}
