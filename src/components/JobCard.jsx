import './cards.css';
import React from 'react';

const HelmetSVG = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20" fill="none" role="img">
    <title>helmet-v2</title>
    <g clipPath="url(#clip0_3049_125524-2)">
      <path d="M20 9.17C20 6.74 19.03 4.38 17.33 2.68C15.56 0.9 13.45 0 11.08 0H8.75C6.41 0 4.21 0.91 2.56 2.57C0.910001 4.22 0 6.42 0 8.75V13.12C0 14.18 0.639999 15.12 1.62 15.51L2.32 15.79V15.8L12.82 19.97C12.87 19.99 12.94 20 13 20H15C15.28 20 15.5 19.78 15.5 19.5V10.63L20 9.56V9.17ZM13.1 19L5.63 16.04L6.7 12.42C7 11.39 7.96 10.67 9.04 10.67H14.51V19H13.1ZM15.27 9.67H9.03C7.52 9.67 6.16 10.68 5.73 12.13L4.69 15.65L1.99 14.58C1.39 14.34 1 13.77 1 13.12V8.75C1 6.68 1.8 4.74 3.27 3.27C4.73 1.8 6.68 1 8.75 1H11.08C13.18 1 15.04 1.8 16.62 3.38C18.04 4.8 18.89 6.75 18.99 8.77L15.27 9.67Z" fill="#221F20"></path>
    </g>
    <defs>
      <clipPath id="clip0_3049_125524-2">
        <rect width="20" height="20" fill="white"></rect>
      </clipPath>
    </defs>
  </svg>
);

const JobCard = ({ job, rank, reason, percent }) => {
  if (!job) return null;

  const url =
    job.url_path_legacy || job.url || job.url_path_nextgen || job.english_url || '';
  const showRank = rank != null;
  const description = reason || job.mos_description_short;
  const categoryLabel = job.category ? job.category.replace(/-/g, ' ') : '';

  return (
    <section
      className="card job-card"
      data-component="cards"
      data-type="structured"
      data-mos={job.moscode}
      onClick={() => url && window.open(url, '_blank', 'noopener,noreferrer')}
      onKeyDown={(e) => {
        if (!url) return;
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          window.open(url, '_blank', 'noopener,noreferrer');
        }
      }}
      tabIndex={0}
      role="button"
      aria-label={`View details for ${job.mos_title}`}
    >
      <header className="card-header">
        <div className="icon">
          {showRank ? (
            <span className="rank-badge" aria-label={`Rank ${rank}`}>#{rank}</span>
          ) : (
            <div><HelmetSVG /></div>
          )}
        </div>
        <span className="job-group">{categoryLabel}</span>
        {percent != null && <span className="job-percent">{percent}%</span>}
      </header>
      <div className="card-content">
        <span className="job-title">{job.mos_title}</span>
        <span className="job-code">{job.moscode}</span>
        <span className="job-desc">{description}</span>
      </div>
      <footer className="card-footer">
        <button
          className="save-btn"
          aria-label={`Save Job of ${job.mos_title} ${job.moscode}`}
          onClick={(e) => e.stopPropagation()}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="25" height="25" viewBox="0 0 25 25" fill="none" role="img">
            <path d="M5 22.5648V2.00033L17.6686 2.00865V2.01796H18.1686H20V22.5661L13.0404 17.9296L13.0383 17.9282L12.7657 17.7486L12.4906 17.5674L12.2155 17.7486L11.9429 17.9282L11.9403 17.9299L5 22.5648Z" stroke="#221F20"></path>
          </svg>
        </button>
      </footer>
    </section>
  );
};

export default JobCard;
