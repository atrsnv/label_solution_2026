import { Row, Col, Card, Statistic, Typography, List, Empty } from 'antd';
import { useQuery } from '@tanstack/react-query';
import { artistApi } from '../../services/artist';

export default function ArtistDashboard() {
  const { data, isLoading } = useQuery({
    queryKey: ['artist-dashboard'],
    queryFn: artistApi.dashboard,
  });
  const datalensUrl = import.meta.env.VITE_DATALENS_ARTIST_URL;

  return (
    <>
      <Typography.Title level={3} style={{ marginTop: 0 }}>Моя аналитика</Typography.Title>

      <Row gutter={[16, 16]}>
        <Col xs={12} md={6}>
          <Card loading={isLoading}>
            <Statistic title="Баланс" precision={2} value={data?.balance || 0} suffix="₽" />
          </Card>
        </Col>
        <Col xs={12} md={6}>
          <Card loading={isLoading}>
            <Statistic title="Всего заработано" precision={2} value={data?.totalEarned || 0} suffix="₽" />
          </Card>
        </Col>
        <Col xs={12} md={6}>
          <Card loading={isLoading}>
            <Statistic title="Треков" value={data?.tracksCount || 0} suffix={`/ ${data?.approvedCount || 0}`} />
          </Card>
        </Col>
        <Col xs={12} md={6}>
          <Card loading={isLoading}>
            <Statistic title="Доля лейбла" value={data?.labelShare || 0} suffix="%" />
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        <Col xs={24} md={10}>
          <Card title="Последние начисления" loading={isLoading}>
            {data?.lastEarnings?.length ? (
              <List
                size="small"
                dataSource={data.lastEarnings}
                renderItem={(e) => (
                  <List.Item>
                    <List.Item.Meta
                      title={e.track?.title}
                      description={`${Number(e.amount).toFixed(2)} ₽ · ${e.period || '—'}`}
                    />
                  </List.Item>
                )}
              />
            ) : (
              <Empty description="Пока тишина" />
            )}
          </Card>
        </Col>
        <Col xs={24} md={14}>
          <Card title="Yandex DataLens" bodyStyle={{ padding: 0 }}>
            {datalensUrl ? (
              <iframe
                title="DataLens artist"
                src={datalensUrl}
                style={{ width: '100%', height: 480, border: 0 }}
              />
            ) : (
              <div style={{ padding: 32, textAlign: 'center', color: '#888' }}>
                Установите <code>VITE_DATALENS_ARTIST_URL</code> в <code>.env</code> (используйте параметр фильтра по userId).
              </div>
            )}
          </Card>
        </Col>
      </Row>
    </>
  );
}
