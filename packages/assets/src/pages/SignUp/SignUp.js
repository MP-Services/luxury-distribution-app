import React, {useState} from 'react';
import '../../styles/signup.scss';
import {useStore} from '@assets/reducers/storeReducer';
import luxuryLogo from '../../resources/logo/luxury-logo-white.svg'

/**
 * Render a home page for overview
 *
 * @return {React.ReactElement}
 * @constructor
 */
export default function SignUp() {
  const [input, setInput] = useState([]);
  const {state} = useStore();

  const handleChangeInput = (key, value) => {
    setInput(preInput => ({
      ...preInput,
      [key]: value
    }));
  };

  const handleSubmit = () => {};

  return (
    <div className="wrapper">
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
              <h2>Sign up</h2>
            </div>
            <div className="signup-form-body">
              <div className="form-group">
                <label>Provider</label>
                <input type="text" className="form-control" id="provider" placeholder="Dropshipper" disabled />
              </div>
              <div className="form-group">
                <label>Shopify Url</label>
                <input value={state.shop.shopifyDomain} onChange={val => handleChangeInput('shopifyUrl', val)} type="text" className="form-control" id="shopify-url" placeholder="Enter URL" />
              </div>
              <div className="form-group">
                <label>User Name <span>(from client service platform)</span></label>
                <input value={input.username} onChange={val => handleChangeInput('username', val)} type="text" className="form-control" id="password" placeholder="Enter username" />
              </div>
              <div className="form-group">
                <label>Password <span>(from client service platform)</span></label>
                <input value={input.password} onChange={val => handleChangeInput('password', val)} type="password" className="form-control" id="password" placeholder="Enter password" />
              </div>
            </div>
            <div className="signup-form-actions">
              <button type="submit" className="singup-action-submit">Sign up</button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
