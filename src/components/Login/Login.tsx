import React from 'react';
import { useContext } from 'react';

import {
  AuthContext,
  AuthProvider,
  TAuthConfig,
  TRefreshTokenExpiredEvent,
} from 'react-oauth2-code-pkce';

const authConfig: TAuthConfig = {
  clientId:
    '520908376805-qng7l5f1sj9s0mq7brelq74lalmskdpk.apps.googleusercontent.com',
  authorizationEndpoint: 'https://accounts.google.com/o/oauth2/v2/auth',
  tokenEndpoint: 'https://www.googleapis.com/oauth2/v4/token',
  redirectUri: 'http://localhost:3000/',
  scope: 'openid email',
  onRefreshTokenExpire: (event: TRefreshTokenExpiredEvent) =>
    window.confirm(
      'Session expired. Refresh page to continue using the site?'
    ) && event.login(),
};

export default (): JSX.Element => {
  const { token, tokenData, login } = useContext(AuthContext);

  return (
    <AuthProvider authConfig={authConfig}>
      {token ? (
        <>
          <h4>Access Token</h4>
          <pre>{token}</pre>
          <h4>User Information from JWT</h4>
          <pre>{JSON.stringify(tokenData, null, 2)}</pre>
        </>
      ) : (
        <>
          <p>Please login to continue</p>

          <button onClick={() => login()}>Login</button>
        </>
      )}
    </AuthProvider>
  );
};
