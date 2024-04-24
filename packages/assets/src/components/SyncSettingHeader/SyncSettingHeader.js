import React, {useState} from 'react';
import useFetchApi from '@assets/hooks/api/useFetchApi';
export default function SyncSettingHeader({syncSettingData}) {
  let syncSetting = syncSettingData;
  if (!syncSetting) {
    const {data: syncSettingData} = useFetchApi({url: '/setting/sync'});
    syncSetting = syncSettingData;
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
        {syncSettingsDataArr.map(([key, value]) => (
          <span key={key} className="sync-item">
            <i className="check"></i>
            <span>{key}</span>
          </span>
        ))}
      </div>
    </div>
  );
}
