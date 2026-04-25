const jwtConfig = {
  loginEndpoint: '/auth/login',
  registerEndpoint: '/auth/register',
  refreshEndpoint: '/auth/refresh-token',
  forgotPasswordEndpoint: '/auth/forgot-password',
  resetPasswordEndpoint: '/auth/reset-password',
  getRoleEndpoint: (userId: string) => `/auth/get-role/${userId}`,

  tokenType: 'Bearer',

  storageTokenKeyName: 'accessToken',
  storageRefreshTokenKeyName: 'refreshToken',
};

export default jwtConfig;
