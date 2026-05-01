import React from 'react';
import './career-path.css';
import jobData from '../data/job_data.json';
import keywordsData from '../data/keywords.json';
import JobCard from '../components/JobCard';


const CareerPath = ({ hero }) => {
  if (!hero || !Array.isArray(jobData)) return null;
  const job = jobData.find((j) => j.moscode === hero.matched_mos);

  // Find a matched keyword between hero and user (assuming hero.shared is available)
  // For this context, use the first keyword from hero.keywords
  const heroKeywordIds = hero.keywords?.map((k) => k.id) || [];
  const keywordOption = keywordsData.keyword_options.find((k) => heroKeywordIds.includes(k.id));
  const keywordLabel = keywordOption ? keywordOption.label : 'characteristics';
  const keywordId = keywordOption ? keywordOption.id : null;

  // Get career category info from keywords.json using job.category
  let careerCategoryLabel = '';
  let careerCategoryCopy = '';
  if (job && job.category && keywordsData.career_category[job.category]) {
    careerCategoryLabel = keywordsData.career_category[job.category].label;
    careerCategoryCopy = keywordsData.career_category[job.category].copy;
  }

  // Use hero's first name for the Gregg reference
  const heroFirstName = hero.name?.split(' ')[0] || hero.name || 'your hero';

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
          {job ? <JobCard job={job} /> : null}
        </div>
      </div>
    </section>
  );
};

export default CareerPath;
