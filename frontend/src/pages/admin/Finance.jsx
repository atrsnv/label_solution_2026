import { useState } from 'react';
import { Upload, Button, Typography, Table, Tag, App, Card, Space, Alert, Drawer, List } from 'antd';
import { InboxOutlined, DollarOutlined } from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminApi } from '../../services/admin';

export default function AdminFinance() {
  const qc = useQueryClient();
  const { message } = App.useApp();
  const [lastResult, setLastResult] = useState(null);
  const [openReportId, setOpenReportId] = useState(null);

  const { data: reportsData, isLoading } = useQuery({
    queryKey: ['admin-reports'],
    queryFn: adminApi.listReports,
  });

  const { data: reportDetails } = useQuery({
    queryKey: ['admin-report', openReportId],
    queryFn: () => adminApi.getReport(openReportId),
    enabled: !!openReportId,
  });

  const importMut = useMutation({
    mutationFn: adminApi.importReport,
    onSuccess: (data) => {
      setLastResult(data);
      message.success(`Импорт завершён: ${data.processedRows} строк`);
      qc.invalidateQueries({ queryKey: ['admin-reports'] });
      qc.invalidateQueries({ queryKey: ['admin-summary'] });
    },
    onError: (e) => message.error(e.response?.data?.error || 'Ошибка импорта'),
  });

  return (
    <>
      <Typography.Title level={3} style={{ marginTop: 0 }}>Финансы и импорт</Typography.Title>

      <Card title="Загрузка отчёта дистрибьютора" style={{ marginBottom: 16 }}>
        <Upload.Dragger
          name="file"
          multiple={false}
          accept=".csv,.xlsx,.xls"
          beforeUpload={(file) => {
            importMut.mutate(file);
            return false; // не выгружать сам, мы делаем это руками
          }}
          showUploadList={false}
        >
          <p className="ant-upload-drag-icon"><InboxOutlined /></p>
          <p className="ant-upload-text">Перетащите CSV / XLSX от дистрибьютора сюда</p>
          <p className="ant-upload-hint">
            Колонки: <code>trackId, amount, period</code> или <code>trackTitle, artistEmail, amount, period</code>.
          </p>
        </Upload.Dragger>

        <Space style={{ marginTop: 12 }}>
          <Button
            type="primary"
            icon={<DollarOutlined />}
            disabled
            title="Расчёт выплат запускается автоматически при импорте"
          >
            Рассчитать выплаты
          </Button>
          {importMut.isPending && <span>Импортируем…</span>}
        </Space>

        {lastResult && (
          <Alert
            style={{ marginTop: 16 }}
            type={lastResult.skippedRows ? 'warning' : 'success'}
            showIcon
            message={`Обработано ${lastResult.processedRows} строк, пропущено ${lastResult.skippedRows}`}
            description={
              lastResult.errors?.length ? (
                <ul style={{ margin: 0, paddingLeft: 18 }}>
                  {lastResult.errors.slice(0, 10).map((e, i) => (
                    <li key={i}>Строка {e.row}: {e.reason}</li>
                  ))}
                </ul>
              ) : null
            }
          />
        )}
      </Card>

      <Card title="История выгрузок">
        <Table
          rowKey="id"
          loading={isLoading}
          dataSource={reportsData?.reports || []}
          columns={[
            { title: 'Файл', dataIndex: 'filename' },
            { title: 'Строк', dataIndex: 'rowsCount' },
            {
              title: 'Сумма',
              dataIndex: 'totalAmount',
              render: (v) => <Tag color="purple">{Number(v).toFixed(2)} ₽</Tag>,
            },
            {
              title: 'Дата',
              dataIndex: 'createdAt',
              render: (d) => new Date(d).toLocaleString(),
            },
            {
              title: '',
              render: (_, r) => <Button onClick={() => setOpenReportId(r.id)}>Подробнее</Button>,
            },
          ]}
        />
      </Card>

      <Drawer
        width={600}
        title={reportDetails?.report?.filename}
        open={!!openReportId}
        onClose={() => setOpenReportId(null)}
      >
        {reportDetails?.report && (
          <List
            size="small"
            dataSource={reportDetails.report.earnings || []}
            renderItem={(e) => (
              <List.Item>
                <List.Item.Meta
                  title={`${e.track?.title} → ${e.user?.name}`}
                  description={`${Number(e.amount).toFixed(2)} ₽ · ${e.period || '—'}`}
                />
              </List.Item>
            )}
          />
        )}
      </Drawer>
    </>
  );
}
