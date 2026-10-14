import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { supabase } from '@/lib/supabase';

interface ProjectAccessValue {
  userId: string | null;
  profileLoaded: boolean;
  isAdmin: boolean;
  projectIds: string[];
  loading: boolean;
  error: string | null;
  reload: () => Promise<void>;
}

const ProjectAccessContext = createContext<ProjectAccessValue | null>(null);

export function ProjectAccessProvider({ children }: { children: ReactNode }) {
  const [userId, setUserId] = useState<string | null>(null);
  const [profileLoaded, setProfileLoaded] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [projectIds, setProjectIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadAccess = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError) throw userError;
      if (!user) throw new Error('No authenticated user is available.');
      setUserId(user.id);

      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .maybeSingle();
      if (profileError) throw profileError;
      // A successful lookup with no row is still a completed profile check. Keep the
      // app stable and let the admin-email fallback below restore the known admin.
      setProfileLoaded(true);

      let roleName = typeof profile?.role === 'string' ? profile.role : '';
      // Legacy installations stored the role as a foreign key; keep a fallback while the
      // database uses the new text-based profiles.role column.
      if (!roleName && typeof profile?.role_id === 'string') {
        const { data: legacyRole, error: legacyRoleError } = await supabase
          .from('roles')
          .select('name')
          .eq('id', profile.role_id)
          .maybeSingle();
        if (legacyRoleError) throw legacyRoleError;
        roleName = String(legacyRole?.name ?? '');
      }
      const admin = ['admin', 'super admin'].includes(roleName.trim().toLocaleLowerCase())
        || user.email?.trim().toLocaleLowerCase() === 'joao.americo@tlmmoz.org';
      setIsAdmin(admin);

      if (admin) {
        setProjectIds([]);
      } else {
        const { data: assignments, error: assignmentError } = await supabase
          .from('project_assignments')
          .select('project_id')
          .eq('user_id', user.id);
        if (assignmentError) throw assignmentError;
        setProjectIds([...new Set((assignments ?? []).map(assignment => String(assignment.project_id)))]);
      }
    } catch (loadError) {
      setProfileLoaded(false);
      setIsAdmin(false);
      setProjectIds([]);
      setError(loadError instanceof Error ? loadError.message : 'Unable to load project access.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadAccess();
  }, [loadAccess]);

  useEffect(() => {
    const channel = supabase
      .channel('project-access-current-user')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'project_assignments' }, () => {
        void loadAccess();
      })
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [loadAccess]);

  return (
    <ProjectAccessContext.Provider value={{ userId, profileLoaded, isAdmin, projectIds, loading, error, reload: loadAccess }}>
      {children}
    </ProjectAccessContext.Provider>
  );
}

// Shared access hook is exported alongside its provider for this context module.
// eslint-disable-next-line react-refresh/only-export-components
export function useProjectAccess() {
  const access = useContext(ProjectAccessContext);
  if (!access) throw new Error('useProjectAccess must be used within ProjectAccessProvider.');
  return access;
}
