import { Table, Typography, Tag } from 'antd';
import { useQuery } from '@tanstack/react-query';
import { adminApi } from '../../services/admin';

const statusColor = { PENDING: 'orange', APPROVED: 'green', ERROR: 'red' };

export default function AdminTracks() {
  const { data, isLoading } = useQuery({
    queryKey: ['admin-all-tracks'],
    queryFn: adminApi.listAllTracks,
  });

  const columns = [
    { title: 'Название', dataIndex: 'title' },
    { title: 'Артист (владелец)', dataIndex: ['owner', 'name'] },
    {
      title: 'Лейбл, %',
      dataIndex: 'labelShare',
      render: (v) => <Tag color="purple">{v}%</Tag>,
    },
    {
      title: 'Статус сплита',
      dataIndex: 'status',
      filters: [
        { text: 'На согласовании', value: 'PENDING' },
        { text: 'Утверждён', value: 'APPROVED' },
        { text: 'Ошибка', value: 'ERROR' },
      ],
      onFilter: (val, r) => r.status === val,
      render: (s) => <Tag color={statusColor[s]}>{s}</Tag>,
    },
    {
      title: 'Участники',
      key: 'splits',
      render: (_, r) =>
        r.splits.map((s) => (
          <Tag key={s.id} color={s.status === 'ACCEPTED' ? 'green' : s.status === 'DISPUTED' ? 'red' : 'gold'}>
            {s.user?.name}: {s.share}% ({s.status})
          </Tag>
        )),
    },
    {
      title: 'Дата релиза',
      dataIndex: 'releaseDate',
      render: (d) => new Date(d).toLocaleDateString(),
    },
  ];

  return (
    <>
      <Typography.Title level={3} style={{ marginTop: 0 }}>Реестр треков</Typography.Title>
      <Table
        rowKey="id"
        loading={isLoading}
        dataSource={data?.tracks || []}
        columns={columns}
      />
    </>
  );
}
