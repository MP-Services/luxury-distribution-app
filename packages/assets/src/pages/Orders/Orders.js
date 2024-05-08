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
            <div className="items-per-page">
              <select name="" id="" defaultValue={8} className="per-page-select">
                <option value="1">01 items per page</option>
                <option value="2">02 items per page</option>
                <option value="3">03 items per page</option>
                <option value="4">04 items per page</option>
                <option value="8">08 items per page</option>
              </select>
            </div>
          </div>
          <div className="orders-table-content">
            <table className="table" style={{width: '100%', textAlign: 'left', borderSpacing: 0}}>
              <thead>
                <tr>
                  <th>Retailer Order ID</th>
                  <th>Dropshipper Order ID</th>
                  <th className="order-status">Successful</th>
                  <th>Created By</th>
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
                    Successful
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
            <button className="paging-option">
              <i className="fa-solid fa-angle-left"></i>
              <span>Previous</span>
            </button>
            <div className="pagination-items">
              <div className="pagi-item pagi-active">1</div>
              <div className="pagi-item">2</div>
              <div className="pagi-item">3</div>
              <div className="pagi-item pg-sm">4</div>
              <div className="pagi-item">...</div>
              <div className="pagi-item">10</div>
            </div>
            <button className="paging-option">
              <span>Next</span>
              <i className="fa-solid fa-angle-right"></i>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
