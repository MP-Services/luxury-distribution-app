import React from 'react';
import {Spinner} from '@shopify/polaris';
import '@assets/styles/preloader.scss';

/**
 * Global loading component
 *
 * @returns {JSX.Element|null}
 * @constructor
 */
export default function Loader() {
  return (
    <div className="Loader">
      <Spinner />
    </div>
  );
}

Loader.propTypes = {};
