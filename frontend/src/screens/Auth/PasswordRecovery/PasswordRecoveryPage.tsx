'use client';

import { useEffect, useRef, useState, type ClipboardEvent, type KeyboardEvent, type SyntheticEvent } from 'react';
import { ArrowLeft, Eye, EyeOff, KeyRound, Mail, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { createApiClient } from '@/services/api.client';
import { AuthShell } from '@/screens/Auth/AuthShell';

const request = createApiClient(process.env.NEXT_PUBLIC_API_URL ?? '');
type Step = 'email' | 'otp' | 'password';
const emailValid = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim()) && value.trim().length <= 190;

export function PasswordRecovery({ onClose, onSuccess, initialEmail = '' }: { onClose: () => void; onSuccess: () => void; initialEmail?: string }) {
  const [step, setStep] = useState<Step>('email');
  const [email, setEmail] = useState(initialEmail);
  const [otp, setOtp] = useState('');
  const [ticket, setTicket] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [visible, setVisible] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const otpInputs = useRef<Array<HTMLInputElement | null>>([]);
  const [resendAfter, setResendAfter] = useState(0);
  const [remaining, setRemaining] = useState(0);

  useEffect(() => {
    if (resendAfter <= Date.now()) return;
    const update = () => setRemaining(Math.max(0, Math.ceil((resendAfter - Date.now()) / 1000)));
    update();
    const timer = setInterval(update, 1000);
    return () => clearInterval(timer);
  }, [resendAfter]);

  const send = async (event?: SyntheticEvent) => {
    event?.preventDefault();
    if (busy) return;
    if (!emailValid(email)) { setError('Vui lòng nhập địa chỉ email hợp lệ.'); return; }
    setBusy(true); setError('');
    try {
      await request('/auth/password/forgot', undefined, {
        method: 'POST', body: JSON.stringify({ email: email.trim().toLowerCase() }),
      });
      setOtp(''); setTicket('');
      setResendAfter(Date.now() + 60_000); setStep('otp');
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Không thể gửi yêu cầu. Vui lòng thử lại.'); }
    finally { setBusy(false); }
  };

  const verify = async (event: SyntheticEvent) => {
    event.preventDefault();
    if (busy) return;
    if (!/^\d{6}$/.test(otp)) { setError('Vui lòng nhập đủ 6 chữ số OTP.'); return; }
    setBusy(true); setError('');
    try {
      const result = await request<{ reset_token: string }>('/auth/password/verify-otp', undefined, {
        method: 'POST', body: JSON.stringify({ email: email.trim().toLowerCase(), otp }),
      });
      setTicket(result.reset_token); setOtp(''); setStep('password');
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Mã OTP không hợp lệ.'); }
    finally { setBusy(false); }
  };

  const reset = async (event: SyntheticEvent) => {
    event.preventDefault();
    if (busy) return;
    if (password.length < 12) { setError('Mật khẩu mới phải có ít nhất 12 ký tự.'); return; }
    if (password !== confirmPassword) { setError('Mật khẩu xác nhận không khớp.'); return; }
    setBusy(true); setError('');
    try {
      await request('/auth/password/reset', undefined, {
        method: 'POST', body: JSON.stringify({
          email: email.trim().toLowerCase(), reset_token: ticket,
          new_password: password, confirm_password: confirmPassword,
        }),
      });
      setTicket(''); setPassword(''); setConfirmPassword('');
      onSuccess();
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Đặt lại mật khẩu thất bại.'); }
    finally { setBusy(false); }
  };

  const titles: Record<Step, string> = {
    email: 'Quên mật khẩu?', otp: 'Xác thực OTP',
    password: 'Đặt mật khẩu mới',
  };
  const descriptions: Record<Step, string> = {
    email: 'Nhập địa chỉ email đã đăng ký tài khoản KIDSFIT CRM.',
    otp: 'Nhập mã 6 chữ số từ email nếu tài khoản hợp lệ.',
    password: 'Thiết lập mật khẩu mới để bảo vệ tài khoản.',
  };
  return (
    <AuthShell title={titles[step]} description={descriptions[step]}>
          {step === 'email' && <form onSubmit={send} className="space-y-4" noValidate>
            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="recovery-email">Địa chỉ email</label>
              <Input id="recovery-email" type="email" autoComplete="email" maxLength={190}
                required value={email} onChange={e => setEmail(e.target.value)}
                placeholder="name@company.com" disabled={busy} className="h-11 rounded-xl" />
            </div>
            {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
            <Button type="submit" disabled={busy} className="h-11 w-full rounded-xl bg-[#1b5e20] text-white hover:bg-[#124c17]">
              <Mail className="mr-2 size-4" />{busy ? 'Đang xử lý...' : 'Gửi mã xác thực'}
            </Button>
          </form>}
          {step === 'otp' && <form onSubmit={verify} className="space-y-4" noValidate>
            <p className="break-all text-sm font-medium text-primary">{email.trim().toLowerCase()}</p>
            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="recovery-otp-0">Mã xác thực</label>
              <div className="grid grid-cols-6 gap-2" role="group" aria-label="Mã xác thực OTP gồm 6 chữ số">
                {Array.from({ length: 6 }, (_, index) => (
                  <Input key={index} id={`recovery-otp-${index}`}
                    ref={element => { otpInputs.current[index] = element; }}
                    aria-label={`Chữ số OTP thứ ${index + 1}`}
                    inputMode="numeric" autoComplete={index === 0 ? 'one-time-code' : 'off'}
                    maxLength={6} pattern="[0-9]*" value={otp[index] ?? ''}
                    onChange={event => {
                      const digits = event.target.value.replace(/\D/g, '').slice(0, 6);
                      if (!digits) {
                        setOtp(previous => previous.slice(0, index) + previous.slice(index + 1));
                        return;
                      }
                      const next = otp.slice(0, index).padEnd(index, ' ') + digits + otp.slice(index + digits.length);
                      setOtp(next.replace(/ /g, '').slice(0, 6));
                      otpInputs.current[Math.min(index + digits.length, 5)]?.focus();
                    }}
                    onPaste={(event: ClipboardEvent<HTMLInputElement>) => {
                      const digits = event.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
                      if (!digits) return;
                      event.preventDefault();
                      setOtp(digits);
                      otpInputs.current[Math.min(digits.length, 5)]?.focus();
                    }}
                    onKeyDown={(event: KeyboardEvent<HTMLInputElement>) => {
                      if (event.key === 'Backspace' && !otp[index] && index > 0) {
                        event.preventDefault();
                        setOtp(previous => previous.slice(0, index - 1) + previous.slice(index));
                        otpInputs.current[index - 1]?.focus();
                      }
                      if (event.key === 'ArrowLeft' && index > 0) otpInputs.current[index - 1]?.focus();
                      if (event.key === 'ArrowRight' && index < 5) otpInputs.current[index + 1]?.focus();
                    }}
                    disabled={busy}
                    className="h-12 min-w-0 rounded-xl px-0 text-center text-lg font-semibold tabular-nums" />
                ))}
              </div>
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
                <span>Mã có hiệu lực 5 phút</span>
                <button type="button" disabled={busy || remaining > 0} onClick={() => void send()}
                  className="font-medium text-primary underline-offset-4 hover:underline disabled:opacity-50">
                  {remaining > 0 ? 'Gửi lại sau ' + remaining + 's' : 'Gửi lại mã'}
                </button>
              </div>
            </div>
            {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
            <Button type="submit" disabled={busy || otp.length !== 6} className="h-11 w-full rounded-xl bg-[#1b5e20] text-white hover:bg-[#124c17]">
              <ShieldCheck className="mr-2 size-4" />{busy ? 'Đang xác thực...' : 'Xác thực OTP'}
            </Button>
          </form>}
          {step === 'password' && <form onSubmit={reset} className="space-y-4" noValidate>
            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="recovery-new-password">Mật khẩu mới</label>
              <div className="relative">
                <Input id="recovery-new-password" type={visible ? 'text' : 'password'}
                  autoComplete="new-password" minLength={12} maxLength={200} required value={password}
                  onChange={e => setPassword(e.target.value)} placeholder="Ít nhất 12 ký tự" disabled={busy}
                  className="h-11 rounded-xl pr-12" />
                <button type="button" onClick={() => setVisible(v => !v)} disabled={busy}
                  aria-label={visible ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-2 text-muted-foreground hover:bg-muted">
                  {visible ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="recovery-confirm-password">Xác nhận mật khẩu</label>
              <Input id="recovery-confirm-password" type="password" autoComplete="new-password"
                required value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)}
                placeholder="Nhập lại mật khẩu mới" disabled={busy} className="h-11 rounded-xl" />
            </div>
            {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
            <Button type="submit" disabled={busy} className="h-11 w-full rounded-xl bg-[#1b5e20] text-white hover:bg-[#124c17]">
              <KeyRound className="mr-2 size-4" />{busy ? 'Đang cập nhật...' : 'Đặt lại mật khẩu'}
            </Button>
          </form>}
          <button type="button" onClick={onClose}
            className="mt-5 flex w-full items-center justify-center gap-2 rounded-lg py-2 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="size-4" /> Quay lại đăng nhập
          </button>
    </AuthShell>
  );
}
