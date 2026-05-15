import React from 'react';
import './career-path.css';
import jobData from '../data/job_data.json';
import keywordsData from '../data/keywords.json';
import JobCard from '../components/JobCard';

const CareerPath = ({ hero, job: jobProp }) => {
  if (!hero) return null;

  // Prefer the LLM-picked top job; fall back to hero.matched_mos if not provided yet.
  let job = jobProp || null;
  if (!job && Array.isArray(jobData)) {
    job = jobData.find((j) => j.moscode === hero.matched_mos) || null;
  }

  const heroKeywordIds = hero.keywords?.map((k) => k.id) || [];
  const keywordOption = keywordsData.keyword_options.find((k) => heroKeywordIds.includes(k.id));
  const keywordLabel = keywordOption ? keywordOption.label : 'characteristics';
  const keywordId = keywordOption ? keywordOption.id : null;

  let careerCategoryLabel = '';
  let careerCategoryCopy = '';
  if (job && job.category && keywordsData.career_category[job.category]) {
    careerCategoryLabel = keywordsData.career_category[job.category].label;
    careerCategoryCopy = keywordsData.career_category[job.category].copy;
  }

  return (
    <section className="career-path-section">
      <div className="career-path-content">
        <div className="career-path-copy">
          {keywordId && careerCategoryLabel && careerCategoryCopy && (
            <p className="career-path-dynamic">
              You showed strong <span className="career-keyword">{keywordLabel.toLowerCase()}</span>, just like {hero.name}.
              Those strengths are critical in <span className="career-category">{careerCategoryLabel}</span> roles, where {careerCategoryCopy}
            </p>
          )}
        </div>
        <h4>Explore a career in <span className="career-category">{careerCategoryLabel}</span></h4>
        <div className="career-path-job-card">
          {job ? <JobCard job={normalizeJobForCard(job)} /> : null}
        </div>
      </div>
    </section>
  );
};

// JobCard expects the legacy schema (mos_title, moscode, mos_description_short, category, url_path_legacy).
// The trimmed summary uses `url` instead. Normalize so either shape works.
function normalizeJobForCard(job) {
  if (!job) return null;
  if (job.url_path_legacy) return job;
  return {
    ...job,
    url_path_legacy: job.url || job.url_path_legacy || '',
  };
}

export default CareerPath;
