import React, {useState} from 'react';
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
  const [activeAnswerItem, setActiveAnswerItem] = useState({});

  const handleShowAnswerDetail = key => {
    setActiveAnswerItem(prevInput => {
      const value = !prevInput[key];
      return {
        ...prevInput,
        [key]: value
      };
    });
  };

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
              <button
                className="action-btn"
                data-hide="true"
                onClick={e => handleShowAnswerDetail('number1')}
              >
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
            {activeAnswerItem?.number1 && (
              <div className={`answer-item ${activeAnswerItem?.number1 ? 'answer-active' : ''}`}>
                <p className="answer-detail">
                  Category Mapping is the way that Categories and the products within those
                  Categories are synchronized to the customer's Shopify store according to the names
                  and rates that the customer desires.
                </p>
                <p>
                  When products from the Luxury Distribution side are synchronized to the customer's
                  Shopify store, they do not have any defined categories yet. At this point, the
                  user needs to create category mappings in the app to divide their products into
                  different categories and set the rates that the customer wants.
                </p>
              </div>
            )}
          </div>
          <div className="questions-answer">
            <div className="question-item">
              <div className="question-detail">
                <span className="question-label">Performing 'Category Mapping'</span>
              </div>
              <button
                className="action-btn"
                data-hide="true"
                onClick={e => handleShowAnswerDetail('number2')}
              >
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
            <div className={`answer-item ${activeAnswerItem?.number2 ? 'answer-active' : ''}`}>
              <p className="answer-detail">
                Before performing Category Mapping, the customer must first synchronize the products
                from the Luxury Distribution side. To perform Category Mapping, the customer goes to
                Settings > Category Mapping. When wanting to add a new Mapping, the customer clicks
                the Add Mapping button, and the category mapping settings will be displayed in a
                table with 3 fields: Retailer category, Dropshipper category, and Margin. After
                filling in the information for these 3 fields, if the customer wants to save, they
                click the Save button. If the customer wants to delete all mappings, they click the
                Reset Mapping button. For any existing Mappings saved in the table, the customer can
                click the edit icon to modify, or the delete icon to remove that mapping.
              </p>
            </div>
          </div>
          <div className="questions-answer">
            <div className="question-item">
              <div className="question-detail">
                <span className="question-label">Performing 'Attribute Mapping'</span>
              </div>
              <button
                className="action-btn"
                data-hide="true"
                onClick={e => handleShowAnswerDetail('number3')}
              >
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
            <div className={`answer-item ${activeAnswerItem?.number3 ? 'answer-active' : ''}`}>
              <p className="answer-detail">
                Attribute Mapping is the setting to display the product attributes that are
                synchronized from the Luxury Distribution side. To set up Attribute Mapping, the
                customer goes to Settings > Attribute Mapping and clicks the Options Mapping button.
                When the Options Mapping section appears, the customer can click the Save button to
                save any changes.
              </p>
            </div>
          </div>
          <div className="questions-answer">
            <div className="question-item">
              <div className="question-detail">
                <span className="question-label">Adjusting the 'Synchronization Setting</span>
              </div>
              <button
                className="action-btn"
                data-hide="true"
                onClick={e => handleShowAnswerDetail('number4')}
              >
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
            <div className={`answer-item ${activeAnswerItem?.number4 ? 'answer-active' : ''}`}>
              <p className="answer-detail">
                To adjust the Synchronization Settings, the customer goes to Settings > Sync
                Settings. The customer can check the attributes they want to synchronize to the
                Shopify store and click Save to save the changes. If the customer does not want to
                synchronize an attribute that was previously selected, they can uncheck it and click
                Save.
              </p>
            </div>
          </div>
          <div className="questions-answer">
            <div className="question-item">
              <div className="question-detail">
                <span className="question-label">Understanding how 'Margin' works</span>
              </div>
              <button
                className="action-btn"
                data-hide="true"
                onClick={e => handleShowAnswerDetail('number5')}
              >
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
            <div className={`answer-item ${activeAnswerItem?.number5 ? 'answer-active' : ''}`}>
              <p className="answer-detail">
                Margin is the rate setting between the Luxury Distribution and the customer's
                Shopify store. The Margin factor is set when creating the Category Mapping. The main
                categories may contain products from all subcategories, and in the case where there
                are different profit margins, the lowest value will be applied. And in the case
                where there are different fixed shipping costs, the maximum shipping cost will be
                applied.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
