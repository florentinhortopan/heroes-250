import React from 'react';
import './Accordion.css';

const Accordion = ({ items }) => {
  return (
    <div className="accordion-list">
      {items.map((item, idx) => (
        <details className="accordion bg-tan" key={idx} data-component="accordion" data-state="closed">
          <summary className="accordion__summary">
            <span className="accordion__icon-right">
              <div className="icon w-[20px] h-[20px]">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" height="20" viewBox="0 0 20 20" width="20">
                  <path d="M4 7L10 13L16 7" stroke="#221F20"></path>
                </svg>
              </div>
            </span>
            <div className="accordion__subheading">
              <h3 className="!t4 !null">{item.title}</h3>
            </div>
          </summary>
          <div className="accordion__body">
            {item.content}
          </div>
        </details>
      ))}
    </div>
  );
};

export default Accordion;
