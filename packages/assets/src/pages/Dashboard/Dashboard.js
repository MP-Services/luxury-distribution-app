import React, {useState} from 'react';
import {Layout, Page, SettingToggle, Text} from '@shopify/polaris';
import {useStore} from '@assets/reducers/storeReducer';
import '../../styles/pages/dashboard.scss';
import ToggleMenu from '../../components/ToogleMenu/ToggleMenu';
import {useMenu} from '@assets/reducers/menuReducer';
import {setLoader, setToast} from '@assets/actions/storeActions';
import {api} from '@assets/helpers';
import useFetchApi from '@assets/hooks/api/useFetchApi';

/**
 * Render a home page for overview
 *
 * @return {React.ReactElement}
 * @constructor
 */
export default function Dashboard() {
  const [enabled, setEnabled] = useState(false);
  const {data: productsData} = useFetchApi({url: '/dashboard'});
  const {dispatch} = useStore();
  const {isActiveMenu} = useMenu();

  const getProductCount = type => {
    if (productsData.length) {
      switch (type) {
        case 'created':
          return productsData.filter(product => product.queueStatus === 'created').length;
        case 'updated':
          return productsData.filter(product => product.queueStatus === 'updated').length;
        case 'deleted':
          return productsData.filter(product => product.queueStatus === 'deleted').length;
        default:
          return productsData.filter(
            product => product.queueStatus !== 'deleted' && product.syncStatus === 'success'
          ).length;
      }
    }

    return 0;
  };

  const handleRefresh = async () => {
    try {
      setLoader(dispatch);
      const resp = await api('/product/sync');
      if (resp.success) {
        setToast(dispatch, 'Refresh successfully!');
        return true;
      }
    } catch (e) {
      setToast(dispatch, 'Something went wrong!', true);
      console.log('error\n', e);
    } finally {
      setLoader(dispatch, false);
    }
  };

  return (
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
              <button className="btn-card-refresh" onClick={handleRefresh}>
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
                <p className="value">{getProductCount()}</p>
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
                    <p>{getProductCount('created')}</p>
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
                    <p>{getProductCount('updated')}</p>
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
                    <p>{getProductCount('deleted')}</p>
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
