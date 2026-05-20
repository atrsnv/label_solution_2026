import { useState } from 'react';
import {
  Table, Button, Space, Typography, Modal, Form, Input, InputNumber, App, Tag, Drawer, Descriptions,
} from 'antd';
import { PlusOutlined, LinkOutlined } from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminApi } from '../../services/admin';

export default function AdminArtists() {
  const qc = useQueryClient();
  const { message } = App.useApp();
  const [inviteOpen, setInviteOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [inviteResult, setInviteResult] = useState(null);
  const [selectedId, setSelectedId] = useState(null);

  const { data, isLoading } = useQuery({
    queryKey: ['admin-artists'],
    queryFn: adminApi.listArtists,
  });

  const { data: details } = useQuery({
    queryKey: ['admin-artist', selectedId],
    queryFn: () => adminApi.getArtist(selectedId),
    enabled: !!selectedId,
  });

  const createMut = useMutation({
    mutationFn: adminApi.createArtist,
    onSuccess: () => {
      message.success('Артист создан');
      setCreateOpen(false);
      qc.invalidateQueries({ queryKey: ['admin-artists'] });
    },
    onError: (e) => message.error(e.response?.data?.error || 'Ошибка'),
  });

  const inviteMut = useMutation({
    mutationFn: adminApi.createInvite,
    onSuccess: (data) => {
      setInviteResult(data.invite);
      message.success('Инвайт создан');
    },
    onError: (e) => message.error(e.response?.data?.error || 'Ошибка'),
  });

  const updateMut = useMutation({
    mutationFn: ({ id, data }) => adminApi.updateArtist(id, data),
    onSuccess: () => {
      message.success('Сохранено');
      qc.invalidateQueries({ queryKey: ['admin-artists'] });
      qc.invalidateQueries({ queryKey: ['admin-artist', selectedId] });
    },
  });

  const columns = [
    { title: 'Имя', dataIndex: 'name' },
    { title: 'Email', dataIndex: 'email' },
    {
      title: 'Лейбл, %',
      dataIndex: 'labelShare',
      render: (v) => <Tag color="purple">{v}%</Tag>,
    },
    {
      title: 'Баланс, ₽',
      dataIndex: 'balance',
      render: (v) => v.toFixed(2),
    },
    {
      title: 'Треков',
      dataIndex: ['_count', 'ownedTracks'],
    },
    {
      title: '',
      key: 'actions',
      render: (_, r) => <Button onClick={() => setSelectedId(r.id)}>Открыть</Button>,
    },
  ];

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
        <Typography.Title level={3} style={{ margin: 0 }}>Артисты лейбла</Typography.Title>
        <Space>
          <Button icon={<LinkOutlined />} onClick={() => { setInviteResult(null); setInviteOpen(true); }}>
            Инвайт-ссылка
          </Button>
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setCreateOpen(true)}>
            Добавить артиста
          </Button>
        </Space>
      </div>

      <Table
        rowKey="id"
        loading={isLoading}
        columns={columns}
        dataSource={data?.artists || []}
      />

      {/* Создание артиста с временным паролем */}
      <Modal
        title="Добавить артиста"
        open={createOpen}
        onCancel={() => setCreateOpen(false)}
        footer={null}
        destroyOnClose
      >
        <Form layout="vertical" onFinish={createMut.mutate}>
          <Form.Item name="name" label="Имя" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="email" label="Email" rules={[{ required: true, type: 'email' }]}>
            <Input />
          </Form.Item>
          <Form.Item name="password" label="Временный пароль" rules={[{ required: true, min: 6 }]}>
            <Input.Password />
          </Form.Item>
          <Form.Item name="labelShare" label="Доля лейбла, %" initialValue={30}>
            <InputNumber min={0} max={100} style={{ width: '100%' }} />
          </Form.Item>
          <Button type="primary" htmlType="submit" loading={createMut.isPending} block>
            Создать
          </Button>
        </Form>
      </Modal>

      {/* Создание инвайт-ссылки */}
      <Modal
        title="Создать инвайт-ссылку"
        open={inviteOpen}
        onCancel={() => setInviteOpen(false)}
        footer={null}
        destroyOnClose
      >
        {!inviteResult ? (
          <Form layout="vertical" onFinish={inviteMut.mutate}>
            <Form.Item name="email" label="Email (необязательно)">
              <Input />
            </Form.Item>
            <Button type="primary" htmlType="submit" loading={inviteMut.isPending} block>
              Сгенерировать
            </Button>
          </Form>
        ) : (
          <div>
            <p>Передайте артисту ссылку:</p>
            <Input.TextArea
              readOnly
              autoSize
              value={`${location.origin}${inviteResult.path}`}
            />
            <p style={{ marginTop: 8, color: '#888', fontSize: 12 }}>
              Действительна до {new Date(inviteResult.expiresAt).toLocaleString()}.
            </p>
          </div>
        )}
      </Modal>

      {/* Карточка артиста */}
      <Drawer
        width={520}
        title={details?.artist?.name || 'Артист'}
        open={!!selectedId}
        onClose={() => setSelectedId(null)}
      >
        {details?.artist && (
          <>
            <Descriptions column={1} bordered size="small">
              <Descriptions.Item label="Email">{details.artist.email}</Descriptions.Item>
              <Descriptions.Item label="Баланс">{details.artist.balance.toFixed(2)} ₽</Descriptions.Item>
              <Descriptions.Item label="Треков">{details.artist.ownedTracks?.length || 0}</Descriptions.Item>
            </Descriptions>

            <Typography.Title level={5} style={{ marginTop: 24 }}>Доля лейбла</Typography.Title>
            <Form
              layout="inline"
              initialValues={{ labelShare: details.artist.labelShare }}
              onFinish={(v) => updateMut.mutate({ id: details.artist.id, data: v })}
            >
              <Form.Item name="labelShare" rules={[{ required: true }]}>
                <InputNumber min={0} max={100} addonAfter="%" />
              </Form.Item>
              <Button type="primary" htmlType="submit" loading={updateMut.isPending}>
                Сохранить
              </Button>
            </Form>

            <Typography.Title level={5} style={{ marginTop: 24 }}>Треки</Typography.Title>
            <Table
              size="small"
              rowKey="id"
              pagination={false}
              dataSource={details.artist.ownedTracks || []}
              columns={[
                { title: 'Название', dataIndex: 'title' },
                { title: 'Статус', dataIndex: 'status', render: (s) => <Tag>{s}</Tag> },
              ]}
            />
          </>
        )}
      </Drawer>
    </>
  );
}
