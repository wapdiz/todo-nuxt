export interface UserDataRgistration {
  name: string;
  email: string;
  password: string;
  phone: string;
  agreement: boolean;
  rules: boolean;
}

export interface UserDataLogin {
  email: string;
  password: string;
}
export interface UserDataPasswordRecovery {
  password: string;
  password_confirmation: string;
  email: string;
  token: string;
}

export interface UserDataForgotPassword {
  email: string;
}
