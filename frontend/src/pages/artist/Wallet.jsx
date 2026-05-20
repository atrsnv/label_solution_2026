import { useMemo, useState } from 'react';
import {
  Typography, Statistic, Button, Modal, InputNumber, App, Space, Tag, Row, Col, Empty, Card,
} from 'antd';
import {
  WalletOutlined,
  RiseOutlined,
  FallOutlined,
} from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { artistApi } from '../../services/artist';

const payoutColor = { REQUESTED: 'gold', PAID: 'green', REJECTED: 'red' };

function fmt(v) {
  return Number(v || 0).toLocaleString('ru-RU', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function formatDate(d) {
  return new Date(d).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short', year: 'numeric' });
}

export default function Wallet() {
  const qc = useQueryClient();
  const { message } = App.useApp();
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState(0);

  const { data, isLoading } = useQuery({
    queryKey: ['my-wallet'],
    queryFn: artistApi.wallet,
  });

  const mut = useMutation({
    mutationFn: artistApi.withdraw,
    onSuccess: () => {
      message.success('Запрос на вывод создан');
      setOpen(false);
      qc.invalidateQueries({ queryKey: ['my-wallet'] });
      qc.invalidateQueries({ queryKey: ['artist-dashboard'] });
    },
    onError: (e) => message.error(e.response?.data?.error || 'Ошибка'),
  });

  const periodLabel = useMemo(() => {
    const d = new Date();
    return d.toLocaleDateString('ru-RU', { month: 'long', year: 'numeric' });
  }, []);

  const earnings = data?.earnings || [];
  const payouts = data?.payouts || [];

  const totalCredits = earnings.reduce((s, e) => s + Number(e.amount || 0), 0);
  const totalDeductions = payouts.reduce((s, p) => s + Number(p.amount || 0), 0);

  return (
    <>
      <Row gutter={[16, 16]}>
        <Col xs={24} md={8}>
          <div className="section-card" style={{ height: '100%' }}>
            <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>Доступно к выводу</div>
            <div style={{ fontSize: 36, fontWeight: 700, marginTop: 6 }} className="num">
              {fmt(data?.balance)} ₽
            </div>
            <Button
              type="primary"
              icon={<WalletOutlined />}
              style={{ marginTop: 16 }}
              onClick={() => { setAmount(data?.balance || 0); setOpen(true); }}
              disabled={!data?.balance}
              block
              size="large"
            >
              Запросить вывод
            </Button>
          </div>
        </Col>
        <Col xs={24} md={8}>
          <div className="section-card" style={{ height: '100%' }}>
            <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>Всего начислено</div>
            <div style={{ fontSize: 36, fontWeight: 700, marginTop: 6 }} className="amount-pos">
              +{fmt(totalCredits)} ₽
            </div>
            <div style={{ marginTop: 16, color: 'var(--text-muted)', fontSize: 13 }}>
              За {earnings.length} начислений
            </div>
          </div>
        </Col>
        <Col xs={24} md={8}>
          <div className="section-card" style={{ height: '100%' }}>
            <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>Всего к выводу / выплачено</div>
            <div style={{ fontSize: 36, fontWeight: 700, marginTop: 6 }} className="amount-neg">
              −{fmt(totalDeductions)} ₽
            </div>
            <div style={{ marginTop: 16, color: 'var(--text-muted)', fontSize: 13 }}>
              {payouts.length} запросов на вывод
            </div>
          </div>
        </Col>
      </Row>

      {/* Карточка периода в стиле макета */}
      <div className="section-card" style={{ marginTop: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <div>
            <Typography.Title level={4} style={{ margin: 0, textTransform: 'capitalize' }}>
              {periodLabel}
            </Typography.Title>
            <div style={{ color: 'var(--text-muted)', fontSize: 13, marginTop: 4 }}>
              История по вашему артистскому балансу
            </div>
          </div>
          <span className="pill">paid</span>
        </div>

        {/* Recoupable Costs / Запросы на вывод */}
        <h3 className="section-title" style={{ marginTop: 24 }}>
          <FallOutlined style={{ color: 'var(--red)' }} /> Запросы на вывод
        </h3>
        {payouts.length === 0 ? (
          <Empty description="Нет запросов" image={Empty.PRESENTED_IMAGE_SIMPLE} />
        ) : (
          <FinanceTable
            head={['Описание', 'Дата', 'Сумма']}
            rows={payouts.map((p) => [
              <span key="d">Вывод средств</span>,
              formatDate(p.createdAt),
              <span key="a" className="amount-neg">−{fmt(p.amount)} ₽</span>,
              <Tag key="t" color={payoutColor[p.status]}>{p.status}</Tag>,
            ])}
            totalLabel="Total Deductions"
            totalValue={<span className="amount-neg">−{fmt(totalDeductions)} ₽</span>}
          />
        )}

        {/* Credits / Начисления */}
        <h3 className="section-title" style={{ marginTop: 32 }}>
          <RiseOutlined style={{ color: 'var(--green)' }} /> Начисления
        </h3>
        {earnings.length === 0 ? (
          <Empty description={isLoading ? 'Загрузка…' : 'Пока тишина'} image={Empty.PRESENTED_IMAGE_SIMPLE} />
        ) : (
          <FinanceTable
            head={['Трек', 'Период', 'Дата', 'Сумма']}
            rows={earnings.map((e) => [
              <span key="t">{e.track?.title || '—'}</span>,
              <span key="p" style={{ color: 'var(--text-muted)' }}>{e.period || '—'}</span>,
              formatDate(e.createdAt),
              <span key="a" className="amount-pos">+{fmt(e.amount)} ₽</span>,
            ])}
            totalLabel="Total Credits"
            totalValue={<span className="amount-pos">+{fmt(totalCredits)} ₽</span>}
          />
        )}
      </div>

      <Modal
        title="Запрос на вывод"
        open={open}
        onCancel={() => setOpen(false)}
        onOk={() => mut.mutate(amount)}
        confirmLoading={mut.isPending}
        okText="Запросить"
        cancelText="Отмена"
      >
        <Space direction="vertical" style={{ width: '100%' }}>
          <span>Доступно: <b>{fmt(data?.balance)} ₽</b></span>
          <InputNumber
            value={amount}
            onChange={setAmount}
            min={0.01}
            max={data?.balance || 0}
            style={{ width: '100%' }}
            addonAfter="₽"
          />
        </Space>
      </Modal>
    </>
  );
}

/** Простая «финансовая» таблица под стиль макета. */
function FinanceTable({ head, rows, totalLabel, totalValue }) {
  const cols = head.length;
  return (
    <div
      style={{
        border: '1px solid var(--border)',
        borderRadius: 12,
        overflow: 'hidden',
        background: 'rgba(255,255,255,0.02)',
      }}
    >
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: `2fr ${'1fr '.repeat(cols - 2)}1fr`,
          padding: '12px 16px',
          color: 'var(--text-muted)',
          fontSize: 13,
          borderBottom: '1px solid var(--border)',
        }}
      >
        {head.map((h, i) => (
          <div key={i} style={{ textAlign: i === head.length - 1 ? 'right' : 'left' }}>{h}</div>
        ))}
      </div>
      {rows.map((cells, rIdx) => (
        <div
          key={rIdx}
          style={{
            display: 'grid',
            gridTemplateColumns: `2fr ${'1fr '.repeat(cols - 2)}1fr`,
            padding: '14px 16px',
            borderBottom: rIdx === rows.length - 1 ? 0 : '1px solid var(--border)',
            alignItems: 'center',
          }}
        >
          {cells.slice(0, cols).map((c, i) => (
            <div key={i} style={{ textAlign: i === cols - 1 ? 'right' : 'left' }}>
              {c}
            </div>
          ))}
        </div>
      ))}
      {totalLabel && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: `2fr ${'1fr '.repeat(cols - 2)}1fr`,
            padding: '14px 16px',
            borderTop: '1px solid rgba(255,255,255,0.18)',
            fontWeight: 700,
          }}
        >
          <div>{totalLabel}</div>
          {Array.from({ length: cols - 2 }).map((_, i) => <div key={i} />)}
          <div style={{ textAlign: 'right' }}>{totalValue}</div>
        </div>
      )}
    </div>
  );
}
