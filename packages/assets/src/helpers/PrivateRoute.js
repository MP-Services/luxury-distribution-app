import React, {useContext} from 'react';
import {Redirect, Route} from 'react-router-dom';
import {useStore} from '@assets/reducers/storeReducer';

const PrivateRoute = props => {
  // const {currentUser} = userContext(AuthContext);
  const {component: Component, children, render, ...rest} = props;
  const {state} = useStore();
  const {luxuryInfos} = state;

  return <Route {...rest}>{!luxuryInfos ? <Redirect push to="/signup" /> : <Component />}</Route>;
};

export default PrivateRoute;
