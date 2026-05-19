import { Outlet } from 'react-router-dom';

import Header from '../components/Header/Header';

import './AdminLayout.scss';

const AdminLayout = () => {
  return (
    <div className="admin-layout">
      <Header />

      <div className="admin-layout__content">
        <Outlet />
      </div>
    </div>
  );
};

export default AdminLayout;