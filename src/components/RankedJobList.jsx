import React from 'react';
import JobCard from './JobCard';
import './RankedJobList.css';

const RankedJobList = ({ ranked = [], loading = false }) => {
  if (loading) {
    return (
      <section className="ranked-job-list">
        <header className="ranked-job-list__header">
          <h3 className="!t3 !text-gold uppercase">Other careers that fit you</h3>
          <p className="ranked-job-list__subtitle">Reading through the full Army catalog…</p>
        </header>
        <div className="ranked-job-list__loading">Ranking jobs…</div>
      </section>
    );
  }

  if (!ranked.length) return null;

  return (
    <section className="ranked-job-list">
      <header className="ranked-job-list__header">
        <h3 className="!t3 !text-gold uppercase">Other careers that fit you</h3>
        <p className="ranked-job-list__subtitle">
          Ranked by an AI that read every job description in the Army catalog against your answers.
        </p>
      </header>
      <ul className="ranked-job-list__grid">
        {ranked.map((entry, idx) => (
          <li key={`${entry.moscode}-${idx}`} className="ranked-job-card">
            <JobCard
              job={entry.full || entry}
              rank={idx + 1}
              reason={entry.reason}
              percent={entry.percent}
            />
          </li>
        ))}
      </ul>
    </section>
  );
};

export default RankedJobList;
