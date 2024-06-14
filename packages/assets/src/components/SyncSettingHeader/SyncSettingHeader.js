import React from 'react';
import useFetchApi from '@assets/hooks/api/useFetchApi';
import defaultSyncSetting from '@avada/functions/src/const/settings/sync';
export default function SyncSettingHeader({syncSettingData}) {
  let syncSetting = syncSettingData;
  if (!syncSetting) {
    const {data: syncSettingDatFetch, fetched} = useFetchApi({
      url: '/setting/sync',
      defaultData: defaultSyncSetting
    });
    if (fetched) {
      syncSetting = syncSettingDatFetch;
    }
  }

  if (!syncSetting) {
    return <></>;
  }

  const syncSettingsDataArr = Object.entries(syncSetting).filter(
    ([key, value]) => value && !['shopifyId', 'shopifyDomain', 'id'].includes(key)
  );
  if (!syncSettingsDataArr.length) {
    return <></>;
  }

  return (
    <div className="table-sync-setting">
      <div className="sync-title">
        <p>Sync setting</p>
      </div>
      <div className="sync-items">
        {syncSettingsDataArr.map(([key, value]) => {
          let title = key;
          switch (key) {
            case 'sku':
            case 'ean':
              title = title.toUpperCase();
              break;
            default:
              title = title.charAt(0).toUpperCase() + title.slice(1);
          }
          return (
            <span key={key} className="sync-item">
              <i className="check"></i>
              <span>{title}</span>
            </span>
          );
        })}
      </div>
    </div>
  );
}
