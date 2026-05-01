import React from 'react';
import { Link } from 'react-router-dom';
import './LandingPage.css';

const LandingPage = () => (
  <div className="secondarycallout image aem-GridColumn aem-GridColumn--default--12">
    <div className="bg-green">
      <section
        data-component="callout"
        data-callout-type="secondary"
        className="callout image-left"
      >
        <div className="column-left w-full desktop:w-1/2">
          <div className="secondary-callout-heading">
            <h1 className="uppercase">
              Find your Army Hero. Find your path.
            </h1>
          </div>
          <div className="secondary-callout-heading-supporting-text">
            <div className="rte">
              <p>
                Step into 250 years of U.S. Army history and discover the hero who shares your mindset and strengths. Take the quiz to see how their story can help shape your path — and reveal a future you can step into.
              </p>
            </div>
          </div>
            <div className="cta-block">
              <Link to="/quiz/1" className="cta-primary">
                <span className="cta-primary-text">FIND YOUR HERO</span>
                <span className="cta-primary-icon" aria-hidden="true">
                  <svg xmlns="http://www.w3.org/2000/svg" width="33" height="32" viewBox="0 0 33 32" fill="none">
                    <title>arrow-animate</title>
                    <path d="M18.9269 23.3166L25.7039 15.9996L18.9269 8.68262L17.6579 9.87062L22.6259 15.1896H7.04688V16.8366H22.6259L17.6579 22.1556L18.9269 23.3166Z" fill="#221F20"></path>
                  </svg>
                </span>
              </Link>
            </div>
        </div>
        <div className="column-right w-full desktop:w-1/2">
          <div className="secondary-callout-image">
            <picture className="aspect-w-4 aspect-h-3">
              <source media="(min-width: 375px)" srcSet="src/assets/main-image.jpg" />
              <img src="src/assets/main-image.jpg" loading="lazy" alt="A group of Army Soldiers in a tent" />
            </picture>
          </div>
        </div>
      </section>
    </div>
  </div>
);

export default LandingPage;
