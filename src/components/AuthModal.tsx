import React, { useState, useEffect } from 'react';
import {
  X,
  Mail,
  Lock,
  User,
  Loader2,
  LogIn,
  UserPlus,
  KeyRound,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  ArrowLeft
} from 'lucide-react';
import { Language } from '../types';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  language: Language;
  isGoogleLoading?: boolean;
  onGoogleLogin: () => Promise<void> | void;
  // 邮箱密码登录：成功后由调用方同步用户并返回，此组件随后关闭
  onEmailLogin: (email: string, password: string) => Promise<void>;
  // 邮箱注册：返回 true = 已自动登录成功（可关闭）；false = 需要先去邮箱验证
  onEmailSignUp: (
    email: string,
    password: string,
    displayName: string
  ) => Promise<boolean>;
  // 发送找回密码邮件
  onSendResetEmail: (email: string) => Promise<void>;
  // 找回密码链接回跳后，用新会话设置新密码
  onSetNewPassword?: (password: string) => Promise<void>;
  // 打开时的初始模式（找回密码回跳时直接展示「设置新密码」）
  initialMode?: AuthMode;
}

export type AuthMode = 'signin' | 'signup' | 'forgot' | 'newpass';

// 常见 Supabase Auth 错误 → 用户能看懂的中文提示
function translateAuthError(message: string): string {
  const m = message || '';
  if (/invalid login credentials/i.test(m)) return '邮箱或密码不正确，请核对后重试。';
  if (/email not confirmed/i.test(m))
    return '该邮箱尚未验证：请先点击注册邮件中的验证链接激活账号，再回来登录。';
  if (/user already registered/i.test(m)) return '该邮箱已注册，请直接登录；若忘记密码可点击「忘记密码」找回。';
  if (/password should be at least/i.test(m)) return '密码长度至少需要 6 位，请重新设置。';
  if (/unable to validate email address/i.test(m)) return '邮箱格式无效，请输入正确的邮箱地址。';
  if (/rate limit|too many|after \d+ seconds/i.test(m)) return '操作过于频繁，请稍等 60 秒后再试。';
  if (/signup.*disabled|email.*provider.*disabled|provider is not enabled/i.test(m))
    return '邮箱注册暂未开启：请在 Supabase 控制台 → Authentication → Providers → Email 中启用邮箱登录。';
  if (/not configured/i.test(m)) return '云端登录尚未配置：请在项目根目录 .env 中填写 Supabase 地址与密钥。';
  if (/network|fetch|connection/i.test(m)) return '网络连接异常，请检查网络后重试。';
  return m;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  language,
  isGoogleLoading = false,
  onGoogleLogin,
  onEmailLogin,
  onEmailSignUp,
  onSendResetEmail,
  onSetNewPassword,
  initialMode
}) => {
  const [mode, setMode] = useState<AuthMode>(initialMode || 'signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [errMsg, setErrMsg] = useState<string | null>(null);
  const [infoMsg, setInfoMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // 每次打开弹窗时重置表单状态
  useEffect(() => {
    if (isOpen) {
      setMode(initialMode || 'signin');
      setEmail('');
      setPassword('');
      setDisplayName('');
      setErrMsg(null);
      setInfoMsg(null);
      setLoading(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const zh = language === 'zh';

  const switchMode = (next: AuthMode) => {
    setMode(next);
    setErrMsg(null);
    setInfoMsg(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrMsg(null);
    setInfoMsg(null);
    const trimmedEmail = email.trim();
    const trimmedName = displayName.trim();

    if (mode !== 'newpass') {
      if (!trimmedEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
        setErrMsg(zh ? '请输入有效的邮箱地址。' : 'Please enter a valid email address.');
        return;
      }
    }
    if ((mode === 'signup' || mode === 'newpass') && password.length < 6) {
      setErrMsg(zh ? '密码长度至少需要 6 位。' : 'Password must be at least 6 characters.');
      return;
    }
    if (mode === 'signin' && !password) {
      setErrMsg(zh ? '请输入密码。' : 'Please enter your password.');
      return;
    }

    setLoading(true);
    try {
      if (mode === 'newpass') {
        // 找回密码回跳后的最后一步：保存新密码（由调用方提示并关闭弹窗）
        if (!onSetNewPassword) throw new Error('当前不支持设置新密码，请重新发起找回密码。');
        await onSetNewPassword(password);
        return;
      }
      if (mode === 'signin') {
        await onEmailLogin(trimmedEmail, password);
        // 登录成功 → 调用方已接管，直接关闭弹窗
        onClose();
      } else if (mode === 'signup') {
        const autoLoggedIn = await onEmailSignUp(trimmedEmail, password, trimmedName);
        if (autoLoggedIn) {
          onClose();
        } else {
          // 需要先去邮箱点击验证链接
          setPassword('');
          setInfoMsg(
            zh
              ? `注册成功！我们已向 ${trimmedEmail} 发送了一封验证邮件，请查收并点击其中的链接完成验证，之后即可返回登录。`
              : `Signed up! We sent a confirmation link to ${trimmedEmail}. Please verify it before signing in.`
          );
          setMode('signin');
        }
      } else {
        await onSendResetEmail(trimmedEmail);
        setPassword('');
        setInfoMsg(
          zh
            ? `重置密码邮件已发送至 ${trimmedEmail}，请查收并点击邮件中的链接设置新密码。`
            : `Password reset link sent to ${trimmedEmail}. Please check your inbox.`
        );
        setMode('signin');
      }
    } catch (err: any) {
      setErrMsg(translateAuthError(err?.message || String(err)));
    } finally {
      setLoading(false);
    }
  };

  const submitting = loading || isGoogleLoading;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/70 backdrop-blur-xs p-4 animate-in fade-in">
      <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 text-slate-800 relative max-h-[92vh] overflow-y-auto scrollbar-none">
        {/* 关闭按钮 */}
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 text-slate-400 hover:text-slate-600 p-1.5 rounded-full hover:bg-slate-100 transition-colors cursor-pointer"
          aria-label={zh ? '关闭' : 'Close'}
        >
          <X className="w-5 h-5" />
        </button>

        {/* 品牌标题 */}
        <div className="flex items-center gap-3 mb-5 pr-8">
          <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-indigo-600 to-violet-600 text-white flex items-center justify-center shadow-md shadow-indigo-600/20 shrink-0">
            {mode === 'signup' ? (
              <UserPlus className="w-5 h-5" />
            ) : mode === 'forgot' || mode === 'newpass' ? (
              <KeyRound className="w-5 h-5" />
            ) : (
              <LogIn className="w-5 h-5" />
            )}
          </div>
          <div>
            <h2 className="text-lg font-black text-slate-900 tracking-tight">
              {mode === 'signup'
                ? zh
                  ? '注册账号'
                  : 'Create account'
                : mode === 'forgot'
                  ? zh
                    ? '找回密码'
                    : 'Reset password'
                  : mode === 'newpass'
                    ? zh
                      ? '设置新密码'
                      : 'Set new password'
                    : zh
                      ? '登录账号'
                      : 'Sign in'}
            </h2>
            <p className="text-[11px] text-slate-500 font-medium leading-snug">
              {mode === 'newpass'
                ? zh
                  ? '您正在通过邮件链接重置密码，输入新密码后即可用新密码登录'
                  : 'Set a new password — you can sign in with it right after saving'
                : zh
                  ? '支持 Google 或邮箱密码登录，档案自动云端备份'
                  : 'Google or email login with cloud backup'}
            </p>
          </div>
        </div>

        {/* 模式切换标签（仅 登录 / 注册，忘记密码在登录页底部进入） */}
        {mode !== 'forgot' && mode !== 'newpass' && (
          <div className="grid grid-cols-2 gap-1 p-1 rounded-xl bg-slate-100 mb-4">
            {(['signin', 'signup'] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => switchMode(m)}
                disabled={submitting}
                className={`py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  mode === m
                    ? 'bg-white text-indigo-700 shadow-sm border border-slate-200'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                {m === 'signin' ? (zh ? '登录' : 'Sign in') : zh ? '注册新账号' : 'Sign up'}
              </button>
            ))}
          </div>
        )}

        {/* 顶部提示（忘记密码模式） */}
        {mode === 'forgot' && (
          <button
            type="button"
            onClick={() => switchMode('signin')}
            className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-800 mb-3 cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            {zh ? '返回登录' : 'Back to sign in'}
          </button>
        )}

        {/* 全局信息提示 */}
        {infoMsg && (
          <div className="flex items-start gap-2 px-3 py-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-medium mb-3 animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <span className="leading-relaxed break-all">{infoMsg}</span>
          </div>
        )}
        {errMsg && (
          <div className="flex items-start gap-2 px-3 py-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium mb-3 animate-in fade-in">
            <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
            <span className="leading-relaxed break-all">{errMsg}</span>
          </div>
        )}

        {/* Google 一键登录（登录 / 注册模式都展示） */}
        {mode !== 'forgot' && mode !== 'newpass' && (
          <>
            <button
              type="button"
              onClick={async () => {
                setErrMsg(null);
                setInfoMsg(null);
                try {
                  await onGoogleLogin();
                } catch (err: any) {
                  setErrMsg(translateAuthError(err?.message || String(err)));
                }
              }}
              disabled={isGoogleLoading}
              className="w-full flex items-center justify-center gap-2.5 px-4 py-3 rounded-xl bg-white border-2 border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-slate-800 text-sm font-bold shadow-xs transition-all cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {isGoogleLoading ? (
                <Loader2 className="w-4 h-4 text-indigo-600 animate-spin" />
              ) : (
                <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                </svg>
              )}
              <span>
                {isGoogleLoading
                  ? zh
                    ? '正在前往 Google 完成登录…'
                    : 'Redirecting to Google…'
                  : zh
                    ? '使用 Google 账号登录'
                    : 'Continue with Google'}
              </span>
            </button>

            <div className="flex items-center gap-3 my-4">
              <div className="h-px flex-1 bg-slate-200" />
              <span className="text-[11px] text-slate-400 font-bold">
                {zh ? '或使用邮箱登录' : 'or with email'}
              </span>
              <div className="h-px flex-1 bg-slate-200" />
            </div>
          </>
        )}

        {/* 邮箱 / 密码表单 */}
        <form onSubmit={handleSubmit} className="space-y-3">
          {mode === 'signup' && (
            <div className="relative">
              <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                disabled={submitting}
                placeholder={zh ? '昵称（选填，如：恩典烘焙坊主理人）' : 'Display name (optional)'}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-none text-sm transition-all disabled:bg-slate-50"
              />
            </div>
          )}

          {mode !== 'newpass' && (
          <div className="relative">
            <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                setErrMsg(null);
              }}
              disabled={submitting}
              placeholder={zh ? '邮箱地址' : 'Email address'}
              autoComplete="email"
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-none text-sm transition-all disabled:bg-slate-50"
            />
          </div>
          )}

          {mode !== 'forgot' && (
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setErrMsg(null);
                }}
                disabled={submitting}
                placeholder={
                  mode === 'newpass'
                    ? zh
                      ? '新密码（至少 6 位）'
                      : 'New password (min 6 characters)'
                    : mode === 'signup'
                      ? zh
                        ? '设置密码（至少 6 位）'
                        : 'Password (min 6 characters)'
                      : zh
                        ? '密码'
                        : 'Password'
                }
                autoComplete={mode === 'signup' || mode === 'newpass' ? 'new-password' : 'current-password'}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-none text-sm transition-all disabled:bg-slate-50"
              />
            </div>
          )}

          {mode === 'signin' && (
            <div className="flex justify-end -mt-1">
              <button
                type="button"
                onClick={() => switchMode('forgot')}
                disabled={submitting}
                className="text-[11px] font-semibold text-indigo-600 hover:text-indigo-800 cursor-pointer"
              >
                {zh ? '忘记密码？' : 'Forgot password?'}
              </button>
            </div>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white text-sm font-bold shadow-md shadow-indigo-600/20 transition-all cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            {mode === 'signin'
              ? zh
                ? '登 录'
                : 'Sign in'
              : mode === 'signup'
                ? zh
                  ? '注册并登录'
                  : 'Sign up'
                : mode === 'newpass'
                  ? zh
                    ? '保存新密码'
                    : 'Save new password'
                  : zh
                    ? '发送重置邮件'
                    : 'Send reset email'}
          </button>
        </form>

        {/* 隐私与安全说明 */}
        <div className="flex items-start gap-1.5 mt-4 pt-3 border-t border-slate-100 text-[10px] text-slate-400">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
          <span>
            {zh
              ? '登录仅用于跨设备备份您的自测档案；所有评估数据按账号隔离，平台承诺不对外披露。'
              : 'Sign-in is used only for cross-device backup. All data is isolated per account and never shared.'}
          </span>
        </div>
      </div>
    </div>
  );
};

export default AuthModal;
