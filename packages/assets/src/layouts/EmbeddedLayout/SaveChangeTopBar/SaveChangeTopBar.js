import React, {useContext} from 'react';
import {connect} from 'react-redux';
import PropTypes from 'prop-types';
import {ContextualSaveBar} from '@shopify/polaris';
import {SaveTopBarContext} from '../../../contexts/saveTopBarContext';
import {setToast} from '../../../actions/layout/setToastAction';

/**
 * @returns {JSX.Element}
 * @constructor
 */
function SaveChangeTopBar({setToast}) {
  const {saving, invalid, setSaving, handleSave, handleDiscard, setSaveChanged} = useContext(
    SaveTopBarContext
  );

  const handleDiscardConfirmed = () => {
    handleDiscard();
    setSaveChanged(false);
  };

  const handleSaveConfirmed = async () => {
    if (invalid) {
      return;
    }
    setSaving(true);
    await handleSave();
    setSaving(false);
    setSaveChanged(false);
  };

  return (
    <ContextualSaveBar
      message="Unsaved changes"
      saveAction={{
        onAction: () => handleSaveConfirmed(),
        loading: saving
      }}
      discardAction={{
        onAction: () => handleDiscardConfirmed(),
        disabled: saving
      }}
    />
  );
}

const mapStateToProps = app => ({
  shop: app.shop.activeShop
});

SaveChangeTopBar.propTypes = {
  setToast: PropTypes.func
};

export default connect(mapStateToProps, {setToast})(SaveChangeTopBar);
