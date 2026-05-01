import './HeroMatch.css';
import React from 'react';
import jobData from '../data/job_data.json';
import Accordion from './Accordion';
import SoldierDetail from './SoldierDetail';
import CareerPath from './CareerPath';
import { Link } from 'react-router-dom';

const HeroMatch = ({ hero, sharedQualities = [], keywordLabelMap = {}, userKeywordIds = [] }) => {
  if (!hero || !hero.message_content) return null;
  const { rank, name, last_name, message_content, matched_mos, keywords: heroKeywords = [] } = hero;
  const { strength, value, traits, legacy, shortened_bio } = message_content;

  // Find the job that matches the hero's matched_mos
  const job = Array.isArray(jobData)
    ? jobData.find((j) => j.moscode === matched_mos)
    : null;

  return (
    <section className="hero hero-secondary" data-version="hero-secondary">
      <div className="column-left normal">
        <SoldierDetail
          hero={{
            name,
            rank,
            image: hero.image_src,
            alt: hero.image_alt,
            description: hero.medium_bio,
            conflict: hero.conflict,
            achievement: hero.achievement,
            timePeriod: hero.time_period,
            location: hero.location,
            role: hero.matched_mos
          }}
        />
      </div>
      <div className="column-right">
        <div className="cmp-container">
          <h2 className="hero-heading !t2 !text-gold uppercase">Meet your Army Hero.</h2>
        {/* <h4>
          {rank ? `${rank} ` : ''}{name} {shortened_bio}
        </h4> */}
        <p>
          Just like {rank ? `${rank} ` : ''}{last_name}, you have what it takes to {strength} and {value}.
          The same {traits[0]} and {traits[1]} that drove them to {legacy} lives in you.
          The next chapter of this legacy could be yours.
        </p>
          <Accordion
            items={[{
              title: 'Qualities You Share',
              content: (
                <ul className='icon icon-list'>
                  {sharedQualities.map((id) => (
                    <li key={id} className="flex gap-2 my-6 first:mt-0 last:mb-0 rte">
                      <div className="icon icon-list flex shrink-0 w-[20px] h-[20px] mt-[3px]">
                        {/* SVG checkmark icon */}
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" height="20" viewBox="0 0 40 41" width="20">
                          <rect height="38" rx="19" stroke="#fff" strokeWidth="2" width="38" x="1" y="1.98633"></rect>
                          <path d="M16.4596 26.9362L11.3496 20.3661L13.1396 18.9761L16.8096 23.6961L27.1996 15.0361L28.6496 16.7762L16.4596 26.9362Z" fill="#fff"></path>
                        </svg>
                      </div>
                      <p>{keywordLabelMap[id] || id}</p>
                    </li>
                  ))}
                </ul>
              )
            }]}
          />
          <Accordion
            items={[{
              title: 'Follow In Their Footsteps',
              content: (
                  <CareerPath hero={hero} />
              )
            }]}
          />
          <div className="cta-block">
            <button className="cta-primary">
              <span className="cta-primary-text">TALK TO A RECRUITER</span>
              <span className="cta-primary-icon" aria-hidden="true">
                <svg xmlns="http://www.w3.org/2000/svg" width="33" height="32" viewBox="0 0 33 32" fill="none">
                  <title>arrow-animate</title>
                  <path d="M18.9269 23.3166L25.7039 15.9996L18.9269 8.68262L17.6579 9.87062L22.6259 15.1896H7.04688V16.8366H22.6259L17.6579 22.1556L18.9269 23.3166Z" fill="#221F20"></path>
                </svg>
              </span>
            </button>
          </div>
          <div className="cta-block">
            <Link to="/quiz/1" className="cta-secondary">
              <span className="cta-secondary-text">RETAKE THE QUIZ</span>
              <span className="cta-secondary-icon" aria-hidden="true">
                <svg xmlns="http://www.w3.org/2000/svg" width="33" height="32" viewBox="0 0 33 32" fill="none">
                  <title>arrow-animate</title>
                  <path d="M18.9269 23.3166L25.7039 15.9996L18.9269 8.68262L17.6579 9.87062L22.6259 15.1896H7.04688V16.8366H22.6259L17.6579 22.1556L18.9269 23.3166Z" fill="#ffcc01"></path>
                </svg>
              </span>
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HeroMatch;
