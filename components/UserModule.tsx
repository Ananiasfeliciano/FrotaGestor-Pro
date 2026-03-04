
import React, { useState, useEffect } from 'react';
import { Plus, Users, Shield, User as UserIcon, Trash2, X, MoreVertical, Key } from 'lucide-react';
import { User, UserRole } from '../types';
import { readStorage, writeStorage } from '../utils/storage';

interface Props {
  user: User;
  onAction: (action: string, details: string) => void;
}

const UserModule: React.FC<Props> = ({ user, onAction }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [users, setUsers] = useState<User[]>([]);

  useEffect(() => {
    const saved = readStorage<User[] | null>('system_users', null);
    if (saved) {
      setUsers(saved);
    } else {
      const initialUsers: User[] = [
        { id: '1', name: 'SARTINFO Admin', username: 'SARTINFO', password: 'str@10108893', role: UserRole.ADMIN, status: 'Ativo' },
        { id: '2', name: 'Carlos Operador', username: 'OPERADOR', password: '123456', role: UserRole.OPERATOR, status: 'Ativo' }
      ];
      setUsers(initialUsers);
      writeStorage('system_users', initialUsers);
    }
  }, []);

  const saveUsers = (newList: User[]) => {
    setUsers(newList);
    writeStorage('system_users', newList);
  };

  const handleCreateUser = (e: React.FormEvent) => {
    e.preventDefault();
    const formData = new FormData(e.target as HTMLFormElement);
    const newUser: User = {
      id: Math.random().toString(36).substr(2, 9),
      name: formData.get('name') as string,
      username: formData.get('username') as string,
      password: formData.get('password') as string,
      role: formData.get('role') as UserRole,
      status: 'Ativo'
    };
    
    const updated = [...users, newUser];
    saveUsers(updated);
    onAction('CRIAÇÃO', `Novo usuário ${newUser.name} (Login: ${newUser.username}, Perfil: ${newUser.role}) criado.`);
    setIsModalOpen(false);
  };

  const handleDelete = (id: string, name: string) => {
    if (id === user.id) return alert('Você não pode excluir seu próprio usuário.');
    if (confirm(`Excluir usuário ${name}?`)) {
      const updated = users.filter(u => u.id !== id);
      saveUsers(updated);
      onAction('EXCLUSÃO', `Usuário ${name} foi removido do sistema.`);
    }
  };

  return (
    <div className="space-y-6 animate-in slide-in-from-bottom-2 duration-500">
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center">
            <Users size={24} />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-800">Gestão de Usuários</h2>
            <p className="text-sm text-slate-500">Controle de acesso e permissões de perfis.</p>
          </div>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100"
        >
          <Plus size={20} /> Adicionar Usuário
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Nome / Login</th>
              <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Perfil</th>
              <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Status</th>
              <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {users.map((u) => (
              <tr key={u.id} className="hover:bg-slate-50 transition-colors">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-slate-100 text-slate-400 rounded-full flex items-center justify-center">
                      <UserIcon size={18} />
                    </div>
                    <div>
                      <p className="font-bold text-slate-800 text-sm">{u.name}</p>
                      <p className="text-xs text-slate-500">{u.username}</p>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border
                    ${u.role === UserRole.ADMIN ? 'bg-purple-50 text-purple-700 border-purple-100' : 'bg-blue-50 text-blue-700 border-blue-100'}
                  `}>
                    {u.role === UserRole.ADMIN ? <Shield size={12} /> : <UserIcon size={12} />}
                    {u.role}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-600">
                    <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></div>
                    {u.status}
                  </span>
                </td>
                <td className="px-6 py-4 text-right">
                  <button 
                    onClick={() => handleDelete(u.id, u.name)}
                    className="p-2 text-slate-400 hover:text-red-600 transition-colors"
                  >
                    <Trash2 size={18} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl animate-in zoom-in-95">
            <div className="px-8 py-6 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-xl font-bold text-slate-800">Novo Usuário</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400"><X size={24} /></button>
            </div>
            <form onSubmit={handleCreateUser} className="p-8 space-y-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1.5">Nome Completo</label>
                  <input name="name" required className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20" />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1.5">Login (Usuário)</label>
                  <input name="username" required className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 uppercase" />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1.5">Senha</label>
                  <div className="relative">
                    <input name="password" type="password" required className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20" />
                    <Key size={18} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-300" />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1.5">Perfil de Acesso</label>
                  <select name="role" className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20">
                    <option value={UserRole.OPERATOR}>Operador (Inspeções)</option>
                    <option value={UserRole.ADMIN}>Administrador (Acesso Total)</option>
                  </select>
                </div>
              </div>
              <div className="flex gap-3 pt-4">
                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-3 font-bold text-slate-500 hover:bg-slate-50 rounded-xl transition-colors">Cancelar</button>
                <button type="submit" className="flex-1 py-3 bg-indigo-600 text-white font-bold rounded-xl shadow-lg shadow-indigo-200 hover:bg-indigo-700 transition-all">Criar Usuário</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserModule;
