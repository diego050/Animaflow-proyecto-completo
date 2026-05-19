import { useEffect, useState } from 'react';
import { useAdminStore } from '../../store/useAdminStore';
import { Loader2, Search, MoreVertical, Ban, Check, Trash2, Shield } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export function AdminUsersPage() {
  const {
    users,
    usersLoading,
    usersTotal,
    usersPage,
    fetchUsers,
    toggleUserStatus,
    deleteUser,
    changeUserRole,
  } = useAdminStore();

  const [search, setSearch] = useState('');
  const [menuOpen, setMenuOpen] = useState<string | null>(null);
  const [roleModal, setRoleModal] = useState<string | null>(null);
  const [selectedRole, setSelectedRole] = useState('');

  useEffect(() => {
    fetchUsers(1, search);
  }, [fetchUsers, search]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchUsers(1, search);
  };

  const handleToggleStatus = async (userId: string, isActive: boolean) => {
    await toggleUserStatus(userId, isActive);
    setMenuOpen(null);
  };

  const handleDelete = async (userId: string) => {
    if (window.confirm('¿Estás seguro de eliminar este usuario?')) {
      await deleteUser(userId);
      setMenuOpen(null);
    }
  };

  const openRoleModal = (userId: string, currentRole: string) => {
    setRoleModal(userId);
    setSelectedRole(currentRole);
    setMenuOpen(null);
  };

  const handleRoleChange = async () => {
    if (roleModal) {
      await changeUserRole(roleModal, selectedRole);
      setRoleModal(null);
    }
  };

  const roles: Array<{ value: string; label: string; color: string }> = [
    { value: 'founder', label: 'Founder', color: 'text-amber-400 bg-amber-400/10' },
    { value: 'agency', label: 'Agency', color: 'text-blue-400 bg-blue-400/10' },
    { value: 'pilot', label: 'Pilot', color: 'text-emerald-400 bg-emerald-400/10' },
    { value: 'admin', label: 'Admin', color: 'text-violet-400 bg-violet-400/10' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold text-gray-100">Gestión de Usuarios</h1>
          <p className="text-gray-400 mt-1">{usersTotal} usuarios registrados</p>
        </div>
      </div>

      <form onSubmit={handleSearch} className="flex gap-2">
        <div className="relative flex-1">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nombre o email..."
            className="w-full bg-gray-800 border border-gray-700 rounded-lg pl-10 pr-4 py-2.5 text-sm text-gray-100 placeholder-gray-500 focus:outline-none focus:border-violet-500 transition-colors"
          />
        </div>
        <button
          type="submit"
          className="px-4 py-2.5 bg-violet-600 hover:bg-violet-500 text-white text-sm font-medium rounded-lg transition-colors"
        >
          Buscar
        </button>
      </form>

      {usersLoading ? (
        <div className="flex items-center justify-center h-48">
          <Loader2 size={32} className="animate-spin text-violet-400" />
        </div>
      ) : users.length === 0 ? (
        <div className="text-center text-gray-500 py-12 bg-gray-900 border border-gray-800 rounded-xl">
          No se encontraron usuarios.
        </div>
      ) : (
        <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-800">
                  <th className="text-left px-4 py-3 text-gray-500 font-medium">Usuario</th>
                  <th className="text-left px-4 py-3 text-gray-500 font-medium hidden sm:table-cell">Rol</th>
                  <th className="text-left px-4 py-3 text-gray-500 font-medium hidden md:table-cell">Jobs</th>
                  <th className="text-left px-4 py-3 text-gray-500 font-medium hidden lg:table-cell">Estado</th>
                  <th className="text-left px-4 py-3 text-gray-500 font-medium hidden lg:table-cell">Registro</th>
                  <th className="w-10 px-4 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => {
                  const roleConfig = roles.find((r) => r.value === user.role);
                  return (
                    <tr key={user.id} className="border-b border-gray-800/50 hover:bg-gray-800/30 transition-colors">
                      <td className="px-4 py-3">
                        <div>
                          <p className="font-medium text-gray-100">{user.name}</p>
                          <p className="text-xs text-gray-500">{user.email}</p>
                        </div>
                      </td>
                      <td className="px-4 py-3 hidden sm:table-cell">
                        <span className={`inline-block text-xs font-medium px-2 py-0.5 rounded ${roleConfig?.color || 'text-gray-400 bg-gray-700'}`}>
                          {roleConfig?.label || user.role}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-400 hidden md:table-cell">
                        {user.completed_jobs}/{user.total_jobs}
                      </td>
                      <td className="px-4 py-3 hidden lg:table-cell">
                        <span className={`inline-flex items-center gap-1.5 text-xs font-medium ${user.is_active ? 'text-emerald-400' : 'text-red-400'}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${user.is_active ? 'bg-emerald-400' : 'bg-red-400'}`} />
                          {user.is_active ? 'Activo' : 'Inactivo'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-500 text-xs hidden lg:table-cell">
                        {new Date(user.created_at).toLocaleDateString('es-ES')}
                      </td>
                      <td className="px-4 py-3 relative">
                        <button
                          onClick={() => setMenuOpen(menuOpen === user.id ? null : user.id)}
                          className="p-1 rounded hover:bg-gray-700 text-gray-400 hover:text-gray-100 transition-colors"
                        >
                          <MoreVertical size={16} />
                        </button>

                        <AnimatePresence>
                          {menuOpen === user.id && (
                            <motion.div
                              initial={{ opacity: 0, y: -8 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, y: -8 }}
                              className="absolute right-0 top-10 w-48 bg-gray-800 border border-gray-700 rounded-lg shadow-xl py-1 z-10"
                            >
                              <button
                                onClick={() => openRoleModal(user.id, user.role)}
                                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-300 hover:bg-gray-700 transition-colors"
                              >
                                <Shield size={14} />
                                Cambiar rol
                              </button>
                              <button
                                onClick={() => handleToggleStatus(user.id, user.is_active)}
                                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-300 hover:bg-gray-700 transition-colors"
                              >
                                {user.is_active ? <Ban size={14} /> : <Check size={14} />}
                                {user.is_active ? 'Desactivar' : 'Activar'}
                              </button>
                              <div className="my-1 border-t border-gray-700" />
                              <button
                                onClick={() => handleDelete(user.id)}
                                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-400 hover:bg-gray-700 transition-colors"
                              >
                                <Trash2 size={14} />
                                Eliminar
                              </button>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {usersTotal > 20 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-gray-800">
              <p className="text-xs text-gray-500">
                Mostrando {(usersPage - 1) * 20 + 1}-{Math.min(usersPage * 20, usersTotal)} de {usersTotal}
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => fetchUsers(usersPage - 1, search)}
                  disabled={usersPage <= 1}
                  className="px-3 py-1.5 text-xs font-medium rounded bg-gray-800 text-gray-300 hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  Anterior
                </button>
                <button
                  onClick={() => fetchUsers(usersPage + 1, search)}
                  disabled={usersPage * 20 >= usersTotal}
                  className="px-3 py-1.5 text-xs font-medium rounded bg-gray-800 text-gray-300 hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  Siguiente
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      <AnimatePresence>
        {roleModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-gray-900 border border-gray-800 rounded-xl p-6 w-full max-w-sm mx-4"
            >
              <h3 className="text-lg font-semibold text-gray-100 mb-4">Cambiar Rol</h3>
              <div className="space-y-2 mb-6">
                {roles.map((role) => (
                  <label
                    key={role.value}
                    className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors ${
                      selectedRole === role.value ? 'bg-gray-800 border border-violet-500/50' : 'border border-gray-700 hover:border-gray-600'
                    }`}
                  >
                    <input
                      type="radio"
                      name="role"
                      value={role.value}
                      checked={selectedRole === role.value}
                      onChange={() => setSelectedRole(role.value)}
                      className="sr-only"
                    />
                    <span className={`text-sm font-medium px-2 py-0.5 rounded ${role.color}`}>
                      {role.label}
                    </span>
                  </label>
                ))}
              </div>
              <div className="flex gap-2 justify-end">
                <button
                  onClick={() => setRoleModal(null)}
                  className="px-4 py-2 text-sm font-medium text-gray-400 hover:text-gray-100 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleRoleChange}
                  className="px-4 py-2 text-sm font-medium bg-violet-600 hover:bg-violet-500 text-white rounded-lg transition-colors"
                >
                  Guardar
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
