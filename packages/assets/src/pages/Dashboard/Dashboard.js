import React, {useState} from 'react';
import {Layout, Page, SettingToggle, Text} from '@shopify/polaris';
import {useStore} from '@assets/reducers/storeReducer';
import '../../styles/pages/dashboard.scss'
import ToggleMenu from '../../components/ToogleMenu/ToggleMenu';
import {useMenu} from "@assets/reducers/menuReducer";

/**
 * Render a home page for overview
 *
 * @return {React.ReactElement}
 * @constructor
 */
export default function Dashboard() {
  const [enabled, setEnabled] = useState(false);
  const {dispatch} = useStore();
  const {isActiveMenu} = useMenu();

  return (
    <div className="wrapper">
      <div className="main">
        <div className="content-title">
          <div className="header-title">
            <ToggleMenu />
            <h2 className="title-detail">Dashboard</h2>
          </div>
        </div>
        <div className={`content ${isActiveMenu ? 'opacity' : ''}`}>
          <div className="cards-wrapper">
            <div className="card product-card">
              <div className="card-header">
                <h2>Products</h2>
                <button className="btn-card-refresh">
                  <i className="refresh"></i>
                  Refresh
                </button>
              </div>
              <div className="card-body">
                <div className="card-body-top">
                  <div className="info-cell">
                    <h3>Retailer</h3>
                    <p>luxury-distribution.com</p>
                  </div>
                  <div className="info-cell">
                    <h3>Dropshipper</h3>
                    <p>elixiremarketing.myshopify.com</p>
                  </div>
                </div>
                <div className="card-body-bottom">
                  <p className="title">Total Products</p>
                  <p className="value">14,274</p>
                </div>
              </div>
              <div className="card-footer">
                <div className="card-footer-top">
                  <p>Queue Info</p>
                </div>
                <div className="card-footer-bottom">
                  <div className="info-cell">
                    <div className="cell-top">
                                        <span>
                                            <i className="solid file-plus"></i>
                                            Create
                                        </span>
                    </div>
                    <div className="cell-bottom">
                      <p>125</p>
                    </div>
                  </div>
                  <div className="info-cell">
                    <div className="cell-top">
                                        <span>
                                            <i className="solid rotate"></i>
                                            Update
                                        </span>
                    </div>
                    <div className="cell-bottom">
                      <p>95</p>
                    </div>
                  </div>
                  <div className="info-cell">
                    <div className="cell-top">
                                        <span>
                                            <i className="solid trash-can"></i>
                                            Delete
                                        </span>
                    </div>
                    <div className="cell-bottom">
                      <p>256</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
