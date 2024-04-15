import React, {useState} from 'react';
import {useStore} from '@assets/reducers/storeReducer';
import '../../styles/pages/brand-filter.scss'
import {useMenu} from "@assets/reducers/menuReducer";

/**
 * Render a home page for overview
 *
 * @return {React.ReactElement}
 * @constructor
 */
export default function BrandFilter() {
  const [displayOptionMapping, setDisplayOptionMapping] = useState(false);
  const {dispatch} = useStore();
  const {isActiveMenu} = useMenu();

  return (
    <div className="main">
      <div className="content-title">
        <div className="header-title">
          <a href="/settings/settings/settings.html">
            <i className="solid arrow-left"></i>
          </a>
          <h2 className="title-detail">Brand Filter</h2>
        </div>
      </div>
      <div className={`content ${isActiveMenu ? 'opacity' : ''}`}>
        <div className="notification">
          <p>
            <i className="solid circle-check"></i>
            <span>The brands filtering settings allow you to include and exclude brands when needed. Please check/uncheck the brands and save your changes.</span>
          </p>
          <p>
            <i className="solid circle-check"></i>
            <span>Please save your changes and allow 24 hours for them to be applied.</span>
          </p>
        </div>
        <div className="table-wrapper">
          <div className="table-info-top">
            <div className="info-card info-retailer">
              <p className="info-url">
                Retailer: <span>luxury-distribution.com</span>
              </p>
              <hr/>
                <p className="info-currency">
                  Currency: <span>EUR</span>
                </p>
            </div>
            <div className="info-card info-dropshipper">
              <p className="info-url">
                Dropshipper: <span>elixiremarketing.myshopify.com</span>
              </p>
              <hr/>
                <p className="info-currency">
                  Currency: <span>EUR</span>
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
            <div className="row-top">
              <div className="table-message">
                <i className="solid info">
                  <svg viewBox="3 3 26 26" width="16" height="16" xmlns="http://www.w3.org/2000/svg">
                    <path d="M16,3C8.83,3,3,8.83,3,16c0,7.17,5.83,13,13,13s13-5.83,13-13C29,8.83,23.17,3,16,3z M17,22c0,0.553-0.447,1-1,1 s-1-0.447-1-1v-8c0-0.553,0.447-1,1-1s1,0.447,1,1V22z M16,11c-0.552,0-1-0.448-1-1c0-0.552,0.448-1,1-1s1,0.448,1,1 C17,10.552,16.552,11,16,11z" style={{fill: "rgb(106, 106, 106)"}} transform="matrix(1, 0, 0, 1, 0, -4.440892098500626e-16)"/>
                  </svg>
                </i>
                On this page you can exclude brands if needed. It's enough to just uncheck the brands that you don't need and save
              </div>
            </div>
            <div className="row-middle">
              <div className="filter-wrapper">
                <form id="brand-filter-form" action="">
                  <div className="filter-actions">
                    <div className="form-group">
                      <input type="checkbox" name="filter_select_all" id="filter_select_all" />
                        <label htmlFor="filter_select_all">Select All</label>
                    </div>
                  </div>
                  <div className="filter-options">
                    <div className="form-group">
                      <input type="checkbox" name=""/>
                        <label>032C</label>
                    </div>
                    <div className="form-group">
                      <input type="checkbox" name=""/>
                      <label >032C</label>
                    </div>
                    <div className="form-group">
                      <input type="checkbox" name=""/>
                      <label htmlFor="filter-options">032C</label>
                    </div>
                    <div className="form-group">
                      <input type="checkbox" name=""/>
                      <label htmlFor="filter-options">032C</label>
                    </div>   <div className="form-group">
                    <input type="checkbox" name=""/>
                    <label htmlFor="filter-options">032C</label>
                  </div>   <div className="form-group">
                    <input type="checkbox" name=""/>
                    <label htmlFor="filter-options">032C</label>
                  </div>   <div className="form-group">
                    <input type="checkbox" name=""/>
                    <label htmlFor="filter-options">032C</label>
                  </div>   <div className="form-group">
                    <input type="checkbox" name=""/>
                    <label htmlFor="filter-options">032C</label>
                  </div>





                  </div>
                </form>
              </div>
            </div>
            <div className="row-bottom">
              <div className="table-actions">
                <button type="button" className="btn-save">Save</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
);
}
