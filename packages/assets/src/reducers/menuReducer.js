import React, {createContext, useContext, useState} from 'react';
import PropTypes from 'prop-types';

/** @type {React.Context<IMenuReducer>} */
const MenuReducer = createContext({});

export const useMenu = () => useContext(MenuReducer);

/**
 * @param children
 * @param user
 * @param {Shop} shop
 * @return {JSX.Element}
 * @constructor
 */
export const MenuProvider = ({children, user, activeShop: shop}) => {
  const [isActiveMenu, setIsActiveMenu] = useState(false);

  return (
    <MenuReducer.Provider value={{isActiveMenu, setIsActiveMenu}}>
      {children}
    </MenuReducer.Provider>
  );
};

MenuProvider.propTypes = {
  children: PropTypes.node
};
