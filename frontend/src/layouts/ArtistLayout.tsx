import { Outlet } from 'react-router-dom';

import Header from '../components/Header/Header';

import './ArtistLayout.scss';

const ArtistLayout = () => {
  return (
    <div className="artist-layout">
      <Header />

      <div className="artist-layout__content">
        <Outlet />
      </div>
    </div>
  );
};

export default ArtistLayout;