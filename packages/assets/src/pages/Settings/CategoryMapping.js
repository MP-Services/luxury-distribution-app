import React, {useState, useEffect} from 'react';
import {useStore} from '@assets/reducers/storeReducer';
import '../../styles/pages/category-mapping.scss';
import {useMenu} from '@assets/reducers/menuReducer';
import {useHistory} from 'react-router-dom';
import SyncSettingHeader from '@assets/components/SyncSettingHeader/SyncSettingHeader';
import useFetchApi from '@assets/hooks/api/useFetchApi';
import {setLoader, setToast} from '@assets/actions/storeActions';
import {api} from '@assets/helpers';
import useCreateApi from '@assets/hooks/api/useCreateApi';
import useDeleteApi from '@assets/hooks/api/useDeleteApi';
import ToggleMenu from '@assets/components/ToogleMenu/ToggleMenu';

/**
 * Render a home page for overview
 *
 * @return {React.ReactElement}
 * @constructor
 */
export default function CategoryMapping() {
  const {data: dropShipperCollections} = useFetchApi({url: '/setting/categorymapping/collections'});
  const {data: retailerCategories} = useFetchApi({url: '/setting/categorymapping/retailercat'});
  const {data: catMappingData, fetchApi, fetched} = useFetchApi({
    url: '/setting/categorymapping'
  });
  const {creating, handleCreate} = useCreateApi({
    url: '/setting/categorymapping',
    successMsg: 'Saved successfully!',
    errorMsg: 'Failed to save'
  });

  const {deleting, handleDelete} = useDeleteApi({
    url: '/setting/categorymapping/delete'
  });

  const [newMappingRows, setNewMappingRows] = useState([]);
  const [editMappingRows, setEditMappingRows] = useState([]);
  const [isEdits, setIsEdits] = useState([]);
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

    setNewMappingRows([...newMappingRows, newRow]);
  };

  const handleChangeInput = (key, id, value, action) => {
    if (action === 'new') {
      setNewMappingRows(prev =>
        prev.map(item => (item.id === id ? {...item, [key]: value} : item))
      );
    }
    if (action === 'edit') {
      setEditMappingRows(prev =>
        prev.map(item => (item.id === id ? {...item, [key]: value} : item))
      );
    }
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

  useEffect(() => {
    const showLoader = creating || deleting;
    if (!showLoader && fetched) {
      fetchApi().then(() => {
        setIsEdits([]);
      });
    }
    setLoader(dispatch, showLoader);
  }, [creating, deleting]);

  const handleEdit = (index, row) => {
    setIsEdits(prev => [...prev, {id: index}]);
    setEditMappingRows(prev => [...prev, row]);
  };

  const handleClose = id => {
    setIsEdits(prev => prev.filter(item => item.id !== id));
    setEditMappingRows(prev => prev.filter(item => item.id !== id));
  };

  const getCategoryName = id => {
    const retailerCat = retailerCategories.find(element => element.catId == id);

    return retailerCat ? retailerCat.catName : '';
  };

  const getDropShipperName = id => {
    const dropShipper = dropShipperCollections.find(element => element.admin_graphql_api_id === id);

    return dropShipper ? dropShipper.title : '';
  };

  const TableRow = ({rowData, ordinalNumber, action}) => {
    return (
      <React.Fragment>
        <td data-th="#">{ordinalNumber ? ordinalNumber : ''}</td>
        <td data-th="Retailer Category">
          <select
            name="retailer_category"
            id="retailer_category"
            value={rowData.retailerId}
            onChange={e => handleChangeInput('retailerId', rowData.id, e.target.value, action)}
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
            value={rowData.dropShipperId}
            onChange={e => handleChangeInput('dropShipperId', rowData.id, e.target.value, action)}
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
            value={rowData.margin}
            onChange={e => handleChangeInput('margin', rowData.id, e.target.value, action)}
          />
        </td>
        {action === 'edit' && (
          <td data-th="Action" className="row-actions">
            <button type="button" className="action cancel" onClick={() => handleClose(rowData.id)}>
              <i className="xmark"></i>
            </button>
            <button
              type="button"
              className="action delete"
              onClick={async () => handleDelete({}, rowData.id)}
            >
              <i className="trash-can"></i>
            </button>
          </td>
        )}
      </React.Fragment>
    );
  };

  return (
    <div className="main">
      <div className="content-title">
        <div className="header-title">
          <ToggleMenu />
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
        {!!(retailerCategories.length && dropShipperCollections.length) && (
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
                        {isEdits.findIndex(item => item.id === index) !== -1 ? (
                          <TableRow
                            rowData={editMappingRows.find(
                              editElement => editElement.id === catMapping.id
                            )}
                            ordinalNumber={index + 1}
                            action={'edit'}
                          />
                        ) : (
                          <React.Fragment>
                            <td data-th="#">{index + 1}</td>
                            <td data-th="Retailer Category">
                              {getCategoryName(catMapping.retailerId)}
                            </td>
                            <td data-th="Dropshipper Category">
                              {getDropShipperName(catMapping.dropShipperId)}
                            </td>
                            <td data-th="Margin">{catMapping.margin}</td>
                            <td data-th="Action" className="row-actions">
                              <button
                                type="button"
                                className="action edit"
                                onClick={() => handleEdit(index, catMapping)}
                              >
                                <i className="edit"></i>
                              </button>
                              <button
                                type="button"
                                className="action delete"
                                onClick={async () => handleDelete({}, catMapping.id)}
                              >
                                <i className="trash-can"></i>
                              </button>
                            </td>
                          </React.Fragment>
                        )}
                      </tr>
                    ))}
                    {newMappingRows.map(row => (
                      <tr key={row.id}>
                        <TableRow rowData={row} action={'new'} />
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
                    onClick={async () => handleCreate({newMappingRows, editMappingRows})}
                  >
                    <span>Save</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
