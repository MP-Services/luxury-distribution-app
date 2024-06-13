import React, {useEffect} from 'react';
import '../../styles/pages/sync-setting.scss';
import {useMenu} from '@assets/reducers/menuReducer';
import {useHistory} from 'react-router-dom';
import useFetchApi from '@assets/hooks/api/useFetchApi';
import {api} from '@assets/helpers';
import SyncSettingHeader from '@assets/components/SyncSettingHeader/SyncSettingHeader';
import syncSetting from '@avada/functions/src/const/settings/sync';
import {setToast, setLoader} from '@assets/actions/storeActions';
import {useStore} from '@assets/reducers/storeReducer';
import ToggleMenu from '@assets/components/ToogleMenu/ToggleMenu';
import TableInfoHeader from '@assets/components/TableInfoHeader/TableInfoHeader';

/**
 * Render a home page for overview
 *
 * @return {React.ReactElement}
 * @constructor
 */
export default function SyncSetting() {
  const {data: input, setData: setInput, loading} = useFetchApi({
    url: '/setting/sync',
    defaultData: syncSetting
  });
  const {dispatch} = useStore();
  const {isActiveMenu} = useMenu();
  const history = useHistory();
  const handleChangeInput = (key, value) => {
    setInput(preInput => ({
      ...preInput,
      [key]: value
    }));
  };

  const handleSubmit = async e => {
    try {
      setLoader(dispatch);
      e.preventDefault();
      const resp = await api('/setting/sync', {method: 'POST', body: input});
      if (resp.success) {
        setToast(dispatch, 'Saved Successfully!');
        return true;
      }
    } catch (e) {
      setToast(dispatch, 'Something went wrong!', true);
      console.log('error\n', e);
    } finally {
      setLoader(dispatch, false);
    }
  };

  useEffect(() => {
    setLoader(dispatch, loading);
  }, [loading]);

  return (
    <div className="main">
      <div className="content-title">
        <div className="header-title">
          <ToggleMenu />
          <a href="#" onClick={() => history.push('/settings')}>
            <i className="solid arrow-left"></i>
          </a>
          <h2 className="title-detail">Sync Settings</h2>
        </div>
      </div>
      <div className={`content sync-settings ${isActiveMenu ? 'opacity' : ''}`}>
        <div className="notification">
          <p>
            <i className="solid circle-check"></i>
            <span>Enabling sync settings will initiate the process of updating all products.</span>
          </p>
          <p>
            <i className="solid circle-check"></i>
            <span>
              Clicking on the save button will restart the process of importing if one is in
              progress.
            </span>
          </p>
        </div>
        <div className="table-wrapper">
          <TableInfoHeader isDisplayCurrency={false} />
          <SyncSettingHeader syncSettingData={input} />
          <div className="table-main">
            <div className="row-middle">
              <form id="sync-setting-form" onSubmit={handleSubmit}>
                <div className="sync-options">
                  <div className="form-group">
                    <div className="sync-option">
                      <label htmlFor="">SKU</label>
                      <input
                        disabled
                        checked={input.sku}
                        type="checkbox"
                        onChange={e => handleChangeInput('sku', e.target.checked)}
                      />
                    </div>
                    <div className="sync-option-tooltip"></div>
                  </div>
                  <div className="form-group">
                    <div className="sync-option">
                      <label htmlFor="">Title</label>
                      <input
                        disabled
                        checked={input.title}
                        type="checkbox"
                        onChange={e => handleChangeInput('title', e.target.checked)}
                      />
                    </div>
                    <div className="sync-option-tooltip"></div>
                  </div>
                  <div className="form-group">
                    <div className="sync-option">
                      <label htmlFor="">Price</label>
                      <input
                        disabled
                        checked={input.price}
                        type="checkbox"
                        onChange={e => handleChangeInput('price', e.target.checked)}
                      />
                    </div>
                    <div className="sync-option-tooltip"></div>
                  </div>
                  <div className="form-group">
                    <div className="sync-option">
                      <label htmlFor="">Description</label>
                      <input
                        checked={input.description}
                        type="checkbox"
                        onChange={e => handleChangeInput('description', e.target.checked)}
                      />
                    </div>
                    <div className="sync-option-tooltip"></div>
                  </div>
                  <div className="form-group">
                    <div className="sync-option">
                      <label htmlFor="">Categories</label>
                      <input
                        checked={input.categories}
                        type="checkbox"
                        onChange={e => handleChangeInput('categories', e.target.checked)}
                      />
                    </div>
                    <div className="sync-option-tooltip">
                      <p>
                        By disabling the "Categories feature, if changes to the category mapping are
                        applied the products will be placed in wrong categones. To avoid this, make
                        sure to keep the feature enabled.
                      </p>
                    </div>
                  </div>
                  <div className="form-group">
                    <div className="sync-option">
                      <label htmlFor="">Images</label>
                      <input
                        checked={input.images}
                        type="checkbox"
                        onChange={e => handleChangeInput('images', e.target.checked)}
                      />
                    </div>
                    <div className="sync-option-tooltip"></div>
                  </div>
                  <div className="form-group">
                    <div className="sync-option">
                      <label htmlFor="">Tags</label>
                      <input
                        checked={input.tags}
                        type="checkbox"
                        onChange={e => handleChangeInput('tags', e.target.checked)}
                      />
                    </div>
                    <div className="sync-option-tooltip"></div>
                  </div>
                  <div className="form-group">
                    <div className="sync-option">
                      <label htmlFor="">EAN</label>
                      <input
                        checked={input.ean}
                        type="checkbox"
                        onChange={e => handleChangeInput('ean', e.target.checked)}
                      />
                    </div>
                    <div className="sync-option-tooltip"></div>
                  </div>
                </div>
              </form>
            </div>
            <div className="row-bottom">
              <div className="table-actions">
                <button type="submit" form="sync-setting-form" className="btn-save">
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
