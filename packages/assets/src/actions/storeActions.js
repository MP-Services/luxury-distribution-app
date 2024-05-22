import {handleError} from '@assets/services/errorService';
import {api, auth} from '@assets/helpers';

export const storeTypes = {
  SET_USER: 'SET_USER',
  SET_LOADING: 'SET_LOADING',
  SET_TOAST: 'SET_TOAST',
  SET_LOADER: 'SET_lOADER',
  CLOSE_TOAST: 'CLOSE_TOAST',
  SET_SHOP: 'SET_SHOP',
  SET_SUBSCRIPTION: 'SET_SUBSCRIPTION',
  SET_LUXURY_INFOS: 'SET_LUXURY_INFOS'
};

export const reducer = (state, {type, payload}) => {
  switch (type) {
    case storeTypes.SET_USER:
      return {...state, user: payload};
    case storeTypes.SET_LOADING:
      return {...state, loading: payload};
    case storeTypes.SET_TOAST:
      return {...state, toast: payload};
    case storeTypes.CLOSE_TOAST:
      return {...state, toast: undefined};
    case storeTypes.SET_SHOP:
      return {...state, shop: payload};
    case storeTypes.SET_SUBSCRIPTION:
      return {...state, loading: false, subscription: payload};
    case storeTypes.SET_LUXURY_INFOS:
      return {...state, luxuryInfos: payload};
    case storeTypes.SET_LOADER:
      return {...state, loader: payload};
    default:
      return state;
  }
};

export function setLoader(dispatch, payload = true) {
  dispatch(storeTypes.SET_LOADER, payload);
}

export function setLoading(dispatch, payload = true) {
  dispatch(storeTypes.SET_LOADING, payload);
}

export function setToast(dispatch, content, error = false) {
  dispatch(storeTypes.SET_TOAST, {content, error});
}

export function closeToast(dispatch) {
  dispatch(storeTypes.CLOSE_TOAST);
}

export function setSubscription(dispatch, payload = null) {
  dispatch(storeTypes.SET_SUBSCRIPTION, payload);
}

export function setLuxuryInfos(dispatch, payload = null) {
  dispatch(storeTypes.SET_LUXURY_INFOS, payload);
}

export async function getSubscription(dispatch) {
  try {
    setLoading(dispatch, true);
    const payload = await api('/subscription');
    setSubscription(dispatch, payload);
    return payload;
  } catch (e) {
    handleError(e);
    setLoading(dispatch, false);
  }
}
