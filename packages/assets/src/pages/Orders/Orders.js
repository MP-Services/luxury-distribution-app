import React, {useState, useEffect} from 'react';
import ToggleMenu from '@assets/components/ToogleMenu/ToggleMenu';
import {useMenu} from '../../reducers/menuReducer';
import '../../styles/pages/orders.scss';
import useFetchApi from '@assets/hooks/api/useFetchApi';
import querystring from 'querystring';
import {useStore} from '@assets/reducers/storeReducer';
import {setLoader} from '@assets/actions/storeActions';
import {formatDateTimeWithShortMonth} from '@avada/functions/src/helpers/datetime/formatFullTime';
import {generateArrays, isExistPage, handleChangeSearch} from '@assets/helpers/paginate';

const url = '/orders';
const defaultParams = {
  page: 1,
  order: 'createdAt desc',
  before: '',
  after: '',
  limit: 8,
  hasCount: true
};

/**
 * Just render a sample page
 *
 * @return {React.ReactElement}
 * @constructor
 */
export default function Orders() {
  const {isActiveMenu} = useMenu();
  const [searchParams, setSearchParams] = useState({...defaultParams});
  const [pageArrays, setPageArrays] = useState([]);
  const {dispatch} = useStore();
  const {page} = searchParams;
  const reFetchUrl = `${url}?${querystring.stringify(searchParams)}`;
  const {data, fetchApi: reFetch, loading, pageInfo} = useFetchApi({
    url: reFetchUrl
  });
  const handleReFetch = (query = searchParams) => {
    reFetch(`${url}?${querystring.stringify(query)}`);
  };

  const handleChangeSearchParams = (key, value, isReFetch = true) => {
    handleChangeSearch({key, value, isReFetch, handleReFetch, searchParams, setSearchParams});
  };

  useEffect(() => {
    setPageArrays(generateArrays(pageInfo?.totalPage ? pageInfo.totalPage : 0));
  }, [pageInfo]);

  useEffect(() => {
    setLoader(dispatch, loading);
  }, [loading]);

  return (
    <div className={`main ${isActiveMenu ? 'opacity' : ''}`}>
      <div className="content-title">
        <div className="header-title">
          <ToggleMenu />
          <h2 className="title-detail">Orders</h2>
        </div>
      </div>
      <div className="content">
        <div className="orders-detail-table">
          <div className="table-header">
            <span className="span-table-title">Data table</span>
            <div className="items-per-page">
              <select
                name=""
                id=""
                defaultValue={8}
                className="per-page-select"
                onChange={e => handleChangeSearchParams('limit', e.target.value)}
              >
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
                {data.map((order, index) => (
                  <tr key={index}>
                    <td data-th="Retail Order Id">{order?.luxuryOrderId}</td>
                    <td data-th="Dropshipper Order Id">{order.shopifyOrderId}</td>
                    <td data-th="Successful" className="order-status">
                      {`${order?.luxuryOrderId ? 'Successful' : 'Processing'}`}
                    </td>
                    <td data-th="Created">{formatDateTimeWithShortMonth(order.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="pagination-wrapper">
            <button
              className="paging-option"
              disabled={!pageInfo?.hasPre}
              onClick={() => handleChangeSearchParams('before', data[0].id)}
            >
              <i className="fa-solid fa-angle-left"></i>
              <span>Previous</span>
            </button>
            {!!pageInfo?.totalPage && (
              <div className="pagination-items">
                {Array(pageInfo.totalPage)
                  .fill(0)
                  .map((item, index) =>
                    index === 0 ||
                    index + 1 === pageInfo?.totalPage ||
                    isExistPage(page, index, pageArrays).isPage ? (
                      <div
                        key={index}
                        className={`pagi-item ${index + 1 === page ? 'pagi-active' : ''}`}
                        onClick={() => handleChangeSearchParams('page', index + 1)}
                      >
                        {index + 1}
                      </div>
                    ) : isExistPage(page, index, pageArrays).showDotPage ? (
                      <div key={index}>...</div>
                    ) : (
                      <React.Fragment></React.Fragment>
                    )
                  )}
              </div>
            )}
            <button
              disabled={!pageInfo?.hasNext}
              className="paging-option"
              onClick={() => handleChangeSearchParams('after', data[data.length - 1].id)}
            >
              <span>Next</span>
              <i className="fa-solid fa-angle-right"></i>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
