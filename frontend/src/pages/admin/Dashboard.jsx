import { Row, Col, Card, Statistic, Table, Typography, Empty } from 'antd';
import { useQuery } from '@tanstack/react-query';
import { adminApi } from '../../services/admin';

export default function AdminDashboard() {
  const { data, isLoading } = useQuery({
    queryKey: ['admin-summary'],
    queryFn: adminApi.dashboardSummary,
  });

  const datalensUrl = import.meta.env.VITE_DATALENS_ADMIN_URL;

  return (
    <>
      <Typography.Title level={3} style={{ marginTop: 0 }}>Главный дашборд</Typography.Title>

      <Row gutter={[16, 16]}>
        <Col xs={12} md={6}>
          <Card loading={isLoading}>
            <Statistic title="Артистов" value={data?.artistsCount || 0} />
          </Card>
        </Col>
        <Col xs={12} md={6}>
          <Card loading={isLoading}>
            <Statistic title="Треков" value={data?.tracksCount || 0} suffix={`/ ${data?.approvedTracks || 0} approved`} />
          </Card>
        </Col>
        <Col xs={12} md={6}>
          <Card loading={isLoading}>
            <Statistic title="Всего начислено артистам" precision={2} value={data?.totalEarnings || 0} suffix="₽" />
          </Card>
        </Col>
        <Col xs={12} md={6}>
          <Card loading={isLoading}>
            <Statistic title="К выплате (запросы)" precision={2} value={data?.pendingPayouts || 0} suffix="₽" />
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        <Col xs={24} md={10}>
          <Card title="Топ-артисты по балансу" loading={isLoading}>
            <Table
              size="small"
              pagination={false}
              rowKey="id"
              dataSource={data?.topArtists || []}
              columns={[
                { title: 'Артист', dataIndex: 'name' },
                { title: 'Баланс, ₽', dataIndex: 'balance', render: (v) => v.toFixed(2) },
              ]}
              locale={{ emptyText: <Empty description="Пока пусто" /> }}
            />
          </Card>
        </Col>
        <Col xs={24} md={14}>
          <Card title="Yandex DataLens" bodyStyle={{ padding: 0 }}>
            {datalensUrl ? (
              <iframe
                title="DataLens admin"
                src={datalensUrl}
                style={{ width: '100%', height: 480, border: 0 }}
              />
            ) : (
              <div style={{ padding: 32, textAlign: 'center', color: '#888' }}>
                Установите <code>VITE_DATALENS_ADMIN_URL</code> в <code>.env</code>, чтобы встроить дашборд.
              </div>
            )}
          </Card>
        </Col>
      </Row>
    </>
  );
}
