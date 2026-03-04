
import React, { useState, useRef } from 'react';
import { LogIn, Shield, User as UserIcon, AlertCircle, Lock } from 'lucide-react';
import { User, UserRole } from '../types';
import { syncRead } from '../utils/syncStorage';
import { writeStorage } from '../utils/storage';
import { verifyPassword } from '../utils/crypto';

// ── Constantes de rate-limiting ─────────────────────────────
const MAX_ATTEMPTS = 5;
const LOCKOUT_SECONDS = 60;

interface Props {
  onLogin: (user: User) => void;
}

const Login: React.FC<Props> = ({ onLogin }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [attempts, setAttempts] = useState(0);
  const [lockUntil, setLockUntil] = useState<number>(0);
  const [lockCountdown, setLockCountdown] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const startLockout = () => {
    const until = Date.now() + LOCKOUT_SECONDS * 1000;
    setLockUntil(until);
    setLockCountdown(LOCKOUT_SECONDS);
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      const remaining = Math.ceil((until - Date.now()) / 1000);
      if (remaining <= 0) {
        clearInterval(timerRef.current!);
        timerRef.current = null;
        setLockUntil(0);
        setLockCountdown(0);
        setAttempts(0);
      } else {
        setLockCountdown(remaining);
      }
    }, 1000);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Rate limiting — bloquear se excedeu tentativas
    if (Date.now() < lockUntil) {
      setError(`Conta bloqueada. Tente novamente em ${lockCountdown}s.`);
      return;
    }

    setIsLoading(true);
    const inputUser = username.trim().toUpperCase();

    try {
      // Validar contra usuários cadastrados no banco local (inclui admin)
      const storedUsers = syncRead<User[]>('system_users', []);
      const matchedUser = storedUsers.find(
        (u) => u.username.toUpperCase() === inputUser
      );

      if (matchedUser && matchedUser.passwordHash) {
        const isValid = await verifyPassword(password, matchedUser.passwordHash);
        if (isValid) {
          if (matchedUser.status !== 'Ativo') {
            setError('Usuário inativo. Contate o administrador.');
            setIsLoading(false);
            return;
          }
          // Salvar sessão sem expor dados sensíveis, com expiração
          const { passwordHash: _ph, password: _pw, ...safeUser } = matchedUser;
          const session = { ...safeUser, _loginAt: Date.now(), _expiresAt: Date.now() + 8 * 60 * 60 * 1000 };
          writeStorage('frota_user', session);
          setAttempts(0);
          onLogin(safeUser as User);
          setIsLoading(false);
          return;
        }
      }

      // Incrementar tentativas e verificar lockout
      const newAttempts = attempts + 1;
      setAttempts(newAttempts);
      if (newAttempts >= MAX_ATTEMPTS) {
        startLockout();
        setError(`Muitas tentativas falhadas. Conta bloqueada por ${LOCKOUT_SECONDS}s.`);
      } else {
        setError(`Credenciais inválidas. (${MAX_ATTEMPTS - newAttempts} tentativa(s) restante(s))`);
      }
    } catch {
      setError('Erro ao processar login.');
    }
    setIsLoading(false);
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-6 relative overflow-hidden">
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-600/20 blur-[100px] rounded-full"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-indigo-600/20 blur-[100px] rounded-full"></div>

      <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden relative z-10">
        <div className="p-8 text-center bg-slate-50 border-b border-slate-100">
          <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center font-black text-2xl text-white mx-auto shadow-xl shadow-blue-200 mb-4">
            FG
          </div>
          <h2 className="text-2xl font-bold text-slate-800">FrotaGestor Pro</h2>
          <p className="text-slate-500 text-sm mt-1">Acesso Restrito ao Sistema</p>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-6">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-xl text-sm flex items-center gap-2 animate-in fade-in zoom-in-95">
              <AlertCircle size={18} />
              {error}
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">Usuário</label>
              <input 
                type="text" 
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Usuário"
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all uppercase" 
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">Senha</label>
              <input 
                type="password" 
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all" 
              />
            </div>
          </div>

          <button 
            type="submit"
            disabled={isLoading || Date.now() < lockUntil}
            className={`w-full py-4 px-6 text-white rounded-xl font-bold text-lg flex items-center justify-center gap-3 shadow-xl shadow-blue-200 transition-all ${
              isLoading || Date.now() < lockUntil ? 'bg-slate-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'
            }`}
          >
            {isLoading ? 'Verificando...' : Date.now() < lockUntil ? `Bloqueado (${lockCountdown}s)` : 'Entrar no Sistema'} {!isLoading && Date.now() >= lockUntil ? <LogIn size={20} /> : Date.now() < lockUntil ? <Lock size={20} /> : null}
          </button>
        </form>

        <div className="px-8 py-4 bg-slate-50 border-t border-slate-100 text-center">
          <p className="text-xs text-slate-400">© 2026 FrotaGestor Pro. Infraestrutura produzido por Ananias Feliciano</p>
        </div>
      </div>
    </div>
  );
};

export default Login;
