import React, {useState} from 'react';
import {useStore} from '@assets/reducers/storeReducer';
import '../../styles/pages/sync-setting.scss'
import {useMenu} from "@assets/reducers/menuReducer";
import {useHistory} from 'react-router-dom';

/**
 * Render a home page for overview
 *
 * @return {React.ReactElement}
 * @constructor
 */
export default function SyncSetting() {
  const [displayOptionMapping, setDisplayOptionMapping] = useState(false);
  const {dispatch} = useStore();
  const {isActiveMenu} = useMenu();
  const history = useHistory();

  return (
    <div className="main">
      <div className="content-title">
        <div className="header-title">
          <a href="#" onClick={() => history.push('/settings')}>
          <i className="solid arrow-left"></i>
          </a>
          <h2 className="title-detail">Sync Settings</h2>
        </div>
      </div>
      <div className={`content ${isActiveMenu ? 'opacity' : ''}`}>
        <div className="notification">
          <p>
            <i className="solid circle-check"></i>
            <span>Enabling sync settings will initiate the process of updating all products.</span>
          </p>
          <p>
            <i className="solid circle-check"></i>
            <span>Clicking on the save button will restart the process of importing if one is in progress.</span>
          </p>
        </div>
        <div className="table-wrapper">
          <div className="table-info-top">
            <div className="info-card info-retailer">
              <p className="info-url">
                Retailer: <span>luxury-distribution.com</span>
              </p>
            </div>
            <div className="info-card info-dropshipper">
              <p className="info-url">
                Dropshipper: <span>elixiremarketing.myshopify.com</span>
              </p>
            </div>
          </div>
          <div className="table-sync-setting">
            <div className="sync-title">
              <p>Sync setting</p>
            </div>
            <div className="sync-items">
                            <span className="sync-item">
                                <i className="check"></i>
                                <span>SKU</span>
                            </span>
              <span className="sync-item">
                                <i className="check"></i>
                                <span>Title</span>
                            </span>
              <span className="sync-item">
                                <i className="check"></i>
                                <span>Price</span>
                            </span>
              <span className="sync-item">
                                <i className="check"></i>
                                <span>Desc</span>
                            </span>
              <span className="sync-item">
                                <i className="check"></i>
                                <span>Categories</span>
                            </span>
              <span className="sync-item">
                                <i className="check"></i>
                                <span>Images</span>
                            </span>
              <span className="sync-item">
                                <i className="check"></i>
                                <span>Tags</span>
                            </span>
              <span className="sync-item">
                                <i className="check"></i>
                                <span>EAN</span>
                            </span>
            </div>
          </div>
          <div className="table-main">
            <div className="row-middle">
              <form id="sync-setting-form" action="">
                <div className="sync-options">
                  <div className="form-group">
                    <div className="sync-option">
                      <label htmlFor="">SKU</label>
                      <input type="checkbox" name="" />
                    </div>
                    <div className="sync-option-tooltip">
                    </div>
                  </div>
                  <div className="form-group">
                    <div className="sync-option">
                      <label htmlFor="">Title</label>
                      <input type="checkbox" name=""  />
                    </div>
                    <div className="sync-option-tooltip">
                    </div>
                  </div>
                  <div className="form-group">
                    <div className="sync-option">
                      <label htmlFor="">Price</label>
                      <input type="checkbox" name=""  />
                    </div>
                    <div className="sync-option-tooltip">
                    </div>
                  </div>
                  <div className="form-group">
                    <div className="sync-option">
                      <label htmlFor="">Description</label>
                      <input type="checkbox" name=""/>
                    </div>
                    <div className="sync-option-tooltip">
                    </div>
                  </div>
                  <div className="form-group">
                    <div className="sync-option">
                      <label htmlFor="">Categories</label>
                      <input type="checkbox" name=""  />
                    </div>
                    <div className="sync-option-tooltip">
                      <p>By disabling the "Categories feature, if changes to the category mapping are applied the products will be placed in wrong categones. To avoid this, make sure to keep the feature enabled.</p>
                    </div>
                  </div>
                  <div className="form-group">
                    <div className="sync-option">
                      <label htmlFor="">Images</label>
                      <input type="checkbox" name="" />
                    </div>
                    <div className="sync-option-tooltip">
                    </div>
                  </div>
                  <div className="form-group">
                    <div className="sync-option">
                      <label htmlFor="">Tags</label>
                      <input type="checkbox" name=""  />
                    </div>
                    <div className="sync-option-tooltip">
                    </div>
                  </div>
                  <div className="form-group">
                    <div className="sync-option">
                      <label htmlFor="">EAN</label>
                      <input type="checkbox" name="" />
                    </div>
                    <div className="sync-option-tooltip">
                    </div>
                  </div>
                </div>
              </form>
            </div>
            <div className="row-bottom">
              <div className="table-actions">
                <button type="submit" form="sync-setting-form" className="btn-save">Save</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
);
}
