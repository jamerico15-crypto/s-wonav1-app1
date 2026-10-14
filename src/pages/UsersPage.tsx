import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { createClient } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { useRealtimeTable } from '@/lib/useRealtimeTable';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input, Select, Textarea } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { MODULE_LABELS, ALL_MODULES } from '@/lib/constants';
import type { Role, Permission, Profile, ModuleName, Project, ProjectAssignment } from '@/types';
import { Plus, Trash2, Users, Shield, Check, Mail, CheckCircle2, ShieldCheck, LockKeyhole } from 'lucide-react';

interface UserRow {
  id: string;
  email: string;
  full_name: string | null;
  role: string | null;
  role_name: string | null;
  created_at: string;
}

interface NewUserForm {
  fullName: string;
  email: string;
  password: string;
  role: string;
}

const EMPTY_NEW_USER: NewUserForm = { fullName: '', email: '', password: '', role: '' };

export function UsersPage() {
  const { data: profiles, loading: loadingProf, reload: reloadProfiles } = useRealtimeTable<Profile & { email?: string | null }>('profiles', {
    orderBy: { column: 'role', ascending: true },
  });
  const { data: roles, loading: loadingRoles, reload: reloadRoles } = useRealtimeTable<Role>('roles', {
    orderBy: { column: 'name', ascending: true },
  });
  const { data: permissions, reload: reloadPermissions } = useRealtimeTable<Permission>('permissions', {
    orderBy: { column: 'role_id', ascending: true },
  });
  const { data: projects, loading: loadingProjects } = useRealtimeTable<Project>('projects', {
    orderBy: { column: 'title', ascending: true },
  });
  const [projectAssignments, setProjectAssignments] = useState<ProjectAssignment[]>([]);
  const [loadingAssignments, setLoadingAssignments] = useState(true);
  const [assignmentError, setAssignmentError] = useState<string | null>(null);
  const [savingAssignment, setSavingAssignment] = useState<string | null>(null);
  const [createUserOpen, setCreateUserOpen] = useState(false);
  const [newUser, setNewUser] = useState<NewUserForm>(EMPTY_NEW_USER);
  const [creatingUser, setCreatingUser] = useState(false);
  const [createUserError, setCreateUserError] = useState<string | null>(null);
  const [createUserSuccess, setCreateUserSuccess] = useState<string | null>(null);
  const loading = loadingProf || loadingRoles || loadingProjects || loadingAssignments;
  const [tab, setTab] = useState<'users' | 'roles' | 'permissions'>('users');

  const canCreate = true;
  const canUpdate = true;
  const canDelete = true;

  const loadProjectAssignments = useCallback(async () => {
    setLoadingAssignments(true);
    const { data, error } = await supabase.from('project_assignments').select('*');
    if (error) setAssignmentError(error.message);
    else {
      setProjectAssignments(data as ProjectAssignment[] ?? []);
      setAssignmentError(null);
    }
    setLoadingAssignments(false);
  }, []);

  useEffect(() => { void loadProjectAssignments(); }, [loadProjectAssignments]);

  const rolesMap = new Map<string, string>(roles.map(r => [r.id, r.name]));
  const users: UserRow[] = profiles.map(p => ({
    id: p.id,
    email: p.email ?? '',
    full_name: p.full_name,
    role: p.role ?? (p.role_id ? rolesMap.get(p.role_id) ?? null : null),
    role_name: p.role ?? (p.role_id ? rolesMap.get(p.role_id) ?? null : null),
    created_at: p.created_at,
  }));
  const hasNoNormalUsers = users.length > 0 && users.every(user => user.role_name?.trim().toLowerCase() === 'admin');

  async function updateProfileRole(profileId: string, roleName: string) {
    const { error } = await supabase.rpc('admin_assign_role_text', {
      target_profile_id: profileId,
      new_role: roleName || null,
    });
    if (error) {
      alert(`Não foi possível atualizar o cargo: ${error.message}`);
      return;
    }
    reloadProfiles();
  }

  async function createUser(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!newUser.role) {
      setCreateUserError('Selecione um cargo para o novo utilizador.');
      return;
    }
    if (newUser.password.length < 8) {
      setCreateUserError('A palavra-passe deve ter pelo menos 8 caracteres.');
      return;
    }

    setCreatingUser(true);
    setCreateUserError(null);
    setCreateUserSuccess(null);
    try {
      const signupClient = createClient(
        (import.meta.env.VITE_SUPABASE_URL || import.meta.env.NEXT_PUBLIC_SUPABASE_URL || '').trim(),
        (import.meta.env.VITE_SUPABASE_ANON_KEY || import.meta.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '').trim(),
        { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } },
      );
      const { data, error } = await signupClient.auth.signUp({
        email: newUser.email.trim(),
        password: newUser.password,
        options: { data: { full_name: newUser.fullName.trim() } },
      });
      if (error) throw error;
      if (!data.user) throw new Error('O Supabase não devolveu o novo utilizador.');

      const { error: roleError } = await supabase.rpc('admin_assign_role_text', {
        target_profile_id: data.user.id,
        new_role: newUser.role,
      });
      if (roleError) {
        throw new Error(`A conta foi criada, mas não foi possível atribuir o cargo: ${roleError.message}`);
      }

      setCreateUserSuccess(data.session
        ? 'Utilizador criado e cargo atribuído com sucesso.'
        : 'Utilizador criado e cargo atribuído. O Supabase poderá enviar um email para confirmar a conta.');
      setNewUser(EMPTY_NEW_USER);
      await reloadProfiles();
    } catch (error) {
      setCreateUserError(error instanceof Error ? error.message : 'Não foi possível criar o utilizador.');
    } finally {
      setCreatingUser(false);
    }
  }

  async function toggleProjectAssignment(userId: string, projectId: string, assigned: boolean) {
    const assignmentKey = `${userId}:${projectId}`;
    setSavingAssignment(assignmentKey);
    setAssignmentError(null);
    const result = assigned
      ? await supabase.from('project_assignments').insert({ user_id: userId, project_id: projectId })
      : await supabase.from('project_assignments').delete().eq('user_id', userId).eq('project_id', projectId);
    if (result.error) {
      setAssignmentError(result.error.message);
    } else {
      await loadProjectAssignments();
    }
    setSavingAssignment(null);
  }

  async function deleteUser(userId: string, userName: string) {
    if (!confirm(`Delete user "${userName}"? This will permanently remove their profile.`)) return;
    const { error } = await supabase.from('profiles').delete().eq('id', userId);
    if (error) { alert('Error deleting user: ' + error.message); return; }
    reloadProfiles();
  }

  async function deleteRole(roleId: string) {
    const role = roles.find(item => item.id === roleId);
    if (role?.name.trim().toLocaleLowerCase() === 'admin') {
      alert('O cargo admin está protegido e não pode ser removido.');
      return;
    }
    if (!confirm('Delete this role? Users assigned to it will lose their role.')) return;
    const { error } = await supabase.from('roles').delete().eq('id', roleId);
    if (error) { alert('Error deleting role: ' + error.message); return; }
    reloadRoles();
  }

  async function togglePermission(roleId: string, module: ModuleName, field: keyof Permission) {
    const existing = permissions.find(p => p.role_id === roleId && p.module === module);
    if (existing) {
      const { error } = await supabase.from('permissions').update({ [field]: !existing[field] }).eq('id', existing.id);
      if (error) { alert('Error updating permission: ' + error.message); return; }
    } else {
      const { error } = await supabase.from('permissions').insert({
        role_id: roleId, module,
        can_create: field === 'can_create', can_read: field === 'can_read',
        can_update: field === 'can_update', can_delete: field === 'can_delete',
        can_visualize: field === 'can_visualize',
      });
      if (error) { alert('Error creating permission: ' + error.message); return; }
    }
    reloadPermissions();
  }

  if (loading) return <div className="flex justify-center h-64"><div className="w-8 h-8 border-2 border-[#EE3A25] border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div className="space-y-6">
      {/* Tabs */}
      <div className="flex gap-1 bg-slate-100 p-1 rounded-lg w-fit">
        {[
          { key: 'users' as const, label: 'Users', icon: Users },
          { key: 'roles' as const, label: 'Gestão de Cargos (Roles)', icon: Shield },
          { key: 'permissions' as const, label: 'Permissions', icon: Check },
        ].map(t => {
          const Icon = t.icon;
          return (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${tab === t.key ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
              <Icon className="w-4 h-4" /> {t.label}
            </button>
          );
        })}
      </div>

      {/* Users tab */}
      {tab === 'users' && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Utilizadores</h2>
              <p className="text-sm text-slate-500">Crie contas, atribua cargos e limite o acesso a projetos.</p>
            </div>
            <Button onClick={() => { setCreateUserError(null); setCreateUserSuccess(null); setCreateUserOpen(true); }}>
              <Plus className="h-4 w-4" /> Adicionar Utilizador
            </Button>
          </div>
          {assignmentError && (
            <div role="alert" className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
              Não foi possível carregar ou atualizar os projetos autorizados: {assignmentError}
            </div>
          )}
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50/80 text-left text-xs text-slate-500 uppercase tracking-wide">
                      <th className="px-5 py-3.5 font-semibold">Utilizador</th>
                      <th className="px-5 py-3.5 font-semibold">Função / Role</th>
                      <th className="px-5 py-3.5 font-semibold">Projetos Autorizados</th>
                      <th className="px-5 py-3.5 font-semibold">Estado</th>
                      <th className="px-5 py-3.5 font-semibold">Registado</th>
                      {(canUpdate || canDelete) && <th className="px-5 py-3.5 font-semibold text-right">Actions</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {users.map(u => (
                      <tr key={u.id} className="transition-colors hover:bg-slate-50/80">
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-rose-600 to-violet-800 text-sm font-semibold text-white shadow-sm">
                              {(u.full_name ?? u.email ?? 'U')[0].toUpperCase()}
                            </div>
                            <div className="flex flex-col">
                              <span className="font-medium text-slate-800">{u.full_name ?? 'Utilizador'}</span>
                              <span className="mt-0.5 flex items-center gap-1.5 text-xs text-slate-500"><Mail className="h-3.5 w-3.5" /> {u.email || 'Email indisponível'}</span>
                            </div>
                          </div>
                        </td>
                        <td className="px-5 py-4">
                          {u.role_name?.trim().toLocaleLowerCase() === 'admin' ? (
                            <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                              <ShieldCheck className="h-3.5 w-3.5" /> Admin
                            </span>
                          ) : canUpdate ? (
                            <Select value={u.role ?? ''} onChange={e => updateProfileRole(u.id, e.target.value)} className="py-1.5 text-xs max-w-[180px]">
                              <option value="">Sem cargo</option>
                              {roles.map(r => <option key={r.id} value={r.name}>{r.name}</option>)}
                            </Select>
                          ) : (
                            <span className="text-slate-700">{u.role_name ?? 'None'}</span>
                          )}
                        </td>
                        <td className="px-5 py-4">
                          {(() => {
                            const assignedProjectIds = projectAssignments
                              .filter(assignment => assignment.user_id === u.id)
                              .map(assignment => assignment.project_id);
                            return (
                              <details className="group min-w-48">
                                <summary className="cursor-pointer list-none rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50">
                                  {assignedProjectIds.length} projeto(s) selecionado(s)
                                </summary>
                                <div className="absolute z-20 mt-1 max-h-56 min-w-64 overflow-auto rounded-lg border border-slate-200 bg-white p-2 shadow-xl">
                                  {projects.length === 0 ? (
                                    <p className="px-2 py-3 text-xs text-slate-500">Não há projetos disponíveis.</p>
                                  ) : projects.map(project => {
                                    const checked = assignedProjectIds.includes(project.id);
                                    const assignmentKey = `${u.id}:${project.id}`;
                                    return (
                                      <label key={project.id} className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-2 text-xs text-slate-700 hover:bg-slate-50">
                                        <input
                                          type="checkbox"
                                          checked={checked}
                                          disabled={savingAssignment === assignmentKey}
                                          onChange={event => void toggleProjectAssignment(u.id, project.id, event.target.checked)}
                                          className="rounded border-slate-300 text-rose-700 focus:ring-rose-500"
                                        />
                                        <span>{project.title}</span>
                                      </label>
                                    );
                                  })}
                                </div>
                              </details>
                            );
                          })()}
                        </td>
                        <td className="px-5 py-4">
                          <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700">
                            <CheckCircle2 className="h-3.5 w-3.5" /> Ativo
                          </span>
                        </td>
                        <td className="px-5 py-4 text-sm text-slate-500">{new Date(u.created_at).toLocaleDateString()}</td>
                        {(canUpdate || canDelete) && (
                          <td className="px-5 py-4 text-right">
                            <div className="flex items-center justify-end gap-1">
                              {canDelete && (
                                <button
                                  onClick={() => deleteUser(u.id, u.full_name ?? u.email ?? 'Unknown')}
                                  className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                  title="Delete user"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              )}
                            </div>
                          </td>
                        )}
                      </tr>
                    ))}
                    {users.length === 0 && (
                      <tr><td colSpan={(canUpdate || canDelete) ? 6 : 5} className="px-5 py-12 text-center text-sm text-slate-500">Ainda não existem perfis registados.</td></tr>
                    )}
                    {hasNoNormalUsers && (
                      <tr>
                        <td colSpan={(canUpdate || canDelete) ? 6 : 5} className="px-5 py-6">
                          <div className="mx-auto flex max-w-3xl items-start gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-600">
                            <Users className="mt-0.5 h-5 w-5 shrink-0 text-slate-400" aria-hidden="true" />
                            <p>Não existem utilizadores normais registados de momento. Novos membros da equipa aparecerão aqui com a role 'user' após o registo.</p>
                          </div>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          <Modal open={createUserOpen} onClose={() => !creatingUser && setCreateUserOpen(false)} title="Adicionar utilizador">
            <form className="space-y-4" onSubmit={createUser}>
              <Input label="Nome completo" autoComplete="name" required value={newUser.fullName} onChange={event => setNewUser(current => ({ ...current, fullName: event.target.value }))} />
              <Input label="Email" type="email" autoComplete="email" required value={newUser.email} onChange={event => setNewUser(current => ({ ...current, email: event.target.value }))} />
              <Input label="Palavra-passe temporária" type="password" autoComplete="new-password" minLength={8} required value={newUser.password} onChange={event => setNewUser(current => ({ ...current, password: event.target.value }))} />
              <Select label="Cargo" required value={newUser.role} onChange={event => setNewUser(current => ({ ...current, role: event.target.value }))}>
                <option value="">Selecione um cargo...</option>
                {roles.map(role => <option key={role.id} value={role.name}>{role.name} — {role.description || 'Sem descrição'}</option>)}
              </Select>
              {createUserError && <p role="alert" className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800">{createUserError}</p>}
              {createUserSuccess && <p role="status" className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">{createUserSuccess}</p>}
              <div className="flex justify-end gap-3 pt-2">
                <Button type="button" variant="outline" disabled={creatingUser} onClick={() => setCreateUserOpen(false)}>Fechar</Button>
                <Button type="submit" disabled={creatingUser || roles.length === 0}>
                  <Plus className="h-4 w-4" /> {creatingUser ? 'A criar…' : 'Criar Utilizador'}
                </Button>
              </div>
            </form>
          </Modal>
        </div>
      )}

      {/* Roles tab */}
      {tab === 'roles' && <RolesTab roles={roles} canCreate={canCreate} canDelete={canDelete} onDelete={deleteRole} onRefresh={reloadRoles} />}

      {/* Permissions tab */}
      {tab === 'permissions' && (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-left text-xs text-slate-500 uppercase tracking-wide">
                    <th className="px-4 py-3 font-medium sticky left-0 bg-white">Module</th>
                    {roles.map(r => <th key={r.id} className="px-4 py-3 font-medium text-center">{r.name}</th>)}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {ALL_MODULES.map(mod => (
                    <tr key={mod} className="hover:bg-slate-50">
                      <td className="px-4 py-3 font-medium text-slate-700 sticky left-0 bg-white">{MODULE_LABELS[mod]}</td>
                      {roles.map(r => {
                        const perm = permissions.find(p => p.role_id === r.id && p.module === mod);
                        return (
                          <td key={r.id} className="px-4 py-3">
                            <div className="flex justify-center gap-1.5">
                              {(['can_create', 'can_read', 'can_update', 'can_delete', 'can_visualize'] as const).map(field => {
                                const labels = { can_create: 'C', can_read: 'R', can_update: 'U', can_delete: 'D', can_visualize: 'V' };
                                const active = perm ? perm[field] : false;
                                return (
                                  <button
                                    key={field}
                                    onClick={() => canUpdate && togglePermission(r.id, mod, field)}
                                    disabled={!canUpdate}
                                    title={field.replace('can_', '').replace(/^\w/, c => c.toUpperCase())}
                                    className={`w-7 h-7 rounded text-xs font-bold transition-all ${active ? 'bg-[#EE3A25] text-white' : 'bg-slate-100 text-slate-400 hover:bg-slate-200'} ${!canUpdate ? 'cursor-default' : 'cursor-pointer'}`}
                                  >
                                    {labels[field]}
                                  </button>
                                );
                              })}
                            </div>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

    </div>
  );
}

function RolesTab({ roles, canCreate, canDelete, onDelete, onRefresh }: {
  roles: Role[]; canCreate: boolean; canDelete: boolean; onDelete: (id: string) => void; onRefresh: () => void;
}) {
  const [form, setForm] = useState({ name: '', description: '' });
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setErrorMessage(null);
    const { error } = await supabase.from('roles').insert({
      name: form.name.trim(),
      description: form.description.trim() || null,
    });
    if (error) {
      setErrorMessage(error.message);
    } else {
      setForm({ name: '', description: '' });
      onRefresh();
    }
    setSaving(false);
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-5 py-3.5 font-semibold">Nome do Cargo</th>
                  <th className="px-5 py-3.5 font-semibold">Descrição do Cargo</th>
                  <th className="px-5 py-3.5 text-right font-semibold">Segurança</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {roles.map(role => {
                  const isAdminRole = role.name.trim().toLocaleLowerCase() === 'admin';
                  const isLocked = isAdminRole || role.is_system;
                  return (
                    <tr key={role.id} className="hover:bg-slate-50/70">
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2 font-medium text-slate-800">
                          <Shield className="h-4 w-4 text-[#711246]" />
                          {role.name}
                          {isAdminRole && <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold uppercase text-emerald-700">Admin</span>}
                        </div>
                      </td>
                      <td className="px-5 py-4 text-slate-600">{role.description || '—'}</td>
                      <td className="px-5 py-4 text-right">
                        {isLocked ? (
                          <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">
                            <LockKeyhole className="h-3.5 w-3.5" /> Trancado
                          </span>
                        ) : canDelete ? (
                          <button onClick={() => onDelete(role.id)} className="rounded-lg p-2 text-slate-400 transition hover:bg-rose-50 hover:text-rose-700" aria-label={`Remover cargo ${role.name}`} title="Remover cargo">
                            <Trash2 className="h-4 w-4" />
                          </button>
                        ) : <span className="text-xs text-slate-400">—</span>}
                      </td>
                    </tr>
                  );
                })}
                {roles.length === 0 && <tr><td colSpan={3} className="px-5 py-10 text-center text-sm text-slate-400">Ainda não existem cargos registados.</td></tr>}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {canCreate && (
        <Card>
          <CardContent>
            <div className="mb-5">
              <h3 className="font-semibold text-slate-900">Adicionar cargo</h3>
              <p className="mt-1 text-sm text-slate-500">Os cargos adicionados ficam imediatamente disponíveis na atribuição de utilizadores.</p>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <Input label="Nome do Cargo" required value={form.name} onChange={e => setForm(current => ({ ...current, name: e.target.value }))} placeholder="Ex.: Coordenador de Projeto" />
              <Textarea label="Descrição do Cargo" rows={3} value={form.description} onChange={e => setForm(current => ({ ...current, description: e.target.value }))} placeholder="Descreva as responsabilidades deste cargo" />
              {errorMessage && <p role="alert" className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800">Não foi possível adicionar o cargo: {errorMessage}</p>}
              <div className="flex justify-end">
                <Button type="submit" disabled={saving || !form.name.trim()}>
                  <Plus className="h-4 w-4" /> {saving ? 'A adicionar…' : 'Adicionar Cargo'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
