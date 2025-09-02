export interface UserResponse {
  id: string;
  isActive: boolean;
  metadata: Record<string, unknown> | null;
  createdAt: Date;
  updatedAt: Date;
  fullName: string;
  email: string;
  phone: string | null;
  avatarUrl: string | null;
}