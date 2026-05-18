import React from "react";
import "./ArtistList.scss";
import artist1 from "../../assets/artist1.png";
import artist2 from "../../assets/artist2.png";
import artist3 from "../../assets/artist3.png";
import artist4 from "../../assets/artist4.png";

const artists = [artist1, artist2, artist3, artist4];

const ArtistList: React.FC = () => (
  <section className="artist-list">
    <h3 className="artist-title">Наши артисты</h3>

    <div className="artist-stack">
      {artists.map((img, idx) => (
        <div className="artist-card" key={idx}>
          <img src={img} alt={`Artist ${idx + 1}`} />
        </div>
      ))}
    </div>
  </section>
);

export default ArtistList;