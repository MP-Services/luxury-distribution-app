import React from 'react';
import ToggleMenu from "@assets/components/ToogleMenu/ToggleMenu";
import {useMenu} from "../../reducers/menuReducer";
import '../../styles/pages/support.scss';
import EmailIcon from '../../resources/icons/Group114.svg'
import WebsiteIcon from '../../resources/icons/Group115.svg';

/**
 * Just render a sample page
 *
 * @return {React.ReactElement}
 * @constructor
 */
export default function Support() {
  const {isActiveMenu} = useMenu();

  return (
    <div className={`content ${isActiveMenu ? 'opacity' : ''}`}>
      <div className="content-title">
        <div className="header-title">
          <ToggleMenu/>
          <h2 className="title-detail">Support</h2>
        </div>
      </div>
      <div className="support-content">
        <div className="support-remind">
          <span className="remind-label">We encourage you to contact us with any questions and inquiries and our team will get back to you as soon as possible</span>
        </div>
        <div className="info-contact">
          <div className="contact-wrapper">
            <div className="icon-info">
              <img src={EmailIcon} alt="Email"/>
            </div>
            <div className="info-detail">
              <div className="info-title">
                <span className="title-label">Email</span>
              </div>
              <div className="email-info">
                <span>admin@luxury-distribution.com</span>
              </div>
            </div>
          </div>
          <div className="contact-wrapper">
            <div className="icon-info">
              <img src={WebsiteIcon} alt="Website"/>
            </div>
            <div className="info-detail">
              <div className="info-title">
                <span className="title-label">Website</span>
              </div>
              <div className="website-info">
                <span>luxury-distribution.com</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
