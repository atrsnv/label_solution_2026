import { Row, Col, Card, Statistic, Table, Typography, Empty } from 'antd';
import { useQuery } from '@tanstack/react-query';
import { adminApi } from '../../services/admin';

const moneyFormatter = (value) => {
  const amount = Math.abs(Number(value)) < 0.005 ? 0 : Number(value);
  return `${amount.toLocaleString('ru-RU', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} ₽`;
};

export default function AdminDashboard() {
  const { data, isLoading } = useQuery({
    queryKey: ['admin-analytics'],
    queryFn: adminApi.analytics,
  });
  const summary = data?.summary || {};
  const maxArtist = Math.max(...(data?.byArtist || []).map((item) => item.amount), 1);
  const maxTrack = Math.max(...(data?.byTrack || []).map((item) => item.amount), 1);
  const maxMonth = Math.max(...(data?.byMonth || []).map((item) => item.amount), 1);

  return (
    <>
      <Typography.Title level={3} style={{ marginTop: 0 }}>Главный дашборд</Typography.Title>

      <Row gutter={[16, 16]}>
        <Col xs={12} md={6}>
          <Card loading={isLoading}>
            <Statistic title="Артистов" value={summary.artistsCount || 0} />
          </Card>
        </Col>
        <Col xs={12} md={6}>
          <Card loading={isLoading}>
            <Statistic title="Треков" value={summary.tracksCount || 0} suffix={`/ ${summary.approvedTracks || 0} approved`} />
          </Card>
        </Col>
        <Col xs={12} md={6}>
          <Card loading={isLoading}>
            <Statistic title="Всего начислено артистам" value={summary.totalEarnings || 0} formatter={moneyFormatter} />
          </Card>
        </Col>
        <Col xs={12} md={6}>
          <Card loading={isLoading}>
            <Statistic title="К выплате (запросы)" value={summary.pendingPayouts || 0} formatter={moneyFormatter} />
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        <Col xs={24} lg={12}>
          <Card title="Доход по артистам" loading={isLoading}>
            {data?.byArtist?.length ? (
              <div className="analytics-track-list">
                {data.byArtist.slice(0, 6).map((item, index) => (
                  <div className="analytics-track" key={item.artistId}>
                    <div className="analytics-track-head">
                      <span>{index + 1}. {item.artistName}</span>
                      <strong>{moneyFormatter(item.amount)}</strong>
                    </div>
                    <div className="analytics-bar-track compact">
                      <div
                        className="analytics-bar-fill"
                        style={{ width: `${Math.max((item.amount / maxArtist) * 100, 4)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            ) : <Empty description="Пока нет начислений" />}
          </Card>
        </Col>
        <Col xs={24} lg={12}>
          <Card title="Доход по трекам" loading={isLoading}>
            {data?.byTrack?.length ? (
              <div className="analytics-track-list">
                {data.byTrack.slice(0, 6).map((item, index) => (
                  <div className="analytics-track" key={item.trackId}>
                    <div className="analytics-track-head">
                      <span>{index + 1}. {item.trackTitle}</span>
                      <strong>{moneyFormatter(item.amount)}</strong>
                    </div>
                    <div className="analytics-bar-track compact">
                      <div
                        className="analytics-bar-fill alt"
                        style={{ width: `${Math.max((item.amount / maxTrack) * 100, 4)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            ) : <Empty description="Пока нет начислений" />}
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        <Col xs={24} lg={12}>
          <Card title="Доход по периодам" loading={isLoading}>
            {data?.byMonth?.length ? (
              <div className="analytics-bars">
                {data.byMonth.map((item) => (
                  <div className="analytics-bar-row" key={item.period}>
                    <span className="analytics-bar-label">{item.period}</span>
                    <div className="analytics-bar-track">
                      <div
                        className="analytics-bar-fill"
                        style={{ width: `${Math.max((item.amount / maxMonth) * 100, 4)}%` }}
                      />
                    </div>
                    <span className="analytics-bar-value">{moneyFormatter(item.amount)}</span>
                  </div>
                ))}
              </div>
            ) : <Empty description="Пока нет начислений" />}
          </Card>
        </Col>
        <Col xs={24} lg={12}>
          <Card title="Последние начисления" loading={isLoading}>
            <Table
              size="small"
              rowKey="id"
              pagination={false}
              dataSource={data?.lastEarnings || []}
              columns={[
                { title: 'Артист', dataIndex: 'artistName' },
                { title: 'Трек', dataIndex: 'trackTitle' },
                { title: 'Период', dataIndex: 'period', width: 110 },
                {
                  title: 'Сумма',
                  dataIndex: 'amount',
                  width: 140,
                  align: 'right',
                  render: (value) => <span className="amount-pos">{moneyFormatter(value)}</span>,
                },
              ]}
              locale={{ emptyText: <Empty description="Пока нет начислений" /> }}
            />
          </Card>
        </Col>
      </Row>

    </>
  );
}
