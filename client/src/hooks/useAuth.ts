import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

export interface User {
  id: number;
  username: string;
  email: string;
  displayName: string;
  bio: string;
  profileImageUrl: string;
  isStreaming: boolean;
  followerCount: number;
  createdAt: string;
  isVerified: boolean;
  verificationToken: string | null;
  verificationTokenExpiry: string | null;
}

interface LoginCredentials {
  username: string;
  password: string;
}

interface RegisterCredentials {
  username: string;
  email: string;
  password: string;
  displayName?: string;
}

interface AuthResponse {
  message: string;
}

export function useAuth() {
  const queryClient = useQueryClient();

  // Query to get current user
  const { data: user, isLoading, error, refetch } = useQuery<User | null>({
    queryKey: ['/api/user'],
    queryFn: async () => {
      console.log('Using relative API URL: /api/user');
      console.log('Query fetch to /api/user');
      
      // Log cookies to help debug auth issues
      console.log('Current cookies:', document.cookie);
      
      try {
        const response = await fetch('/api/user', {
          credentials: 'include',
          headers: {
            'Accept': 'application/json',
            'Cache-Control': 'no-cache'
          }
        });
        
        console.log(`Query fetch to /api/user, status: ${response.status}, ok: ${response.ok}`);
        console.log('Response headers:', response.headers);
        
        if (!response.ok) {
          if (response.status === 401) {
            // Not authenticated
            return null;
          }
          throw new Error('Failed to fetch user');
        }

        const data = await response.json();
        console.log('Query data from /api/user:', data);
        return data as User;
      } catch (error) {
        console.error('Error fetching current user:', error);
        return null;
      }
    },
    refetchOnWindowFocus: false
  });

  // Login mutation
  const loginMutation = useMutation({
    mutationFn: async (credentials: LoginCredentials) => {
      const response = await fetch('/api/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(credentials),
        credentials: 'include',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Login failed');
      }

      return await response.json() as User;
    },
    onSuccess: (data) => {
      // Invalidate and refetch user data
      queryClient.setQueryData(['/api/user'], data);
      queryClient.invalidateQueries({ queryKey: ['/api/user'] });
    },
  });

  // Register mutation
  const registerMutation = useMutation({
    mutationFn: async (credentials: RegisterCredentials) => {
      const response = await fetch('/api/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(credentials),
        credentials: 'include',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Registration failed');
      }

      return await response.json() as User;
    },
    onSuccess: (data) => {
      // Invalidate and refetch user data
      queryClient.setQueryData(['/api/user'], data);
      queryClient.invalidateQueries({ queryKey: ['/api/user'] });
    },
  });

  // Logout mutation
  const logoutMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/logout', {
        method: 'POST',
        credentials: 'include',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Logout failed');
      }

      return await response.json() as AuthResponse;
    },
    onSuccess: () => {
      // Clear user data from cache and refetch
      queryClient.setQueryData(['/api/user'], null);
      queryClient.invalidateQueries({ queryKey: ['/api/user'] });
    },
  });

  return {
    user,
    isAuthenticated: !!user,
    isLoading,
    error,
    login: loginMutation.mutate,
    loginAsync: loginMutation.mutateAsync,
    isLoginLoading: loginMutation.isPending,
    loginError: loginMutation.error,
    register: registerMutation.mutate,
    registerAsync: registerMutation.mutateAsync,
    isRegisterLoading: registerMutation.isPending,
    registerError: registerMutation.error,
    logout: logoutMutation.mutate,
    logoutAsync: logoutMutation.mutateAsync,
    isLogoutLoading: logoutMutation.isPending,
    logoutError: logoutMutation.error,
    refetchUser: refetch
  };
}