import { create } from 'zustand';
import {
    UserDisplayData,
    UserListResponse,
    UserFilterParams,
    UserCreateInput,
    UserUpdateInput,
} from '@/entities/user/model/types';

interface UserStore {
    // State
    users: UserDisplayData[];
    currentUser: UserDisplayData | null;
    loading: boolean;
    error: string | null;
    totalCount: number;
    currentPage: number;
    pageSize: number;
    filters: UserFilterParams;

    // Actions
    setUsers: (users: UserDisplayData[]) => void;
    setCurrentUser: (user: UserDisplayData | null) => void;
    setLoading: (loading: boolean) => void;
    setError: (error: string | null) => void;
    setFilters: (filters: UserFilterParams) => void;
    clearFilters: () => void;

    // API Actions
    fetchUsers: (slug: string, params?: UserFilterParams) => Promise<void>;
    fetchUserById: (slug: string, id: string) => Promise<void>;
    createUser: (slug: string, userData: UserCreateInput) => Promise<void>;
    updateUser: (slug: string, id: string, userData: UserUpdateInput) => Promise<void>;
    uploadUsersExcel: (slug: string, file: File) => Promise<{ inserted: number }>;
    deleteUser: (slug: string, id: string) => Promise<void>;
}

const useUserStore = create<UserStore>((set, get) => ({
    // Initial State
    users: [],
    currentUser: null,
    loading: false,
    error: null,
    totalCount: 0,
    currentPage: 1,
    pageSize: 20,
    filters: {},

    // Setters
    setUsers: (users) => set({ users }),
    setCurrentUser: (user) => set({ currentUser: user }),
    setLoading: (loading) => set({ loading }),
    setError: (error) => set({ error }),
    setFilters: (filters) => set({ filters }),
    clearFilters: () => set({ filters: {} }),

    // API Actions
    fetchUsers: async (slug: string, params = {}) => {
        const { filters, currentPage, pageSize } = get();
        const mergedParams = { ...filters, ...params, page: currentPage, page_size: pageSize };

        set({ loading: true, error: null });

        try {
            const queryParams = new URLSearchParams();
            Object.entries(mergedParams).forEach(([key, value]) => {
                if (value !== undefined && value !== null && value !== '') {
                    queryParams.append(key, String(value));
                }
            });

            const response = await fetch(`/api/tenant/${slug}/users?${queryParams}`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                },
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const result = await response.json();

            if (result.success) {
                const data: UserListResponse = result.data;
                set({
                    users: data.items,
                    totalCount: data.total,
                    currentPage: data.page,
                    pageSize: data.page_size,
                });
            } else {
                throw new Error(result.message || 'Failed to fetch users');
            }
        } catch (error) {
            set({ error: error instanceof Error ? error.message : 'Unknown error occurred' });
        } finally {
            set({ loading: false });
        }
    },

    fetchUserById: async (slug: string, id: string) => {
        set({ loading: true, error: null });

        try {
            const response = await fetch(`/api/tenant/${slug}/users/${id}`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                },
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const result = await response.json();

            if (result.success) {
                set({ currentUser: result.data });
            } else {
                throw new Error(result.message || 'Failed to fetch user');
            }
        } catch (error) {
            set({ error: error instanceof Error ? error.message : 'Unknown error occurred' });
        } finally {
            set({ loading: false });
        }
    },

    createUser: async (slug: string, userData: UserCreateInput) => {
        set({ loading: true, error: null });

        try {
            const response = await fetch(`/api/tenant/${slug}/users`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(userData),
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const result = await response.json();

            if (result.success) {
                // 사용자 목록 새로고침
                await get().fetchUsers(slug);
            } else {
                throw new Error(result.message || 'Failed to create user');
            }
        } catch (error) {
            set({ error: error instanceof Error ? error.message : 'Unknown error occurred' });
            throw error;
        } finally {
            set({ loading: false });
        }
    },

    updateUser: async (slug: string, id: string, userData: UserUpdateInput) => {
        set({ loading: true, error: null });

        try {
            const response = await fetch(`/api/tenant/${slug}/users/${id}`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(userData),
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const result = await response.json();

            if (result.success) {
                // 사용자 목록 새로고침
                await get().fetchUsers(slug);

                // 현재 사용자도 업데이트
                const { currentUser } = get();
                if (currentUser && currentUser.id === id) {
                    set({ currentUser: { ...currentUser, ...userData } });
                }
            } else {
                throw new Error(result.message || 'Failed to update user');
            }
        } catch (error) {
            set({ error: error instanceof Error ? error.message : 'Unknown error occurred' });
            throw error;
        } finally {
            set({ loading: false });
        }
    },

    uploadUsersExcel: async (slug: string, file: File) => {
        set({ loading: true, error: null });

        try {
            const formData = new FormData();
            formData.append('file', file);

            const response = await fetch(`/api/tenant/${slug}/users/bulk-upload`, {
                method: 'POST',
                body: formData,
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const result = await response.json();

            if (result.success) {
                // 업로드 후 사용자 목록 새로고침
                await get().fetchUsers(slug);
                return { inserted: result.data.inserted };
            } else {
                throw new Error(result.message || 'Failed to upload users');
            }
        } catch (error) {
            set({ error: error instanceof Error ? error.message : 'Unknown error occurred' });
            throw error;
        } finally {
            set({ loading: false });
        }
    },

    deleteUser: async (slug: string, id: string) => {
        set({ loading: true, error: null });

        try {
            const response = await fetch(`/api/tenant/${slug}/users/${id}`, {
                method: 'DELETE',
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const result = await response.json();

            if (result.success) {
                // 사용자 목록 새로고침
                await get().fetchUsers(slug);
            } else {
                throw new Error(result.message || 'Failed to delete user');
            }
        } catch (error) {
            set({ error: error instanceof Error ? error.message : 'Unknown error occurred' });
            throw error;
        } finally {
            set({ loading: false });
        }
    },
}));

export default useUserStore;
