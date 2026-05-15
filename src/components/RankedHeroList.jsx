import React from 'react';
import './RankedHeroList.css';

const RankedHeroList = ({ ranked = [], keywordLabelMap = {} }) => {
  if (!ranked.length) return null;

  return (
    <section className="ranked-hero-list">
      <header className="ranked-hero-list__header">
        <h3 className="!t3 !text-gold uppercase">Other heroes you echo</h3>
        <p className="ranked-hero-list__subtitle">
          Ranked by how closely your answers align with each hero's recorded qualities.
        </p>
      </header>
      <ol className="ranked-hero-list__rows">
        {ranked.map(({ hero, percent, shared }, idx) => (
          <li key={hero.id} className="ranked-hero-row">
            <div className="ranked-hero-row__rank">#{idx + 1}</div>
            <img
              className="ranked-hero-row__img"
              src={hero.image_src}
              alt={hero.image_alt || hero.name}
              loading="lazy"
            />
            <div className="ranked-hero-row__main">
              <div className="ranked-hero-row__name">
                {hero.rank ? `${hero.rank} ` : ''}
                {hero.name}
              </div>
              <div className="ranked-hero-row__meta">
                {hero.conflict} · {hero.time_period}
              </div>
              {shared?.length > 0 && (
                <ul className="ranked-hero-row__shared">
                  {shared.map((id) => (
                    <li key={id} className="ranked-hero-row__chip">
                      {keywordLabelMap[id] || id}
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div className="ranked-hero-row__score">
              <div className="ranked-hero-row__bar" aria-hidden="true">
                <div className="ranked-hero-row__bar-fill" style={{ width: `${percent}%` }} />
              </div>
              <div className="ranked-hero-row__percent">{percent}%</div>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
};

export default RankedHeroList;
