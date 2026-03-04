
import React, { useState } from 'react';
import { LogIn, Shield, User as UserIcon, AlertCircle } from 'lucide-react';
import { User, UserRole } from '../types';
import { readStorage, writeStorage } from '../utils/storage';

interface Props {
  onLogin: (user: User) => void;
}

const Login: React.FC<Props> = ({ onLogin }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const inputUser = username.trim().toUpperCase();

    // 1. Credencial mestre do administrador (sempre funciona)
    if (inputUser === 'SARTINFO' && password === 'str@10108893') {
      const adminUser: User = {
        id: 'admin-01',
        name: 'SARTINFO Admin',
        username: 'SARTINFO',
        role: UserRole.ADMIN,
        status: 'Ativo'
      };
      writeStorage('frota_user', adminUser);
      onLogin(adminUser);
      return;
    }

    // 2. Validar contra usuários cadastrados no banco local
    const storedUsers = readStorage<User[]>('system_users', []);
    const matchedUser = storedUsers.find(
      (u) => u.username.toUpperCase() === inputUser && u.password === password
    );

    if (matchedUser) {
      if (matchedUser.status !== 'Ativo') {
        setError('Usuário inativo. Contate o administrador.');
        return;
      }
      // Salvar sessão sem expor a senha
      const { password: _pw, ...safeUser } = matchedUser;
      writeStorage('frota_user', safeUser as User);
      onLogin(safeUser as User);
      return;
    }

    setError('Credenciais inválidas. Verifique usuário e senha.');
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
            className="w-full py-4 px-6 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-lg flex items-center justify-center gap-3 shadow-xl shadow-blue-200 transition-all"
          >
            Entrar no Sistema <LogIn size={20} />
          </button>
        </form>

        <div className="px-8 py-4 bg-slate-50 border-t border-slate-100 text-center">
          <p className="text-xs text-slate-400">© 2026 FrotaGestor Pro. Infraestrutura SARTINFO. Produzido por Ananias Feliciano</p>
        </div>
      </div>
    </div>
  );
};

export default Login;
