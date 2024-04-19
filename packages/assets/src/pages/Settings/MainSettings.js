import React, {useState} from 'react';
import {useStore} from '@assets/reducers/storeReducer';
import '../../styles/pages/settings.scss';
import ToggleMenu from '../../components/ToogleMenu/ToggleMenu';
import {useMenu} from '@assets/reducers/menuReducer';
import {NavLink} from 'react-router-dom';

/**
 * Render a home page for overview
 *
 * @return {React.ReactElement}
 * @constructor
 */
export default function MainSettings() {
  const [enabled, setEnabled] = useState(false);
  const {dispatch} = useStore();
  const {isActiveMenu} = useMenu();

  return (
    <div className="wrapper">
      <div className="main">
        <div className="content-title">
          <div className="header-title">
            <ToggleMenu />
            <h2 className="title-detail">Settings</h2>
          </div>
        </div>
        <div className={`content ${isActiveMenu ? 'opacity' : ''}`}>
          <div className="setting-options">
            <NavLink to="/setting/categorymapping" className={'setting-option'}>
              <div className="setting-option-icon">
                <i className="solid grid"></i>
              </div>
              <div className="setting-option-text">
                <h2>Category Mapping</h2>
                <p>Adjust your category mapping settings.</p>
              </div>
            </NavLink>
            <NavLink to="/setting/attribute" className={'setting-option'}>
              <div className="setting-option-icon">
                <i className="solid attribute-mapping"></i>
              </div>
              <div className="setting-option-text">
                <h2>Attribute Mapping</h2>
                <p>Adjust your attribute mapping settings.</p>
              </div>
            </NavLink>
            <NavLink to="/setting/brandfilter" className={'setting-option'}>
              <div className="setting-option-icon">
                <i className="solid brand-filter"></i>
              </div>
              <div className="setting-option-text">
                <h2>Brand Filter</h2>
                <p>Filter which brands you want to be imported.</p>
              </div>
            </NavLink>
            <NavLink to="/setting/sync" className={'setting-option'}>
              <div className="setting-option-icon">
                <i className="solid gear-sync"></i>
              </div>
              <div className="setting-option-text">
                <h2>Synchronization Setting</h2>
                <p>Adjust which setting you want syncronized.</p>
              </div>
            </NavLink>
            <NavLink to="/setting/general" className={'setting-option'}>
              <div className="setting-option-icon">
                <i className="solid gear"></i>
              </div>
              <div className="setting-option-text">
                <h2>General Setting</h2>
                <p>Check and update your set general setting.</p>
              </div>
            </NavLink>
          </div>
        </div>
      </div>
    </div>
  );
}
