import React, {useRef, useState} from 'react';
import {Modal} from '@shopify/polaris';

/**
 * @param confirmAction
 * @param title
 * @param HtmlTitle
 * @param content
 * @param HtmlContent
 * @param large
 * @param loading
 * @param destructive
 * @param buttonTitle
 * @param closeTitle
 * @param disabled
 * @param sectioned
 * @param canCloseAfterFinished
 * @param successCallback
 * @param closeCallback
 * @param defaultCurrentInput
 * @returns {{openModal, closeModal, modal: JSX.Element, open: boolean, validations}}
 */
export default function useConfirmModal({
  confirmAction,
  title = 'Are you sure to delete?',
  HtmlTitle = null,
  content = 'Please be careful because you cannot undo this action.',
  HtmlContent = null,
  buttonTitle = 'Confirm',
  closeTitle = 'Cancel',
  large = false,
  loading = false,
  disabled = false,
  destructive = false,
  sectioned = true,
  canCloseAfterFinished = true,
  successCallback = () => {},
  closeCallback = () => {},
  defaultCurrentInput = null
}) {
  const [open, setOpen] = useState(false);
  const input = useRef(null);

  const openModal = (currentInput = defaultCurrentInput) => {
    input.current = currentInput;
    setOpen(true);
  };

  const closeModal = () => {
    if (!loading) setOpen(false);
  };

  const handleClose = () => {
    closeModal();
    closeCallback();
  };

  const handleConfirm = () => {
    confirmAction(input.current).then(success => {
      if (!success) return;
      if (canCloseAfterFinished) handleClose();
      successCallback(success);
    });
  };

  const modal = (
    <Modal
      sectioned={sectioned}
      open={open}
      large={large}
      onClose={() => handleClose()}
      title={HtmlTitle ? <HtmlTitle input={input} /> : title}
      primaryAction={{
        content: buttonTitle,
        loading,
        disabled,
        destructive,
        onAction: () => handleConfirm()
      }}
      secondaryActions={[
        {
          disabled: loading,
          content: closeTitle,
          onAction: () => handleClose()
        }
      ]}
    >
      {HtmlContent ? <HtmlContent {...{input}} /> : content}
    </Modal>
  );

  return {modal, open, closeModal, openModal};
}
