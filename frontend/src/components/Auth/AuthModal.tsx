import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/context/AuthContext';
import { Mail, Lock, User as UserIcon, Loader2, Eye, EyeOff, ShieldCheck } from 'lucide-react';

export const AuthModal: React.FC = () => {
  const { isAuthModalOpen, authModalMode, closeAuthModal, login, register } = useAuth();

  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isAuthModalOpen) {
      setMode(authModalMode);
      setError(null);
      setName('');
      setEmail('');
      setPassword('');
    }
  }, [isAuthModalOpen, authModalMode]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!email.trim() || !password.trim()) {
      setError('Please fill in all required fields');
      return;
    }

    if (mode === 'register' && password.length < 8) {
      setError('Password must be at least 8 characters long');
      return;
    }

    setSubmitting(true);
    try {
      if (mode === 'login') {
        const success = await login(email.trim(), password);
        if (!success) {
          setError('Invalid email or password');
        }
      } else {
        const success = await register(email.trim(), password, name.trim() || undefined);
        if (!success) {
          setError('Registration failed. Please check your details and try again.');
        }
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={isAuthModalOpen} onOpenChange={open => !open && closeAuthModal()}>
      <DialogContent className="border-border bg-card text-foreground sm:max-w-md">
        <DialogHeader className="space-y-2 text-center sm:text-left">
          <div className="bg-primary/10 text-primary mx-auto flex size-10 items-center justify-center rounded-xl sm:mx-0">
            <ShieldCheck className="size-5" />
          </div>
          <DialogTitle className="text-xl font-bold tracking-tight">
            {mode === 'login' ? 'Sign in to your account' : 'Create an account'}
          </DialogTitle>
          <DialogDescription className="text-muted-foreground text-xs">
            {mode === 'login'
              ? 'Enter your credentials to access your projects and forecasts.'
              : 'Join the platform to start managing project risks and intelligence.'}
          </DialogDescription>
        </DialogHeader>

        {/* Tab switch */}
        <div className="bg-muted grid grid-cols-2 rounded-lg p-1 text-xs font-medium">
          <button
            type="button"
            onClick={() => {
              setMode('login');
              setError(null);
            }}
            className={`cursor-pointer rounded-md py-1.5 transition-all ${
              mode === 'login'
                ? 'bg-card text-foreground font-semibold shadow-xs'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => {
              setMode('register');
              setError(null);
            }}
            className={`cursor-pointer rounded-md py-1.5 transition-all ${
              mode === 'register'
                ? 'bg-card text-foreground font-semibold shadow-xs'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Create Account
          </button>
        </div>

        {error && (
          <div className="border-destructive/30 bg-destructive/10 text-destructive rounded-md border px-3 py-2 text-xs font-medium">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3.5 pt-1">
          {mode === 'register' && (
            <div className="space-y-1">
              <label className="text-muted-foreground text-xs font-medium">Full Name</label>
              <div className="relative">
                <UserIcon className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
                <Input
                  type="text"
                  placeholder="e.g. Alex Johnson"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  className="pl-9 text-xs"
                />
              </div>
            </div>
          )}

          <div className="space-y-1">
            <label className="text-muted-foreground text-xs font-medium">
              Email Address <span className="text-destructive">*</span>
            </label>
            <div className="relative">
              <Mail className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
              <Input
                type="email"
                placeholder="name@company.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                className="pl-9 text-xs"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-muted-foreground text-xs font-medium">
              Password <span className="text-destructive">*</span>
            </label>
            <div className="relative">
              <Lock className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
              <Input
                type={showPassword ? 'text' : 'password'}
                placeholder={mode === 'register' ? 'At least 8 characters' : '••••••••'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                className="pr-9 pl-9 text-xs"
              />
              <button
                type="button"
                onClick={() => setShowPassword(p => !p)}
                className="text-muted-foreground hover:text-foreground absolute top-1/2 right-3 -translate-y-1/2 cursor-pointer"
              >
                {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </button>
            </div>
          </div>

          <Button type="submit" disabled={submitting} className="mt-2 w-full text-xs font-medium">
            {submitting ? (
              <>
                <Loader2 className="mr-2 size-4 animate-spin" />
                {mode === 'login' ? 'Signing in...' : 'Creating account...'}
              </>
            ) : mode === 'login' ? (
              'Sign In'
            ) : (
              'Create Account'
            )}
          </Button>
        </form>

        <div className="border-border text-muted-foreground border-t pt-2 text-center text-xs">
          {mode === 'login' ? (
            <p>
              Don't have an account?{' '}
              <button
                type="button"
                onClick={() => {
                  setMode('register');
                  setError(null);
                }}
                className="text-primary cursor-pointer font-semibold hover:underline"
              >
                Sign up
              </button>
            </p>
          ) : (
            <p>
              Already have an account?{' '}
              <button
                type="button"
                onClick={() => {
                  setMode('login');
                  setError(null);
                }}
                className="text-primary cursor-pointer font-semibold hover:underline"
              >
                Sign in
              </button>
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
