import React, {Suspense} from 'react';
import {Route, Switch} from 'react-router-dom';
import Dashboard from '@assets/loadables/Dashboard/Dashboard';
import SignUp from '@assets/loadables/SignUp/SignUp';
import NotFound from '@assets/loadables/NotFound/NotFound';
import Orders from '@assets/loadables/Orders/Orders';
import MainSettings from '@assets/loadables/Settings/MainSettings';
import CategoryMapping from '@assets/loadables/Settings/CategoryMapping';
import SyncSetting from '@assets/loadables/Settings/SyncSetting';
import GeneralSetting from '@assets/loadables/Settings/GeneralSetting';
import AttributeMapping from '@assets/loadables/Settings/AttributeMapping';
import BrandFilter from '@assets/loadables/Settings/BrandFilter';
import Support from '@assets/loadables/Support/Support';
import Helpdesk from '@assets/loadables/Helpdesk/Helpdesk';
import {routePrefix} from '@assets/config/app';
import Loading from '@assets/components/Loading';
import PrivateRoute from '@assets/helpers/PrivateRoute';
import PrivateSignUp from '@assets/helpers/PrivateSignUp';

// eslint-disable-next-line react/prop-types
const Routes = ({prefix = routePrefix}) => (
  <Suspense fallback={<Loading />}>
    <Switch>
      <PrivateRoute exact path={prefix + '/'} component={Dashboard} />
      <PrivateRoute exact path={prefix + '/orders'} component={Orders} />
      <PrivateRoute exact path={prefix + '/settings'} component={MainSettings} />
      <PrivateRoute exact path={prefix + '/setting/categorymapping'} component={CategoryMapping} />
      <PrivateRoute exact path={prefix + '/setting/general'} component={GeneralSetting} />
      <PrivateRoute exact path={prefix + '/setting/attribute'} component={AttributeMapping} />
      <PrivateRoute exact path={prefix + '/setting/brandfilter'} component={BrandFilter} />
      <PrivateRoute exact path={prefix + '/setting/sync'} component={SyncSetting} />
      <PrivateRoute exact path={prefix + '/support'} component={Support} />
      <PrivateRoute exact path={prefix + '/helpdesk'} component={Helpdesk} />
      <PrivateSignUp exact path={prefix + '/signup'} component={SignUp} />
      <PrivateRoute path="*" component={NotFound} />
    </Switch>
  </Suspense>
);

export default Routes;
