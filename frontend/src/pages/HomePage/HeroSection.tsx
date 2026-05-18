import React from 'react';
import { useNavigate } from 'react-router-dom';

import './HeroSection.scss';
import heroImage from '../../assets/hero.png';

const HeroSection: React.FC = () => {
  const navigate = useNavigate();

  const handleJoinClick = () => {
    navigate('/login?tab=register&role=artist');
  };

  return (
    <section className="hero-section">
      <div className="hero-content">
        <h1 className="hero-title">Where sound becomes identity.</h1>

        <p className="hero-description">
          Мы бережно сохраняем авторское видение, усиливаем звучание и помогаем артистам строить устойчивую карьеру.
        </p>

        <button className="hero-btn" type="button" onClick={handleJoinClick}>
          Присоединиться
        </button>
      </div>

      <div className="hero-image">
        <img src={heroImage} alt="Hero" />
      </div>
    </section>
  );
};

export default HeroSection;