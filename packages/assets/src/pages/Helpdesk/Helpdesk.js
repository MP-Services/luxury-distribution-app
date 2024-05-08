import React from 'react';
import ToggleMenu from '@assets/components/ToogleMenu/ToggleMenu';
import {useMenu} from '../../reducers/menuReducer';
import '../../styles/pages/helpdesk.scss';

/**
 * Just render a sample page
 *
 * @return {React.ReactElement}
 * @constructor
 */
export default function Helpdesk() {
  const {isActiveMenu} = useMenu();

  return (
    <div className={`main ${isActiveMenu ? 'opacity' : ''}`}>
      <div className="content-title">
        <div className="header-title">
          <ToggleMenu />
          <h2 className="title-detail">Helpdesk</h2>
        </div>
      </div>
      <div className="content">
        <div className="frequently-questions">
          <div className="questions-answer">
            <div className="question-item">
              <div className="question-detail">
                <span className="question-label">Understanding how 'Category Mapping' works</span>
              </div>
              <button className="action-btn" data-hide="true">
                <svg
                  width="32"
                  height="32"
                  viewBox="0 0 32 32"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <circle cx="16" cy="16" r="16" fill="#1768F7" />
                  <g clipPath="url(#clip0_77_2122)">
                    <path
                      d="M23.2381 15.2381H16.7619V8.76191C16.7619 8.34134 16.4213 8 16 8C15.5787 8 15.2381 8.34134 15.2381 8.76191V15.2381H8.76191C8.34056 15.2381 8 15.5794 8 16C8 16.4206 8.34056 16.7619 8.76191 16.7619H15.2381V23.2381C15.2381 23.6587 15.5787 24 16 24C16.4213 24 16.7619 23.6587 16.7619 23.2381V16.7619H23.2381C23.6594 16.7619 24 16.4206 24 16C24 15.5794 23.6594 15.2381 23.2381 15.2381Z"
                      fill="white"
                    />
                  </g>
                  <defs>
                    <clipPath id="clip0_77_2122">
                      <rect width="16" height="16" fill="white" transform="translate(8 8)" />
                    </clipPath>
                  </defs>
                </svg>
              </button>
            </div>
            <div className="answer-item">
              <p className="answer-detail">
                Lorem Ipsum is simply dummy text of the printing and typesetting industry. Lorem
                Ipsum has been the industry's standard dummy text ever since the 1500s, when an
                unknown printer took a galley of type and scrambled it to make a type specimen book.
              </p>
            </div>
          </div>
          <div className="questions-answer">
            <div className="question-item">
              <div className="question-detail">
                <span className="question-label">Performing 'Category Mapping'</span>
              </div>
              <button className="action-btn" data-hide="true">
                <svg
                  width="32"
                  height="32"
                  viewBox="0 0 32 32"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <circle cx="16" cy="16" r="16" fill="#1768F7" />
                  <g clipPath="url(#clip0_77_2122)">
                    <path
                      d="M23.2381 15.2381H16.7619V8.76191C16.7619 8.34134 16.4213 8 16 8C15.5787 8 15.2381 8.34134 15.2381 8.76191V15.2381H8.76191C8.34056 15.2381 8 15.5794 8 16C8 16.4206 8.34056 16.7619 8.76191 16.7619H15.2381V23.2381C15.2381 23.6587 15.5787 24 16 24C16.4213 24 16.7619 23.6587 16.7619 23.2381V16.7619H23.2381C23.6594 16.7619 24 16.4206 24 16C24 15.5794 23.6594 15.2381 23.2381 15.2381Z"
                      fill="white"
                    />
                  </g>
                  <defs>
                    <clipPath id="clip0_77_2122">
                      <rect width="16" height="16" fill="white" transform="translate(8 8)" />
                    </clipPath>
                  </defs>
                </svg>
              </button>
            </div>
            <div className="answer-item">
              <p className="answer-detail">
                Lorem Ipsum is simply dummy text of the printing and typesetting industry. Lorem
                Ipsum has been the industry's standard dummy text ever since the 1500s, when an
                unknown printer took a galley of type and scrambled it to make a type specimen book.
              </p>
            </div>
          </div>
          <div className="questions-answer">
            <div className="question-item">
              <div className="question-detail">
                <span className="question-label">
                  Adding products and changing the markup after the initial import
                </span>
              </div>
              <button className="action-btn" data-hide="true">
                <svg
                  width="32"
                  height="32"
                  viewBox="0 0 32 32"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <circle cx="16" cy="16" r="16" fill="#1768F7" />
                  <g clipPath="url(#clip0_77_2122)">
                    <path
                      d="M23.2381 15.2381H16.7619V8.76191C16.7619 8.34134 16.4213 8 16 8C15.5787 8 15.2381 8.34134 15.2381 8.76191V15.2381H8.76191C8.34056 15.2381 8 15.5794 8 16C8 16.4206 8.34056 16.7619 8.76191 16.7619H15.2381V23.2381C15.2381 23.6587 15.5787 24 16 24C16.4213 24 16.7619 23.6587 16.7619 23.2381V16.7619H23.2381C23.6594 16.7619 24 16.4206 24 16C24 15.5794 23.6594 15.2381 23.2381 15.2381Z"
                      fill="white"
                    />
                  </g>
                  <defs>
                    <clipPath id="clip0_77_2122">
                      <rect width="16" height="16" fill="white" transform="translate(8 8)" />
                    </clipPath>
                  </defs>
                </svg>
              </button>
            </div>
          </div>
          <div className="questions-answer">
            <div className="question-item">
              <div className="question-detail">
                <span className="question-label">Adjusting the 'Synchronization Settings</span>
              </div>
              <button className="action-btn" data-hide="true">
                <svg
                  width="32"
                  height="32"
                  viewBox="0 0 32 32"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <circle cx="16" cy="16" r="16" fill="#1768F7" />
                  <g clipPath="url(#clip0_77_2122)">
                    <path
                      d="M23.2381 15.2381H16.7619V8.76191C16.7619 8.34134 16.4213 8 16 8C15.5787 8 15.2381 8.34134 15.2381 8.76191V15.2381H8.76191C8.34056 15.2381 8 15.5794 8 16C8 16.4206 8.34056 16.7619 8.76191 16.7619H15.2381V23.2381C15.2381 23.6587 15.5787 24 16 24C16.4213 24 16.7619 23.6587 16.7619 23.2381V16.7619H23.2381C23.6594 16.7619 24 16.4206 24 16C24 15.5794 23.6594 15.2381 23.2381 15.2381Z"
                      fill="white"
                    />
                  </g>
                  <defs>
                    <clipPath id="clip0_77_2122">
                      <rect width="16" height="16" fill="white" transform="translate(8 8)" />
                    </clipPath>
                  </defs>
                </svg>
              </button>
            </div>
          </div>
          <div className="questions-answer">
            <div className="question-item">
              <div className="question-detail">
                <span className="question-label">Performing 'Category Mapping'</span>
              </div>
              <button className="action-btn" data-hide="true">
                <svg
                  width="32"
                  height="32"
                  viewBox="0 0 32 32"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <circle cx="16" cy="16" r="16" fill="#1768F7" />
                  <g clipPath="url(#clip0_77_2122)">
                    <path
                      d="M23.2381 15.2381H16.7619V8.76191C16.7619 8.34134 16.4213 8 16 8C15.5787 8 15.2381 8.34134 15.2381 8.76191V15.2381H8.76191C8.34056 15.2381 8 15.5794 8 16C8 16.4206 8.34056 16.7619 8.76191 16.7619H15.2381V23.2381C15.2381 23.6587 15.5787 24 16 24C16.4213 24 16.7619 23.6587 16.7619 23.2381V16.7619H23.2381C23.6594 16.7619 24 16.4206 24 16C24 15.5794 23.6594 15.2381 23.2381 15.2381Z"
                      fill="white"
                    />
                  </g>
                  <defs>
                    <clipPath id="clip0_77_2122">
                      <rect width="16" height="16" fill="white" transform="translate(8 8)" />
                    </clipPath>
                  </defs>
                </svg>
              </button>
            </div>
          </div>
          <div className="questions-answer">
            <div className="question-item">
              <div className="question-detail">
                <span className="question-label">Performing 'Attribute Mapping</span>
              </div>
              <button className="action-btn" data-hide="true">
                <svg
                  width="32"
                  height="32"
                  viewBox="0 0 32 32"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <circle cx="16" cy="16" r="16" fill="#1768F7" />
                  <g clipPath="url(#clip0_77_2122)">
                    <path
                      d="M23.2381 15.2381H16.7619V8.76191C16.7619 8.34134 16.4213 8 16 8C15.5787 8 15.2381 8.34134 15.2381 8.76191V15.2381H8.76191C8.34056 15.2381 8 15.5794 8 16C8 16.4206 8.34056 16.7619 8.76191 16.7619H15.2381V23.2381C15.2381 23.6587 15.5787 24 16 24C16.4213 24 16.7619 23.6587 16.7619 23.2381V16.7619H23.2381C23.6594 16.7619 24 16.4206 24 16C24 15.5794 23.6594 15.2381 23.2381 15.2381Z"
                      fill="white"
                    />
                  </g>
                  <defs>
                    <clipPath id="clip0_77_2122">
                      <rect width="16" height="16" fill="white" transform="translate(8 8)" />
                    </clipPath>
                  </defs>
                </svg>
              </button>
            </div>
          </div>
          <div className="questions-answer">
            <div className="question-item">
              <div className="question-detail">
                <span className="question-label">Performing an Integrity Check</span>
              </div>
              <button className="action-btn" data-hide="true">
                <svg
                  width="32"
                  height="32"
                  viewBox="0 0 32 32"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <circle cx="16" cy="16" r="16" fill="#1768F7" />
                  <g clipPath="url(#clip0_77_2122)">
                    <path
                      d="M23.2381 15.2381H16.7619V8.76191C16.7619 8.34134 16.4213 8 16 8C15.5787 8 15.2381 8.34134 15.2381 8.76191V15.2381H8.76191C8.34056 15.2381 8 15.5794 8 16C8 16.4206 8.34056 16.7619 8.76191 16.7619H15.2381V23.2381C15.2381 23.6587 15.5787 24 16 24C16.4213 24 16.7619 23.6587 16.7619 23.2381V16.7619H23.2381C23.6594 16.7619 24 16.4206 24 16C24 15.5794 23.6594 15.2381 23.2381 15.2381Z"
                      fill="white"
                    />
                  </g>
                  <defs>
                    <clipPath id="clip0_77_2122">
                      <rect width="16" height="16" fill="white" transform="translate(8 8)" />
                    </clipPath>
                  </defs>
                </svg>
              </button>
            </div>
          </div>
          <div className="questions-answer">
            <div className="question-item">
              <div className="question-detail">
                <span className="question-label">Performing a 'Compatibility Check</span>
              </div>
              <button className="action-btn" data-hide="true">
                <svg
                  width="32"
                  height="32"
                  viewBox="0 0 32 32"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <circle cx="16" cy="16" r="16" fill="#1768F7" />
                  <g clipPath="url(#clip0_77_2122)">
                    <path
                      d="M23.2381 15.2381H16.7619V8.76191C16.7619 8.34134 16.4213 8 16 8C15.5787 8 15.2381 8.34134 15.2381 8.76191V15.2381H8.76191C8.34056 15.2381 8 15.5794 8 16C8 16.4206 8.34056 16.7619 8.76191 16.7619H15.2381V23.2381C15.2381 23.6587 15.5787 24 16 24C16.4213 24 16.7619 23.6587 16.7619 23.2381V16.7619H23.2381C23.6594 16.7619 24 16.4206 24 16C24 15.5794 23.6594 15.2381 23.2381 15.2381Z"
                      fill="white"
                    />
                  </g>
                  <defs>
                    <clipPath id="clip0_77_2122">
                      <rect width="16" height="16" fill="white" transform="translate(8 8)" />
                    </clipPath>
                  </defs>
                </svg>
              </button>
            </div>
          </div>
          <div className="questions-answer">
            <div className="question-item">
              <div className="question-detail">
                <span className="question-label">Understanding how 'Margin' works</span>
              </div>
              <button className="action-btn" data-hide="true">
                <svg
                  width="32"
                  height="32"
                  viewBox="0 0 32 32"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <circle cx="16" cy="16" r="16" fill="#1768F7" />
                  <g clipPath="url(#clip0_77_2122)">
                    <path
                      d="M23.2381 15.2381H16.7619V8.76191C16.7619 8.34134 16.4213 8 16 8C15.5787 8 15.2381 8.34134 15.2381 8.76191V15.2381H8.76191C8.34056 15.2381 8 15.5794 8 16C8 16.4206 8.34056 16.7619 8.76191 16.7619H15.2381V23.2381C15.2381 23.6587 15.5787 24 16 24C16.4213 24 16.7619 23.6587 16.7619 23.2381V16.7619H23.2381C23.6594 16.7619 24 16.4206 24 16C24 15.5794 23.6594 15.2381 23.2381 15.2381Z"
                      fill="white"
                    />
                  </g>
                  <defs>
                    <clipPath id="clip0_77_2122">
                      <rect width="16" height="16" fill="white" transform="translate(8 8)" />
                    </clipPath>
                  </defs>
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
