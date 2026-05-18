import React from 'react';
import Header from '../components/Header/Header';
import { Outlet } from 'react-router-dom';
import './MainLayout.scss';

const MainLayout: React.FC = () => (
  <div className="page-wrapper">
    <Header />
    <main className="page-content">
      <Outlet /> 
    </main>
  </div>
);

export default MainLayout;