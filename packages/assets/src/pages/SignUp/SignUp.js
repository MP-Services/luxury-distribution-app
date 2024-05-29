import React, {useState, useEffect} from 'react';
import '../../styles/signup.scss';
import {useStore} from '@assets/reducers/storeReducer';
import luxuryLogo from '../../resources/logo/luxury-logo-white.svg';
import {api} from '../../helpers';
import {useHistory} from 'react-router-dom';
import {setLuxuryInfos} from '@assets/actions/storeActions';
import {setLoader, setToast} from '@assets/actions/storeActions';

/**
 * Render a home page for overview
 *
 * @return {React.ReactElement}
 * @constructor
 */
export default function SignUp() {
  const [input, setInput] = useState([]);
  const [errors, setErrors] = useState({});
  const {state, dispatch} = useStore();
  const history = useHistory();

  const handleChangeInput = (key, value) => {
    setInput(preInput => ({
      ...preInput,
      [key]: value
    }));
  };

  const handleValidation = () => {
    const errors = {};
    let formIsValid = true;

    for (const key of ['shopifyDomain', 'username', 'identifier', 'publicKey']) {
      if (!input[key]) {
        formIsValid = false;
        errors[key] = 'Cannot be empty';
      }
    }
    setErrors(errors);
    return formIsValid;
  };

  const handleSubmit = async event => {
    try {
      event.preventDefault();
      setErrors([]);
      if (handleValidation()) {
        setLoader(dispatch);
        const resp = await api('/signup', {method: 'POST', body: input});
        if (resp.success) {
          setLuxuryInfos(dispatch, resp.data);
          history.replace('/setting/brandfilter');

          return true;
        } else {
          setToast(dispatch, 'Something went wrong!', true);
        }
      }
    } catch (e) {
      console.log('error\n', e);
      setToast(dispatch, 'Something went wrong!', true);
    } finally {
      setLoader(dispatch, false);
    }
  };

  useEffect(() => {
    handleChangeInput('shopifyDomain', state.shop.shopifyDomain ? state.shop.shopifyDomain : '');
  }, []);

  return (
    <div className="signup-wrapper">
      <div className="content-left">
        <div className="signup-header">
          <div className="logo">
            <img src={luxuryLogo} alt="Luxury Logo" />
          </div>
          <p>Please fill the information to sign up as a dropshipper</p>
        </div>
      </div>

      <div className="content-right">
        <div className="signup-form-wrapper">
          <form className="signup-form" onSubmit={handleSubmit}>
            <div className="signup-form-header">
              <span>Sign up</span>
            </div>
            <div className="signup-form-body">
              <div className="form-group">
                <label>Shopify Url</label>
                <input
                  value={input.shopifyDomain ? input.shopifyDomain : ''}
                  onChange={e => handleChangeInput('shopifyDomain', e.target.value)}
                  type="text"
                  className="form-control"
                  id="shopify-domain"
                  placeholder="Enter URL"
                />
                <span style={{color: 'red'}}>{errors?.shopifyDomain}</span>
              </div>
              <div className="form-group">
                <label>
                  User Name <span>(from client service platform)</span>
                </label>
                <input
                  value={input.username ? input.username : ''}
                  onChange={e => handleChangeInput('username', e.target.value)}
                  type="text"
                  className="form-control"
                  id="username"
                  placeholder="Enter user name"
                />
                <span style={{color: 'red'}}>{errors?.username}</span>
              </div>
              <div className="form-group">
                <label>
                  Identifier <span>(from client service platform)</span>
                </label>
                <input
                  value={input.identifier ? input.identifier : ''}
                  onChange={e => handleChangeInput('identifier', e.target.value)}
                  type="password"
                  className="form-control"
                  id="identifier"
                  placeholder="Enter identifier"
                />
                <span style={{color: 'red'}}>{errors?.identifier}</span>
              </div>
              <div className="form-group">
                <label>
                  Public Key <span>(from client service platform)</span>
                </label>
                <input
                  value={input.publicKey ? input.publicKey : ''}
                  onChange={e => handleChangeInput('publicKey', e.target.value)}
                  type="password"
                  className="form-control"
                  id="publicKey"
                  placeholder="Enter public key"
                />
              </div>
              <span style={{color: 'red'}}>{errors?.publicKey}</span>
            </div>
            <div className="signup-form-actions">
              <button type="submit" className="singup-action-submit">
                Sign up
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
