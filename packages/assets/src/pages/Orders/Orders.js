import React from 'react';
import ToggleMenu from '@assets/components/ToogleMenu/ToggleMenu';
import {useMenu} from '../../reducers/menuReducer';
import '../../styles/pages/orders.scss';

/**
 * Just render a sample page
 *
 * @return {React.ReactElement}
 * @constructor
 */
export default function Orders() {
  const {isActiveMenu} = useMenu();

  return (
    <div className={`main ${isActiveMenu ? 'opacity' : ''}`}>
      <div className="content-title">
        <div className="header-title">
          <ToggleMenu />
          <h2 className="title-detail">Orders</h2>
        </div>
      </div>
      <div className="orders-detail">
        <div className="orders-detail-table">
          <div className="table-header">
            <span className="span-table-title">Data table</span>
            <div className="items-per-page" style={{position: 'relative'}}>
              <div className="select-wrapper">
                <button className="select-btn-item">08 items per page</button>
                <i className="fa-solid fa-chevron-down"></i>
              </div>
              <ul className="select-content">
                <li className="number-of-page">10 items per page</li>
                <li className="number-of-page">15 items per page</li>
                <li className="number-of-page">20 items per page</li>
              </ul>
            </div>
          </div>
          <div className="orders-table-content">
            <table className="table" style={{width: '100%', textAlign: 'left', borderSpacing: 0}}>
              <thead>
                <tr>
                  <th className="col-nb-1">Retailer Order ID</th>
                  <th className="col-nb-2">Dropshipper Order ID</th>
                  <th className="order-status col-nb-3">Successful</th>
                  <th className="col-nb-4">Created By</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td data-th="Retail Order Id">JKAKDKKAA4454S</td>
                  <td data-th="Dropshipper Order Id">JKAKDKKAA4454S</td>
                  <td data-th="Successful" className="order-status">
                    Processing
                  </td>
                  <td data-th="Created">Feb 13, 2024 10:16 AM</td>
                </tr>
                <tr>
                  <td data-th="Retail Order Id">JKAKDKKAA4454S</td>
                  <td data-th="Dropshipper Order Id">JKAKDKKAA4454S</td>
                  <td data-th="Successful" className="order-status">
                    Successfull
                  </td>
                  <td data-th="Created">Feb 13, 2024 10:16 AM</td>
                </tr>
                <tr>
                  <td data-th="Retail Order Id">JKAKDKKAA4454S</td>
                  <td data-th="Dropshipper Order Id">JKAKDKKAA4454S</td>
                  <td data-th="Successful" className="order-status">
                    Processing
                  </td>
                  <td data-th="Created">Feb 13, 2024 10:16 AM</td>
                </tr>
                <tr>
                  <td data-th="Retail Order Id">JKAKDKKAA4454S</td>
                  <td data-th="Dropshipper Order Id">JKAKDKKAA4454S</td>
                  <td data-th="Successful" className="order-status">
                    Processing
                  </td>
                  <td data-th="Created">Feb 13, 2024 10:16 AM</td>
                </tr>
                <tr>
                  <td data-th="Retail Order Id">JKAKDKKAA4454S</td>
                  <td data-th="Dropshipper Order Id">JKAKDKKAA4454S</td>
                  <td data-th="Successful" className="order-status">
                    Processing
                  </td>
                  <td data-th="Created">Feb 13, 2024 10:16 AM</td>
                </tr>
                <tr>
                  <td data-th="Retail Order Id">JKAKDKKAA4454S</td>
                  <td data-th="Dropshipper Order Id">JKAKDKKAA4454S</td>
                  <td data-th="Successful" className="order-status">
                    Processing
                  </td>
                  <td data-th="Created">Feb 13, 2024 10:16 AM</td>
                </tr>
                <tr>
                  <td data-th="Retail Order Id">JKAKDKKAA4454S</td>
                  <td data-th="Dropshipper Order Id">JKAKDKKAA4454S</td>
                  <td data-th="Successful" className="order-status">
                    Processing
                  </td>
                  <td data-th="Created">Feb 13, 2024 10:16 AM</td>
                </tr>
                <tr>
                  <td data-th="Retail Order Id">JKAKDKKAA4454S</td>
                  <td data-th="Dropshipper Order Id">JKAKDKKAA4454S</td>
                  <td data-th="Successful" className="order-status">
                    Processing
                  </td>
                  <td data-th="Created">Feb 13, 2024 10:16 AM</td>
                </tr>
              </tbody>
            </table>
          </div>
          <div className="pagination-wrapper">
            <div className="previous-btn">
              <i className="fa-solid fa-angle-left"></i>
              <span className="pre-label">Previous</span>
            </div>
            <div className="pagination-items">
              <div className="pagi-item pagi-active">1</div>
              <div className="pagi-item">2</div>
              <div className="pagi-item">3</div>
              <div className="pagi-item pg-sm">4</div>
              <div className="pagi-item">...</div>
              <div className="pagi-item">10</div>
            </div>
            <div className="next-btn">
              <span className="next-label">Next</span>
              <i className="fa-solid fa-angle-right"></i>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
