'use client';

import { useEffect, useState, type SyntheticEvent } from 'react';
import { ArrowLeft, Eye, EyeOff, KeyRound, Mail, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { createApiClient } from '@/services/api.client';
import { AuthShell } from '@/screens/Auth/AuthShell';

const request = createApiClient(process.env.NEXT_PUBLIC_API_URL ?? '');
type Step = 'email' | 'otp' | 'password' | 'done';
const emailValid = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim()) && value.trim().length <= 190;

export function PasswordRecovery({ onClose, initialEmail = '' }: { onClose: () => void; initialEmail?: string }) {
  const [step, setStep] = useState<Step>('email');
  const [email, setEmail] = useState(initialEmail);
  const [otp, setOtp] = useState('');
  const [ticket, setTicket] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [visible, setVisible] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
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
    setBusy(true); setError(''); setNotice('');
    try {
      const result = await request<{ message: string }>('/auth/password/forgot', undefined, {
        method: 'POST', body: JSON.stringify({ email: email.trim().toLowerCase() }),
      });
      setNotice(result.message); setOtp(''); setTicket('');
      setResendAfter(Date.now() + 60_000); setStep('otp');
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Không thể gửi yêu cầu. Vui lòng thử lại.'); }
    finally { setBusy(false); }
  };

  const verify = async (event: SyntheticEvent) => {
    event.preventDefault();
    if (busy) return;
    if (!/^\d{6}$/.test(otp)) { setError('Vui lòng nhập đủ 6 chữ số OTP.'); return; }
    setBusy(true); setError(''); setNotice('');
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
      setTicket(''); setPassword(''); setConfirmPassword(''); setStep('done');
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Đặt lại mật khẩu thất bại.'); }
    finally { setBusy(false); }
  };

  const titles: Record<Step, string> = {
    email: 'Quên mật khẩu?', otp: 'Xác thực OTP',
    password: 'Đặt mật khẩu mới', done: 'Đổi mật khẩu thành công',
  };
  const descriptions: Record<Step, string> = {
    email: 'Nhập địa chỉ email đã đăng ký tài khoản KIDSFIT CRM.',
    otp: 'Kiểm tra hộp thư của bạn để lấy mã xác thực gồm 6 chữ số.',
    password: 'Thiết lập mật khẩu mới để bảo vệ tài khoản.',
    done: 'Mật khẩu đã được thay đổi. Hãy đăng nhập lại.',
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
            <p className="break-all text-center text-sm text-muted-foreground">{email.trim().toLowerCase()}</p>
            {notice && <output className="block rounded-lg bg-[#edf7ed] p-3 text-sm text-[#24542d]">{notice}</output>}
            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="recovery-otp">Mã OTP</label>
              <Input id="recovery-otp" inputMode="numeric" autoComplete="one-time-code"
                maxLength={6} pattern="[0-9]{6}" value={otp}
                onChange={e => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="Nhập 6 chữ số" disabled={busy}
                className="h-12 rounded-xl text-center text-xl font-semibold tracking-[.4em]" />
            </div>
            <p className="text-center text-xs text-muted-foreground">OTP có hiệu lực 5 phút sau khi gửi.</p>
            {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
            <Button type="submit" disabled={busy || otp.length !== 6} className="h-11 w-full rounded-xl bg-[#1b5e20] text-white hover:bg-[#124c17]">
              <ShieldCheck className="mr-2 size-4" />{busy ? 'Đang xác thực...' : 'Xác thực OTP'}
            </Button>
            <button type="button" disabled={busy || remaining > 0} onClick={() => void send()}
              className="w-full rounded-lg py-2 text-sm font-medium text-[#1b5e20] underline-offset-4 hover:underline disabled:opacity-50 dark:text-[#9cd5a4]">
              {remaining > 0 ? 'Gửi lại mã sau ' + remaining + 's' : 'Gửi lại mã xác thực'}
            </button>
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
          {step === 'done' && <Button onClick={onClose} className="h-11 w-full rounded-xl bg-[#1b5e20] text-white hover:bg-[#124c17]">Đến trang đăng nhập</Button>}
          {step !== 'done' && <button type="button" onClick={onClose}
            className="mt-5 flex w-full items-center justify-center gap-2 rounded-lg py-2 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="size-4" /> Quay lại đăng nhập
          </button>}
    </AuthShell>
  );
}
