import { Layout, Menu, Button, Space, Typography, Badge } from 'antd';
import {
  DashboardOutlined,
  CustomerServiceOutlined,
  InboxOutlined,
  WalletOutlined,
  LogoutOutlined,
} from '@ant-design/icons';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { artistApi } from '../services/artist';
import { useAuthStore } from '../context/authStore';

const { Header, Sider, Content } = Layout;

export default function ArtistLayout() {
  const nav = useNavigate();
  const loc = useLocation();
  const { user, logout } = useAuthStore();

  const { data: invitesData } = useQuery({
    queryKey: ['invites-count'],
    queryFn: artistApi.myInvites,
    refetchInterval: 30000,
  });
  const invitesCount = invitesData?.invites?.length || 0;

  const items = [
    { key: '/artist/dashboard', icon: <DashboardOutlined />, label: 'Моя аналитика' },
    { key: '/artist/tracks', icon: <CustomerServiceOutlined />, label: 'Мои треки' },
    {
      key: '/artist/invites',
      icon: <InboxOutlined />,
      label: (
        <span>
          Входящие фиты <Badge count={invitesCount} style={{ marginLeft: 8 }} />
        </span>
      ),
    },
    { key: '/artist/wallet', icon: <WalletOutlined />, label: 'Кошелёк' },
  ];

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider breakpoint="lg" collapsedWidth="0" theme="dark">
        <div className="app-logo">VAULT · ARTIST</div>
        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={[loc.pathname]}
          items={items}
          onClick={({ key }) => nav(key)}
        />
      </Sider>
      <Layout>
        <Header
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            paddingInline: 24,
            borderBottom: '1px solid rgba(255,255,255,0.06)',
          }}
        >
          <Typography.Title level={4} style={{ margin: 0 }}>Личный кабинет артиста</Typography.Title>
          <Space>
            <span style={{ color: 'var(--text-muted)' }}>{user?.name}</span>
            <Button icon={<LogoutOutlined />} onClick={() => { logout(); nav('/login'); }}>
              Выйти
            </Button>
          </Space>
        </Header>
        <Content style={{ margin: 24 }}>
          <div className="section-card" style={{ minHeight: '100%' }}>
            <Outlet />
          </div>
        </Content>
      </Layout>
    </Layout>
  );
}
