import React, {Suspense} from 'react';
import {Route, Switch} from 'react-router-dom';
import Home from '@assets/loadables/Home/Home';
import SignUp from '@assets/loadables/SignUp/SignUp';
import NotFound from '@assets/loadables/NotFound/NotFound';
import Samples from '@assets/loadables/Samples/Samples';
import Settings from '@assets/loadables/Settings/Settings';
import {routePrefix} from '@assets/config/app';
import Loading from '@assets/components/Loading';
import PrivateRoute from "@assets/helpers/PrivateRoute";

// eslint-disable-next-line react/prop-types
const Routes = ({prefix = routePrefix}) => (
  <Suspense fallback={<Loading />}>
    <Switch>
      <PrivateRoute exact path={prefix + '/'} component={Home}/>
      <PrivateRoute exact path={prefix + '/settings'} component={Settings}/>
      <Route exact path={prefix + '/signup'} component={SignUp} />
      <PrivateRoute path="*" component={NotFound} />
    </Switch>
  </Suspense>
);

export default Routes;
