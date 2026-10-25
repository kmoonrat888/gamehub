import { useState } from "react";
import { Link } from "react-router-dom";

const asset = (path) => `${import.meta.env.BASE_URL}${path}`;

export default function GameCard({ game }) {
  const [thumbFailed, setThumbFailed] = useState(false);

  return (
    <article className="game-card" style={{ "--accent": game.color }}>
      <Link to={`/play/${game.id}`} className="thumb" aria-label={`เล่น ${game.title}`}>
        {game.thumb && !thumbFailed ? (
          <img src={asset(`thumbs/${game.thumb}`)} alt="" loading="lazy" onError={() => setThumbFailed(true)} />
        ) : (
          <span className="thumb-emoji" aria-hidden="true">{game.emoji}</span>
        )}
        <span className="grade">{game.grade}</span>
      </Link>
      <div className="card-body">
        <h3>
          <span aria-hidden="true">{game.emoji}</span> {game.title}
        </h3>
        <p>{game.description}</p>
        <ul className="tags">
          {game.features.map((feature) => (
            <li key={feature}>{feature}</li>
          ))}
        </ul>
        <Link to={`/play/${game.id}`} className="btn play-btn">
          ▶ เล่นเลย
        </Link>
      </div>
    </article>
  );
}
