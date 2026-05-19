import React from "react";
import "./LatestRelease.scss";
import releaseImg from "../../assets/release.png";

const LatestRelease: React.FC = () => (
  <section className="latest-release">
    <h3 className="release-title">Недавний релиз</h3>
    <div className="release-stack">
      <div className="release-card">
        <img src={releaseImg} alt="Latest Release" />
      </div>
      <div className="release-info">
        <span className="release-name">Казино</span>
        <span className="release-artist">DEAD BLONDE</span>
        <button className="release-btn">Слушать</button>
      </div>
    </div>
  </section>
);

export default LatestRelease;