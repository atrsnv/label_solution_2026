import React from "react";
import HeroSection from "./HeroSection";
import ArtistList from "./ArtistList";
import LatestRelease from "./LatestRelease";
import './HomePage.scss';

const HomePage: React.FC = () => (
<div className="home-page">
  <HeroSection />

  <div className="page-row">
    <div className="page-block">
      <ArtistList />
    </div>
    <div className="page-block">
      <LatestRelease />
    </div>
  </div>
</div>
);

export default HomePage;