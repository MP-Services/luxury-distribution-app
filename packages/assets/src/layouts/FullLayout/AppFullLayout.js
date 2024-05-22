import React, {useState} from 'react';
import {Frame, Layout, Scrollable, Toast, Spinner, Loading} from '@shopify/polaris';
import PropTypes from 'prop-types';
import {useStore} from '@assets/reducers/storeReducer';
import {closeToast} from '@assets/actions/storeActions';
import AppNavigation from '@assets/layouts/AppLayout/AppNavigation';
import {isEmbeddedApp} from '@assets/config/app';
import {useLocation} from 'react-router-dom';
import Loader from '@assets/components/Loader/Loader';

/**
 * Render an app layout
 *
 * @param {React.ReactNode} children
 * @return {React.ReactNode}
 * @constructor
 */
export default function AppFullLayout({children}) {
  const {state, dispatch} = useStore();
  const {loading, toast, loader} = state;

  const location = useLocation();
  if (location.pathname === '/embed/signup' || location.pathname === '/signup') {
    return (
      <React.Fragment>
        {children}
        {loader && <Loader />}
        {toast && <Toast onDismiss={() => closeToast(dispatch)} {...toast} />}
      </React.Fragment>
    );
  }

  return (
    <Frame>
      <div className="page-wrapper wrapper Avada-Frame">
        <AppNavigation />
        {children}
      </div>
      {loader && <Loader />}
      {loading && <Loading />}
      {toast && <Toast onDismiss={() => closeToast(dispatch)} {...toast} />}
    </Frame>
  );
}

AppFullLayout.propTypes = {
  children: PropTypes.node.isRequired
};
