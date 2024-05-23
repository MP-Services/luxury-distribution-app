import React from 'react';
import useFetchApi from '@assets/hooks/api/useFetchApi';
export default function TableCurrencyHeader() {
  const {data} = useFetchApi({url: '/setting/general'});
  return (
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
          Currency: <span>{data?.currency ?? 'EUR'}</span>
        </p>
      </div>
    </div>
  );
}
