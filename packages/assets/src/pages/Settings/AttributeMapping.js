import React, {useState} from 'react';
import {useStore} from '@assets/reducers/storeReducer';
import '../../styles/pages/attribute-mapping.scss';
import {useMenu} from '@assets/reducers/menuReducer';
import {useHistory} from 'react-router-dom';
import ToggleMenu from '@assets/components/ToogleMenu/ToggleMenu';

/**
 * Render a home page for overview
 *
 * @return {React.ReactElement}
 * @constructor
 */
export default function AttributeMapping() {
  const [displayOptionMapping, setDisplayOptionMapping] = useState(false);
  const {dispatch} = useStore();
  const {isActiveMenu} = useMenu();
  const history = useHistory();

  return (
    <div className="main">
      <div className="content-title">
        <div className="header-title">
          <ToggleMenu />
          <a href="#" onClick={() => history.push('/settings')}>
            <i className="solid arrow-left"></i>
          </a>
          <h2 className="title-detail">Attribute Mapping</h2>
        </div>
      </div>
      <div className={`content ${isActiveMenu ? 'opacity' : ''}`}>
        <div className="notification">
          <p>
            <i className="solid circle-check"></i>
            <span>Please save your changes and allow 24 hours for them to be applied</span>
          </p>
          <p>
            <i className="solid circle-check"></i>
            <span>
              It is recommend to use a unique value for a single attribute in the field for options
              mapping. In case a product has duplicate options for a single attribute, those will be
              reset with default values
            </span>
          </p>
        </div>
        <div className="table-wrapper">
          <div className="table-info-top">
            <div className="info-card info-retailer">
              <p className="info-url">
                Retailer: <span>luxury-distribution.com</span>
              </p>
              <hr />
              <p className="info-currency">
                Currency: <span>EUR</span>
              </p>
            </div>
            <div className="info-card info-dropshipper">
              <p className="info-url">
                Dropshipper: <span>elixiremarketing.myshopify.com</span>
              </p>
              <hr />
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
            <div className="row-top"></div>
            <div className="row-middle">
              <div className="attribute-mapping-table css-grid-table">
                <div className="mapping-row row-header css-grid-table-header">
                  <div className="cell header-cell">#</div>
                  <div className="cell header-cell">Retailer Attribute Name</div>
                  <div className="cell header-cell">Dropshipper Attribute Name</div>
                  <div className="cell header-cell actions"></div>
                </div>
                <div className="mapping-row css-grid-table-row">
                  <div className="cell">1</div>
                  <div className="cell">
                    <select className="retailer-attribute-name" name="retailer_attribute_name">
                      <option value="0">
                        Siz asd asd asd asd asd asd asd asd asd jhasgdj asgjh dgjhasg djhgasjhdg
                        asjhdg jasdjh asjhde
                      </option>
                    </select>
                  </div>
                  <div className="cell">
                    <input
                      className="dropshipper-attribute-name clearable"
                      name="dropshipper_attribute_name"
                    />
                  </div>

                  <div className="cell actions">
                    <button
                      className="btn btn-primary option-mapping"
                      onClick={() => setDisplayOptionMapping(!displayOptionMapping)}
                    >
                      <span>Option Mapping</span>
                    </button>
                  </div>
                  {displayOptionMapping && (
                    <div className="option-mapping-table css-grid-table">
                      <div className="mapping-row row-header css-grid-table-header">
                        <div className="cell header-cell">#</div>
                        <div className="cell header-cell retailer-option-name">
                          Retailer Option Name
                        </div>
                        <div className="cell header-cell dropshipper-option-name">
                          Dropshipper Option Name
                        </div>
                      </div>
                      <div className="row-body css-grid-table-body">
                        <div className="mapping-row css-grid-table-row">
                          <div className="cell">1</div>
                          <div className="cell">
                            <p>100 cm / 40 inches</p>
                          </div>
                          <div className="cell">
                            <input
                              className="dropshipper-option-name clearable"
                              name="dropshipper_option_name"
                            />
                          </div>
                        </div>
                        <div className="mapping-row css-grid-table-row">
                          <div className="cell">2</div>
                          <div className="cell">
                            <p>100 cm / 40 inches</p>
                          </div>
                          <div className="cell">
                            <input
                              className="dropshipper-option-name clearable"
                              name="dropshipper_option_name"
                            />
                          </div>
                        </div>
                        <div className="mapping-row css-grid-table-row">
                          <div className="cell">3</div>
                          <div className="cell">
                            <p>100 cm / 40 inches</p>
                          </div>
                          <div className="cell">
                            <input
                              className="dropshipper-option-name clearable"
                              name="dropshipper_option_name"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
            <div className="row-bottom">
              <div className="table-actions">
                <button type="button" className="btn-primary btn-add">
                  <i className="solid plus">
                    <svg
                      fill="#22C3E6"
                      viewBox="0 0 64 64"
                      width="16"
                      height="16"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        d="M 32.001 0.437 C 49.431 0.437 63.563 14.569 63.563 31.999 C 63.563 49.431 49.431 63.563 32.001 63.563 C 14.569 63.563 0.437 49.431 0.437 31.999 C 0.437 14.569 14.569 0.437 32.001 0.437 Z M 43.477 34.87 C 45.061 34.87 46.347 33.585 46.347 31.999 C 46.347 30.414 45.061 29.131 43.477 29.131 C 43.121 29.131 39.298 29.131 34.869 29.131 C 34.869 24.702 34.869 20.879 34.869 20.523 C 34.869 18.939 33.586 17.653 32.001 17.653 C 30.417 17.653 29.13 18.939 29.13 20.523 C 29.13 20.879 29.13 24.702 29.13 29.131 C 24.702 29.131 20.878 29.131 20.522 29.131 C 18.939 29.131 17.653 30.414 17.653 31.999 C 17.653 33.585 18.939 34.87 20.522 34.87 C 20.878 34.87 24.702 34.87 29.13 34.87 C 29.13 39.298 29.13 43.122 29.13 43.478 C 29.13 45.061 30.417 46.347 32.001 46.347 C 33.586 46.347 34.869 45.061 34.869 43.478 C 34.869 43.122 34.869 39.298 34.869 34.87 C 39.298 34.87 43.121 34.87 43.477 34.87 Z"
                        style={{fill: '#fff'}}
                      />
                    </svg>{' '}
                  </i>
                  Add Mapping
                </button>
                <button type="button" className="btn-primary btn-save">
                  Save
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
