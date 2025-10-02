import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import AdminLayout from '@/components/admin/AdminLayout';
import InviteUserModal from '@/components/admin/InviteUserModal';
import UserDetailsModal from '@/components/admin/UserDetailsModal';
import { supabase } from '@/lib/supabaseClient';
import { toast } from 'sonner';
import { 
  Users, 
  Search,
  Filter,
  UserPlus,
  Shield,
  ShieldOff,
  Mail,
  Phone,
  Calendar,
  Home,
  Crown,
  MoreVertical,
  Edit,
  Trash2,
  CheckCircle,
  XCircle,
  AlertTriangle
} from 'lucide-react';

interface User {
  id: string;
  email: string;
  full_name: string | null;
  phone: string | null;
  role: 'user' | 'host' | 'admin';
  profile_completed: boolean;
  updated_at: string;
  last_sign_in_at?: string;
  // Estadísticas calculadas
  listingsCount?: number;
  bookingsCount?: number;
  subscriptionPlan?: string;
  subscriptionStatus?: string;
}

interface UserStats {
  totalUsers: number;
  totalHosts: number;
  totalAdmins: number;
  completedProfiles: number;
  activeThisMonth: number;
}

const fetchUsers = async (): Promise<User[]> => {
  try {
    // First check current user and their role
    const { data: currentUser } = await supabase.auth.getUser();
    const { data: currentProfile } = await supabase
      .from('profiles')
      .select('id, email, role')
      .eq('id', currentUser?.user?.id)
      .single();
    
    console.log('Current user info:', {
      userId: currentUser?.user?.id,
      userEmail: currentUser?.user?.email,
      profileRole: currentProfile?.role,
      isAdmin: currentProfile?.role === 'admin'
    });

    // Obtener usuarios con información básica
    const { data: users, error } = await supabase
      .from('profiles')
      .select('*')
      .order('updated_at', { ascending: false });

    if (error) {
      console.error('Profiles query error:', {
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint
      });
      throw error;
    }

    console.log('Fetched users from profiles table:', {
      count: users?.length || 0,
      users: users?.map(u => ({ id: u.id, email: u.email, role: u.role }))
    });

  // Para cada usuario, obtener estadísticas adicionales
  const usersWithStats = await Promise.all(
    (users || []).map(async (user) => {
      // Contar listings si es host
      let listingsCount = 0;
      if (user.role === 'host' || user.role === 'admin') {
        const { data: listings } = await supabase
          .from('listings')
          .select('id')
          .eq('host_id', user.id);
        listingsCount = listings?.length || 0;
      }

      // Contar reservas
      const { data: bookings } = await supabase
        .from('bookings')
        .select('id')
        .eq('user_id', user.id);
      const bookingsCount = bookings?.length || 0;

      // Obtener suscripción (manejo de errores por si no existe la tabla)
      let subscriptionPlan = 'N/A';
      let subscriptionStatus = 'N/A';
      try {
        const { data: subscription } = await supabase
          .from('subscriptions')
          .select('plan, status')
          .eq('user_id', user.id)
          .eq('status', 'active')
          .single();

        if (subscription) {
          subscriptionPlan = subscription.plan;
          subscriptionStatus = subscription.status;
        }
      } catch (error) {
        // Tabla de suscripciones no disponible
      }

      return {
        ...user,
        listingsCount,
        bookingsCount,
        subscriptionPlan,
        subscriptionStatus,
      };
    })
  );

    return usersWithStats;
  } catch (error) {
    console.error('Error fetching users:', error);
    // Return empty array to prevent crashes
    return [];
  }
};

const fetchUserStats = async (): Promise<UserStats> => {
  try {
    const { data: users, error } = await supabase
      .from('profiles')
      .select('role, profile_completed, updated_at');

    if (error) {
      console.error('User stats query error:', {
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint
      });
      throw error;
    }

  const totalUsers = users?.length || 0;
  const totalHosts = users?.filter(u => u.role === 'host').length || 0;
  const totalAdmins = users?.filter(u => u.role === 'admin').length || 0;
  const completedProfiles = users?.filter(u => u.profile_completed).length || 0;

  // Usuarios activos este mes (actualizados en los últimos 30 días)
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const activeThisMonth = users?.filter(u => 
    new Date(u.updated_at) > thirtyDaysAgo
  ).length || 0;

    return {
      totalUsers,
      totalHosts,
      totalAdmins,
      completedProfiles,
      activeThisMonth,
    };
  } catch (error) {
    console.error('Error fetching user stats:', error);
    // Return default stats to prevent crashes
    return {
      totalUsers: 0,
      totalHosts: 0,
      totalAdmins: 0,
      completedProfiles: 0,
      activeThisMonth: 0,
    };
  }
};

const UsersManager: React.FC = () => {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);

  const { data: users, isLoading: usersLoading } = useQuery({
    queryKey: ['admin-users'],
    queryFn: fetchUsers,
  });

  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['admin-user-stats'],
    queryFn: fetchUserStats,
  });

  // Mutación para actualizar rol de usuario
  const updateUserRole = useMutation({
    mutationFn: async ({ userId, newRole }: { userId: string; newRole: string }) => {
      const { error } = await supabase
        .from('profiles')
        .update({ role: newRole, updated_at: new Date().toISOString() })
        .eq('id', userId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      queryClient.invalidateQueries({ queryKey: ['admin-user-stats'] });
      toast.success('Rol de usuario actualizado correctamente');
    },
    onError: (error) => {
      toast.error(`Error al actualizar rol: ${error.message}`);
    },
  });

  // Mutación para eliminar usuario
  const deleteUser = useMutation({
    mutationFn: async (userId: string) => {
      // Primero eliminar el perfil (esto eliminará automáticamente relacionados por CASCADE)
      const { error } = await supabase
        .from('profiles')
        .delete()
        .eq('id', userId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      queryClient.invalidateQueries({ queryKey: ['admin-user-stats'] });
      toast.success('Usuario eliminado correctamente');
      setIsDeleteDialogOpen(false);
      setSelectedUser(null);
    },
    onError: (error) => {
      toast.error(`Error al eliminar usuario: ${error.message}`);
    },
  });

  // Filtrar usuarios
  const filteredUsers = users?.filter(user => {
    const matchesSearch = !searchTerm || 
      user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.full_name?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesRole = roleFilter === 'all' || user.role === roleFilter;
    
    const matchesStatus = statusFilter === 'all' || 
      (statusFilter === 'completed' && user.profile_completed) ||
      (statusFilter === 'incomplete' && !user.profile_completed);

    return matchesSearch && matchesRole && matchesStatus;
  });

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'admin':
        return <Badge className="bg-red-100 text-red-800"><Shield className="h-3 w-3 mr-1" />Admin</Badge>;
      case 'host':
        return <Badge className="bg-blue-100 text-blue-800"><Home className="h-3 w-3 mr-1" />Host</Badge>;
      default:
        return <Badge variant="secondary"><Users className="h-3 w-3 mr-1" />Usuario</Badge>;
    }
  };

  const getStatusBadge = (completed: boolean) => {
    return completed 
      ? <Badge className="bg-green-100 text-green-800"><CheckCircle className="h-3 w-3 mr-1" />Completo</Badge>
      : <Badge className="bg-yellow-100 text-yellow-800"><AlertTriangle className="h-3 w-3 mr-1" />Incompleto</Badge>;
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Gestión de Usuarios</h1>
            <p className="text-muted-foreground">
              Administra usuarios, roles y permisos
            </p>
          </div>
          <Button 
            className="bg-blue-600 hover:bg-blue-700"
            onClick={() => setIsInviteModalOpen(true)}
          >
            <UserPlus className="h-4 w-4 mr-2" />
            Invitar Usuario
          </Button>
        </div>

        {/* Estadísticas */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Users className="h-8 w-8 text-blue-500" />
                <div>
                  <div className="text-2xl font-bold">{stats?.totalUsers || 0}</div>
                  <div className="text-sm text-muted-foreground">Total Usuarios</div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Home className="h-8 w-8 text-green-500" />
                <div>
                  <div className="text-2xl font-bold">{stats?.totalHosts || 0}</div>
                  <div className="text-sm text-muted-foreground">Hosts</div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Shield className="h-8 w-8 text-red-500" />
                <div>
                  <div className="text-2xl font-bold">{stats?.totalAdmins || 0}</div>
                  <div className="text-sm text-muted-foreground">Admins</div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-8 w-8 text-emerald-500" />
                <div>
                  <div className="text-2xl font-bold">{stats?.completedProfiles || 0}</div>
                  <div className="text-sm text-muted-foreground">Perfiles Completos</div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Calendar className="h-8 w-8 text-purple-500" />
                <div>
                  <div className="text-2xl font-bold">{stats?.activeThisMonth || 0}</div>
                  <div className="text-sm text-muted-foreground">Activos este mes</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filtros */}
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar por email o nombre..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>

              <Select value={roleFilter} onValueChange={setRoleFilter}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Rol" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los roles</SelectItem>
                  <SelectItem value="user">Usuario</SelectItem>
                  <SelectItem value="host">Host</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>

              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Estado" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="completed">Completos</SelectItem>
                  <SelectItem value="incomplete">Incompletos</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Tabla de usuarios */}
        <Card>
          <CardHeader>
            <CardTitle>Lista de Usuarios ({filteredUsers?.length || 0})</CardTitle>
            <CardDescription>
              Gestiona usuarios, roles y permisos de la plataforma
            </CardDescription>
          </CardHeader>
          <CardContent>
            {usersLoading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
                <p>Cargando usuarios...</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Usuario</TableHead>
                      <TableHead>Rol</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead>Actividad</TableHead>
                      <TableHead>Suscripción</TableHead>
                      <TableHead>Registro</TableHead>
                      <TableHead className="text-right">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredUsers?.map((user) => (
                      <TableRow key={user.id}>
                        <TableCell>
                          <div>
                            <button
                              onClick={() => {
                                setSelectedUser(user);
                                setIsDetailsModalOpen(true);
                              }}
                              className="font-medium hover:text-primary text-left"
                            >
                              {user.full_name || 'Sin nombre'}
                            </button>
                            <div className="text-sm text-muted-foreground flex items-center gap-1">
                              <Mail className="h-3 w-3" />
                              {user.email}
                            </div>
                            {user.phone && (
                              <div className="text-sm text-muted-foreground flex items-center gap-1">
                                <Phone className="h-3 w-3" />
                                {user.phone}
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>{getRoleBadge(user.role)}</TableCell>
                        <TableCell>{getStatusBadge(user.profile_completed)}</TableCell>
                        <TableCell>
                          <div className="text-sm">
                            <div>{user.listingsCount || 0} anuncios</div>
                            <div className="text-muted-foreground">{user.bookingsCount || 0} reservas</div>
                          </div>
                        </TableCell>
                        <TableCell>
                          {user.subscriptionPlan !== 'N/A' ? (
                            <Badge variant="outline">{user.subscriptionPlan}</Badge>
                          ) : (
                            <span className="text-muted-foreground text-sm">Sin suscripción</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="text-sm text-muted-foreground">
                            {new Date(user.updated_at).toLocaleDateString('es-ES')}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button variant="ghost" size="sm" onClick={() => setSelectedUser(user)}>
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DialogTrigger>
                            <DialogContent>
                              <DialogHeader>
                                <DialogTitle>Gestionar Usuario</DialogTitle>
                                <DialogDescription>
                                  {user.full_name} ({user.email})
                                </DialogDescription>
                              </DialogHeader>
                              <div className="space-y-4">
                                <div>
                                  <label className="text-sm font-medium">Cambiar Rol:</label>
                                  <Select 
                                    value={user.role} 
                                    onValueChange={(newRole) => updateUserRole.mutate({ userId: user.id, newRole })}
                                  >
                                    <SelectTrigger className="mt-1">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="user">Usuario</SelectItem>
                                      <SelectItem value="host">Host</SelectItem>
                                      <SelectItem value="admin">Admin</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>
                                
                                <div className="pt-4 border-t">
                                  <Button 
                                    variant="destructive" 
                                    size="sm"
                                    onClick={() => {
                                      setSelectedUser(user);
                                      setIsDeleteDialogOpen(true);
                                    }}
                                  >
                                    <Trash2 className="h-4 w-4 mr-2" />
                                    Eliminar Usuario
                                  </Button>
                                </div>
                              </div>
                            </DialogContent>
                          </Dialog>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Dialog de confirmación de eliminación */}
        <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>¿Eliminar Usuario?</AlertDialogTitle>
              <AlertDialogDescription>
                Esta acción eliminará permanentemente al usuario <strong>{selectedUser?.full_name}</strong> ({selectedUser?.email}) 
                y todos sus datos asociados (anuncios, reservas, etc.). Esta acción no se puede deshacer.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction 
                onClick={() => selectedUser && deleteUser.mutate(selectedUser.id)}
                className="bg-red-600 hover:bg-red-700"
              >
                Eliminar Usuario
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Modal de invitación */}
        <InviteUserModal 
          isOpen={isInviteModalOpen}
          onClose={() => setIsInviteModalOpen(false)}
          onSuccess={() => {
            queryClient.invalidateQueries({ queryKey: ['admin-users'] });
            queryClient.invalidateQueries({ queryKey: ['admin-user-stats'] });
          }}
        />

        {/* Modal de detalles de usuario */}
        <UserDetailsModal 
          isOpen={isDetailsModalOpen}
          onClose={() => {
            setIsDetailsModalOpen(false);
            setSelectedUser(null);
          }}
          user={selectedUser}
        />
      </div>
    </AdminLayout>
  );
};

export default UsersManager;