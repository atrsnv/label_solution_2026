import { Row, Col, Card, Statistic, Typography, Table, Empty } from 'antd';
import { useQuery } from '@tanstack/react-query';
import { artistApi } from '../../services/artist';

const moneyFormatter = (value) => {
  const amount = Math.abs(Number(value)) < 0.005 ? 0 : Number(value);
  return `${amount.toLocaleString('ru-RU', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} ₽`;
};

export default function ArtistDashboard() {
  const { data, isLoading } = useQuery({
    queryKey: ['artist-analytics'],
    queryFn: artistApi.analytics,
  });
  const summary = data?.summary || {};
  const maxMonth = Math.max(...(data?.byMonth || []).map((item) => item.amount), 1);
  const maxTrack = Math.max(...(data?.byTrack || []).map((item) => item.amount), 1);

  return (
    <>
      <Typography.Title level={3} style={{ marginTop: 0 }}>Моя аналитика</Typography.Title>

      <Row gutter={[16, 16]}>
        <Col xs={12} md={6}>
          <Card loading={isLoading}>
            <Statistic title="Баланс" value={summary.balance || 0} formatter={moneyFormatter} />
          </Card>
        </Col>
        <Col xs={12} md={6}>
          <Card loading={isLoading}>
            <Statistic title="Всего заработано" value={summary.totalEarned || 0} formatter={moneyFormatter} />
          </Card>
        </Col>
        <Col xs={12} md={6}>
          <Card loading={isLoading}>
            <Statistic title="Треков" value={summary.tracksCount || 0} suffix={`/ ${summary.approvedTracksCount || 0}`} />
          </Card>
        </Col>
        <Col xs={12} md={6}>
          <Card loading={isLoading}>
            <Statistic title="Доля лейбла" value={summary.labelShare || 0} suffix="%" />
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
            ) : <Empty description="Нет начислений" />}
          </Card>
        </Col>
        <Col xs={24} lg={12}>
          <Card title="Доход по трекам" loading={isLoading}>
            {data?.byTrack?.length ? (
              <div className="analytics-track-list">
                {data.byTrack.map((item, index) => (
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
            ) : <Empty description="Нет начислений" />}
          </Card>
        </Col>
      </Row>

      <Card title="Последние начисления" loading={isLoading} style={{ marginTop: 16 }}>
        <Table
          size="small"
          rowKey="id"
          pagination={false}
          dataSource={data?.lastEarnings || []}
          columns={[
            { title: 'Трек', dataIndex: 'trackTitle' },
            { title: 'Период', dataIndex: 'period', width: 140 },
            {
              title: 'Сумма',
              dataIndex: 'amount',
              width: 160,
              align: 'right',
              render: (value) => <span className="amount-pos">{moneyFormatter(value)}</span>,
            },
          ]}
          locale={{ emptyText: <Empty description="Пока нет начислений" /> }}
        />
      </Card>

    </>
  );
}
