import { Layout, Menu, Button, Space, Typography } from 'antd';
import {
  DashboardOutlined,
  TeamOutlined,
  CustomerServiceOutlined,
  DollarOutlined,
  LogoutOutlined,
} from '@ant-design/icons';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../context/authStore';

const { Header, Sider, Content } = Layout;

const items = [
  { key: '/admin/dashboard', icon: <DashboardOutlined />, label: 'Дашборд' },
  { key: '/admin/artists', icon: <TeamOutlined />, label: 'Артисты' },
  { key: '/admin/tracks', icon: <CustomerServiceOutlined />, label: 'Треки' },
  { key: '/admin/finance', icon: <DollarOutlined />, label: 'Финансы' },
];

export default function AdminLayout() {
  const nav = useNavigate();
  const loc = useLocation();
  const { user, logout } = useAuthStore();

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider breakpoint="lg" collapsedWidth="0" theme="dark">
        <div className="app-logo">VAULT · ADMIN</div>
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
          <Typography.Title level={4} style={{ margin: 0 }}>Кабинет администратора</Typography.Title>
          <Space>
            <span style={{ color: 'var(--text-muted)' }}>{user?.name} · {user?.email}</span>
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
