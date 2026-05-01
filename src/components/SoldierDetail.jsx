import React, { useState } from "react";
import "./SoldierDetail.css";

const SoldierDetail = ({ hero }) => {
  if (!hero) return null;

  return (
    <section className="bg-black" data-component="herosoldierdetail">
      <div className="herosoldierdetail__alignment-wrapper">
        <div className="herosoldierdetail__content-container">
          <div className="herosoldierdetail__rank">
            <div className="herosoldierdetail__rank-icon">
              {/* Example SVG icon, replace with dynamic if available */}
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" height="45" viewBox="0 0 28 45" width="28">
                <path d="M13.98 11.3701L0 21.3801V30.0501L2.99001 31.3601C4.07001 31.8301 5.17999 32.2301 6.28999 32.5501C8.78999 33.2801 11.38 33.6501 14 33.6501C17.8 33.6501 21.49 32.8801 24.99 31.3601L28 30.0501V21.2601L13.98 11.3501V11.3701ZM26 28.7501L24.19 29.5301C20.95 30.9401 17.52 31.6501 14 31.6501C11.57 31.6501 9.17001 31.3101 6.85001 30.6301C5.82001 30.3301 4.79 29.9601 3.8 29.5301L2.00999 28.7401V22.4101L14 13.8201L26.01 22.3101V28.7501H26ZM4 27.4301L4.60001 27.6901C5.51001 28.0901 6.46 28.4301 7.41 28.7101C9.54 29.3301 11.76 29.6501 14 29.6501C17.24 29.6501 20.41 28.9901 23.4 27.6901L24 27.4301V23.3401L14 16.2701L4 23.4301V27.4301ZM6 24.4601L14 18.7301L22 24.3801V26.1201C17.53 27.9001 12.55 28.1401 7.97 26.8001C7.3 26.6101 6.64 26.3801 6 26.1201V24.4601Z" fill="#221F20"></path>
              </svg>
            </div>
            <h2 className="herosoldierdetail__rank-headline">{hero.rank}</h2>
          </div>
          <div className="herosoldierdetail__content">
        <div className="picture-container">
          <picture className="rez-img aspect-w-4 aspect-h-3">
            <img
              src={hero.image}
              loading="lazy"
              fetchPriority="auto"
              className="herosoldierdetail__image-float object-cover"
              alt={hero.alt || hero.name}
            />
          </picture>
            <h1 className="t2 herosoldierdetail__name">{hero.name}</h1>
        </div>
            <p>{hero.description}</p>
            <dl className="herosoldierdetail__details item">
              <dt>Job</dt>
              <dd>{hero.role}</dd>
              <dt>Conflict</dt>
              <dd>{hero.conflict}</dd>
              <dt>Time Period</dt>
              <dd>{hero.timePeriod}</dd>
              <dt>Location</dt>
              <dd>{hero.location}</dd>
            </dl>
          </div>
        </div>
      </div>
    </section>
  );
};

export default SoldierDetail;
