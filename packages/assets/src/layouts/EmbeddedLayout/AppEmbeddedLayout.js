import React from 'react';
import {Frame} from '@shopify/polaris';
import PropTypes from 'prop-types';

/**
 *
 * @param children
 * @returns {JSX.Element}
 * @constructor
 */
function AppEmbeddedLayout({children}) {
  return <Frame>{children}</Frame>;
}

AppEmbeddedLayout.propTypes = {
  children: PropTypes.node.isRequired
};

export default AppEmbeddedLayout;
