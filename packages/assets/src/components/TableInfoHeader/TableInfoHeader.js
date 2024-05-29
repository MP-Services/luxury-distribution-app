import React from 'react';
import useFetchApi from '@assets/hooks/api/useFetchApi';
import {useStore} from '@assets/reducers/storeReducer';
export default function TableInfoHeader({isDisplayCurrency = true}) {
  const {data} = useFetchApi({url: '/setting/general'});
  const {state} = useStore();
  const domain = state?.shop?.domain || state?.shop?.shopifyDomain;
  return (
    <div className="table-info-top">
      <div className="info-card info-retailer">
        <p className="info-url">
          Retailer: <span>luxury-distribution.com</span>
        </p>
        {isDisplayCurrency && (
          <>
            <hr />
            <p className="info-currency">
              Currency: <span>EUR</span>
            </p>
          </>
        )}
      </div>
      <div className="info-card info-dropshipper">
        <p className="info-url">
          Dropshipper: <span>{domain ?? ''}</span>
        </p>
        {isDisplayCurrency && (
          <>
            <hr />
            <p className="info-currency">
              Currency: <span>{data?.currency ?? 'EUR'}</span>
            </p>
          </>
        )}
      </div>
    </div>
  );
}
