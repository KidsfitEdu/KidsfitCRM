/** Client-side login form validation. Authentication remains server-authoritative. */
export type LoginField = 'email' | 'password';
export type LoginErrors = Partial<Record<LoginField, string>>;

export function validateLogin(email: string, password: string): LoginErrors {
  const errors: LoginErrors = {};
  const normalizedEmail = email.trim();
  if (!normalizedEmail) errors.email = 'Vui lòng nhập địa chỉ email.';
  else if (normalizedEmail.length > 190 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail))
    errors.email = 'Địa chỉ email không đúng định dạng.';
  if (!password) errors.password = 'Vui lòng nhập mật khẩu.';
  return errors;
}
