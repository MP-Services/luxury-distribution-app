import React, {useState} from 'react';
import {useStore} from '@assets/reducers/storeReducer';
import '../../styles/pages/general-setting.scss';
import '../../styles/pages/category-mapping.scss';
import '../../styles/pages/orders.scss';
import ToggleMenu from '../../components/ToogleMenu/ToggleMenu';
import {useMenu} from '@assets/reducers/menuReducer';
import {useHistory} from 'react-router-dom';
import {setToast, setLoader} from '@assets/actions/storeActions';
import {api} from '@assets/helpers';
import useFetchApi from '@assets/hooks/api/useFetchApi';
import {InlineError} from '@shopify/polaris';

/**
 * Render a home page for overview
 *
 * @return {React.ReactElement}
 * @constructor
 */
export default function GeneralSetting() {
  const {data: input, setData: setInput} = useFetchApi({url: '/setting/general'});
  const {dispatch} = useStore();
  const {isActiveMenu} = useMenu();
  const history = useHistory();
  const [showRequiredFields, setShowRequiredFields] = useState({});

  const handleChangeInput = (key, value) => {
    setInput(prevInput => ({
      ...prevInput,
      [key]: value
    }));
  };

  const handleChangeRequiredFields = (key, value) => {
    setShowRequiredFields(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const validateMessage = key => {
    const value = input[key];
    if (!value) {
      return 'This field is required.';
    }

    if (key === 'customerEmail' && !/^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,4}$/i.test(value)) {
      return 'Invalid email address';
    }

    return '';
  };

  const handleSave = async (e, key) => {
    try {
      setLoader(dispatch);
      e.preventDefault();
      let postData = input;
      if (key) {
        handleChangeRequiredFields(key, false);
        postData = {[key]: input[key]};
        if (!postData[key]) {
          handleChangeRequiredFields(key, true);

          return;
        }
      }
      const resp = await api('/setting/general', {method: 'POST', body: postData});
      if (resp.success) {
        setToast(dispatch, 'Saved successfully!');
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
          <a href="#" onClick={() => history.push('/settings')}>
            <i className="solid arrow-left"></i>
          </a>
          <h2 className="title-detail">General Settings</h2>
        </div>
      </div>
      <div className={`content ${isActiveMenu ? 'opacity' : ''}`}>
        <div className="notification">
          <p>
            <i className="solid circle-check"></i>
            <span>
              If you change your current email address, a check will be run to see if such email is
              registered with the retailer.
            </span>
          </p>
          <p>
            <i className="solid circle-check"></i>
            <span>
              If you change the previously set language, currency or price rounding rule, the
              process of updating all products will be started
            </span>
          </p>
        </div>
        <div className="form-check-wrapper">
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
            <div className="customer-email">
              <form
                action=""
                className="check-customer"
                onSubmit={e => handleSave(e, 'customerEmail')}
              >
                <label className="customer-title" htmlFor="email">
                  Customer Email<span> *</span>
                </label>
                <input
                  value={input.customerEmail ? input.customerEmail : ''}
                  type="email"
                  name="email"
                  placeholder="Email"
                  onChange={e => handleChangeInput('customerEmail', e.target.value)}
                />
                {showRequiredFields.customerEmail && (
                  <InlineError
                    message={validateMessage('customerEmail', input.customerEmail)}
                    fieldID={'customer-email-error'}
                  />
                )}
                <button name="check-email-btn" className="checksave-btn">
                  Run Check & Save
                </button>
              </form>
            </div>
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
            <div className="customer-email">
              <form action="" className="check-customer" onSubmit={handleSave}>
                <div className="language-currency">
                  <div className="language-select">
                    <label className="customer-title" htmlFor="language">
                      Language<span> *</span>
                    </label>
                    <select
                      defaultValue={input.language ? input.language : 'en'}
                      name="language"
                      onChange={e => handleChangeInput('language', e.target.value)}
                    >
                      <option value="en">English</option>
                    </select>
                    <i>Language for products.</i>
                  </div>
                  <div className="currency-select">
                    <label className="customer-title" htmlFor="currency">
                      Currency<span> *</span>
                    </label>
                    <select
                      defaultValue={input.currency ? input.currency : 'eur'}
                      name="currency"
                      onChange={e => handleChangeInput('currency', e.target.value)}
                    >
                      <option value="eur">EUR</option>
                    </select>
                  </div>
                </div>
                <div className="price-rouding">
                  <label className="customer-title" htmlFor="price">
                    Price Rounding<span> *</span>
                  </label>
                  <select
                    defaultValue={input.pricesRounding ? input.pricesRounding : 'xxx9.00'}
                    name="price"
                    onChange={e => handleChangeInput('pricesRounding', e.target.value)}
                  >
                    <option value="xxx9.00">XXX9.00</option>
                  </select>
                </div>
                <div className="checkboxes">
                  <div className="checkbox-item">
                    <label className="customer-title" htmlFor="">
                      Delete Out of Stock Items
                    </label>
                    <div className="form-note">
                      <input
                        value="delete-out-stock"
                        checked={input.deleteOutStock}
                        type="checkbox"
                        name="delete-out-stock"
                        onChange={e => handleChangeInput('deleteOutStock', e.target.checked)}
                      />
                      <i>
                        (This flag defines if products or product variations need to be deleted if
                        they received out of stock status.)
                      </i>
                    </div>
                  </div>
                  <div className="checkbox-item">
                    <label className="customer-title" htmlFor="">
                      Items New Products As Draft
                    </label>
                    <div className="form-note">
                      <input
                        value="product-draft"
                        checked={input.productAsDraft}
                        type="checkbox"
                        name="product-draft"
                        onChange={e => handleChangeInput('productAsDraft', e.target.checked)}
                      />
                      <i>
                        (When this option is enabled, all newly imported products will not be
                        visible on the site. After importing such products, the status will need to
                        be changed manually.)
                      </i>
                    </div>
                  </div>
                  <div className="checkbox-item">
                    <label className="customer-title" htmlFor="">
                      Include Brand To product Name
                    </label>
                    <div className="form-note">
                      <input
                        value="include-brand"
                        type="checkbox"
                        name="include-brand"
                        checked={input.includeBrand}
                        onChange={e => handleChangeInput('includeBrand', e.target.checked)}
                      />
                      <i>
                        (The flag defines if product name needs to contain brand name. Also, pay
                        attention that the max length of product name for youe store is 255 symbols
                        and product name can be cut.)
                      </i>
                    </div>
                  </div>
                </div>
                <button name="config-btn" className="checksave-btn">
                  Save
                </button>
              </form>
            </div>
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
            <div className="customer-email">
              <form
                action=""
                className="check-customer"
                onSubmit={e => handleSave(e, 'shopifyToken')}
              >
                <label className="customer-title" htmlFor="token">
                  Access Token<span> *</span>
                </label>
                <input
                  value={input.shopifyToken ? input.shopifyToken : ''}
                  type="text"
                  name="token"
                  placeholder="token"
                  onChange={e => handleChangeInput('shopifyToken', e.target.value)}
                />
                {showRequiredFields.shopifyToken && (
                  <InlineError
                    message={validateMessage('shopifyToken')}
                    fieldID={'access-token-error'}
                  />
                )}
                <button name="check-token-btn" className="checksave-btn">
                  Run Check & Save
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
