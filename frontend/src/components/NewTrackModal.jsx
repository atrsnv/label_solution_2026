import { Modal, Form, Input, DatePicker, InputNumber, Button, Space, Alert, App, Typography, Divider } from 'antd';
import { MinusCircleOutlined, PlusOutlined } from '@ant-design/icons';
import { useMutation } from '@tanstack/react-query';
import { tracksApi } from '../services/tracks';
import { useAuthStore } from '../context/authStore';

export default function NewTrackModal({ open, onClose, onCreated }) {
  const { user } = useAuthStore();
  const { message } = App.useApp();
  const [form] = Form.useForm();

  const labelShare = user?.labelShare ?? 30;
  const artistsPool = 100 - labelShare;

  const splits = Form.useWatch('splits', form) || [];
  const splitSum = splits.reduce((s, x) => s + Number(x?.share || 0), 0);
  const sumValid = Math.abs(splitSum - 100) < 0.01;

  const mut = useMutation({
    mutationFn: tracksApi.create,
    onSuccess: () => {
      message.success('Трек отправлен на согласование');
      form.resetFields();
      onCreated?.();
      onClose();
    },
    onError: (e) => message.error(e.response?.data?.error || 'Ошибка создания'),
  });

  const handleSubmit = (values) => {
    const splitsPayload = values.splits.map((s) => {
      const isSelf = s.email?.toLowerCase() === user.email.toLowerCase();
      return isSelf
        ? { userId: user.id, share: Number(s.share) }
        : { email: s.email, share: Number(s.share) };
    });
    mut.mutate({
      title: values.title,
      coverUrl: values.coverUrl || null,
      releaseDate: values.releaseDate.toISOString(),
      splits: splitsPayload,
    });
  };

  return (
    <Modal
      title="Новый релиз"
      open={open}
      onCancel={onClose}
      footer={null}
      destroyOnClose
      width={640}
    >
      <Form
        form={form}
        layout="vertical"
        onFinish={handleSubmit}
        initialValues={{
          splits: [{ email: user?.email, share: 100 }],
        }}
      >
        <Form.Item name="title" label="Название трека" rules={[{ required: true }]}>
          <Input />
        </Form.Item>
        <Form.Item name="coverUrl" label="Обложка (URL)">
          <Input placeholder="https://…" />
        </Form.Item>
        <Form.Item name="releaseDate" label="Дата релиза" rules={[{ required: true }]}>
          <DatePicker style={{ width: '100%' }} />
        </Form.Item>

        <Divider />

        <Alert
          type="info"
          showIcon
          message={`Доля лейбла: ${labelShare}% (зафиксировано админом)`}
          description={`Оставшиеся ${artistsPool}% вы делите между собой и фитами. Сумма долей ниже должна быть 100% от этой части.`}
          style={{ marginBottom: 16 }}
        />

        <Typography.Title level={5}>Сплит между артистами</Typography.Title>
        <Form.List name="splits">
          {(fields, { add, remove }) => (
            <>
              {fields.map(({ key, name }) => (
                <Space key={key} align="baseline" style={{ display: 'flex', marginBottom: 8 }}>
                  <Form.Item
                    name={[name, 'email']}
                    rules={[{ required: true, type: 'email', message: 'email' }]}
                    style={{ flex: 1, marginBottom: 0 }}
                  >
                    <Input placeholder="email участника" style={{ width: 280 }} />
                  </Form.Item>
                  <Form.Item
                    name={[name, 'share']}
                    rules={[{ required: true }]}
                    style={{ marginBottom: 0 }}
                  >
                    <InputNumber min={0.01} max={100} addonAfter="%" step={5} />
                  </Form.Item>
                  {fields.length > 1 && (
                    <MinusCircleOutlined onClick={() => remove(name)} style={{ color: '#f5222d' }} />
                  )}
                </Space>
              ))}
              <Button
                type="dashed"
                onClick={() => add({ share: 0 })}
                icon={<PlusOutlined />}
                block
              >
                Добавить фит
              </Button>
            </>
          )}
        </Form.List>

        <Alert
          type={sumValid ? 'success' : 'error'}
          style={{ marginTop: 12 }}
          showIcon
          message={`Сумма долей: ${splitSum.toFixed(2)}% из 100%`}
        />

        <Button
          type="primary"
          htmlType="submit"
          loading={mut.isPending}
          disabled={!sumValid}
          block
          style={{ marginTop: 16 }}
        >
          Отправить на согласование
        </Button>
      </Form>
    </Modal>
  );
}
