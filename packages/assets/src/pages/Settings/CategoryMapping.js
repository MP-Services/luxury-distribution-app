import React, {useState} from 'react';
import {useStore} from '@assets/reducers/storeReducer';
import '../../styles/pages/category-mapping.scss';
import {useMenu} from '@assets/reducers/menuReducer';
import {useHistory} from 'react-router-dom';
import SyncSettingHeader from '@assets/components/SyncSettingHeader/SyncSettingHeader';
import useFetchApi from '@assets/hooks/api/useFetchApi';
import categoryMapping from '@assets/loadables/Settings/CategoryMapping';
import {setLoader, setToast} from '@assets/actions/storeActions';
import {api} from '@assets/helpers';

/**
 * Render a home page for overview
 *
 * @return {React.ReactElement}
 * @constructor
 */
export default function CategoryMapping() {
  const {data: dropShipperCollections} = useFetchApi({url: '/setting/categorymapping/collections'});
  const {data: retailerCategories} = useFetchApi({url: '/setting/categorymapping/retailercat'});
  const {data: catMappingData, setData: setCatMappingData} = useFetchApi({
    url: '/setting/categorymapping'
  });
  const [addedMappingRows, setAddedMappingRows] = useState([]);
  const [editedMappingRows, setEditedMappingRows] = useState([]);
  const [deletedMappingRows, setDeletedMappingRows] = useState([]);
  const {dispatch} = useStore();
  const {isActiveMenu} = useMenu();
  const history = useHistory();

  const handleAddMappingRow = () => {
    const newRow = {
      id: Date.now(),
      retailerId: retailerCategories[0].catId,
      dropShipperId: dropShipperCollections[0].admin_graphql_api_id,
      margin: 1
    };

    setAddedMappingRows([...addedMappingRows, newRow]);
  };

  const handleSave = async () => {
    try {
      setLoader(dispatch);
      const resp = await api('/setting/categorymapping', {method: 'POST', body: addedMappingRows});
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

  const handleChangeInput = (key, id, value) => {
    setAddedMappingRows(prev =>
      prev.map(item => {
        if (item.id === id) {
          item[key] = value;
        }
      })
    );
  };

  if (retailerCategories) {
    retailerCategories.sort((a, b) => {
      const nameA = a.catName.toLowerCase();
      const nameB = b.catName.toLowerCase();

      if (nameA < nameB) {
        return -1;
      }

      return 0;
    });
  }

  if (!retailerCategories.length || !dropShipperCollections.length) {
    return <></>;
  }

  return (
    <div className="main">
      <div className="content-title">
        <div className="header-title">
          <a href="#" onClick={() => history.push('/settings')}>
            <i className="solid arrow-left"></i>
          </a>
          <h2 className="title-detail">Category Mapping</h2>
        </div>
      </div>
      <div className={`content ${isActiveMenu ? 'opacity' : ''}`}>
        <div className="notification">
          <p>
            <i className="solid circle-check"></i>
            <span>
              For a faster import or update, configure all mappings per time and then save your
              changes.
            </span>
          </p>
          <p>
            <i className="solid circle-check"></i>
            <span>
              All parent categories can contain products of all child categories, in case there are
              different margins, the lowest one will be applied and in case there are different
              fixed shipping values, the maximum one will be applied.
            </span>
          </p>
          <p>
            <i className="solid circle-check"></i>
            <span>Please note that margin changes could take up to 24 hours to update.</span>
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
                Retailer: <span>elixiremarketing.myshopify.com</span>
              </p>
              <hr />
              <p className="info-currency">
                Currency: <span>EUR</span>
              </p>
            </div>
          </div>
          <SyncSettingHeader />
          <div className="table-main">
            <div className="row-top"></div>
            <div className="row-middle">
              <table className="category-mapping-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Retailer Category</th>
                    <th>Dropshipper Category</th>
                    <th>Margin</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {catMappingData.map((catMapping, index) => (
                    <tr key={index}>
                      <td data-th="#">{index + 1}</td>
                      <td data-th="Retailer Category">
                        {
                          retailerCategories.find(
                            element => element.catId === catMapping.retailerId
                          ).catName
                        }
                      </td>
                      <td data-th="Dropshipper Category">
                        {
                          dropShipperCollections.find(
                            element => element.admin_graphql_api_id === catMapping.dropShipperId
                          ).title
                        }
                      </td>
                      <td data-th="Margin">{catMapping.margin}</td>
                      <td data-th="Action" className="row-actions">
                        <button type="button" className="action edit">
                          <i className="edit"></i>
                        </button>
                        <button type="button" className="action delete">
                          <i className="trash-can"></i>
                        </button>
                      </td>
                    </tr>
                  ))}
                  {addedMappingRows.map(row => (
                    <tr key={row.id}>
                      <td data-th="#">1</td>
                      <td data-th="Retailer Category">
                        <select
                          name="retailer_category"
                          id="retailer_category"
                          onChange={e => handleChangeInput('retailerId', row.id, e.target.value)}
                        >
                          {retailerCategories.map(category => (
                            <option key={category.catId} value={category.catId}>
                              {category.catName}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td data-th="Dropshipper Category">
                        <select
                          name="dropshipper_category"
                          id="dropshipper_category"
                          onChange={e => handleChangeInput('dropShipperId', row.id, e.target.value)}
                        >
                          {dropShipperCollections.map(collection => (
                            <option key={collection.id} value={collection.admin_graphql_api_id}>
                              {collection.title}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td data-th="Margin">
                        <input
                          type="number"
                          name="margin"
                          step="0.1"
                          defaultValue={row.margin}
                          onChange={e => handleChangeInput('margin', row.id, e.target.value)}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="row-bottom">
              <div className="table-paging">
                <button type="button" className="paging-option">
                  <i className="arrow-left"></i>
                  <span className="pre-label">Previous</span>
                </button>
                <div className="pagination paging-option">
                  <span className="active">1</span>
                  <span>2</span>
                  <span className="pg-sm">3</span>
                  <span className="pg-sm">4</span>
                  <span>...</span>
                  <span>10</span>
                </div>
                <button type="button" className="paging-option">
                  <span className="next-label">Next</span>
                  <i className="arrow-right"></i>
                </button>
              </div>
              <div className="table-actions">
                <button type="button" data-th="Add" onClick={handleAddMappingRow}>
                  <span>Add Mapping</span>
                </button>
                <button type="button" data-th="Reset" onClick={() => setMappingRows([])}>
                  <span> Reset Mapping</span>
                </button>
                <button
                  type="button"
                  className="btn btn-primary"
                  data-th="Save"
                  onClick={handleSave}
                >
                  <span>Save</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
