export interface ApiResponse<T = any> {
  success: boolean;
  statusCode: number;
  message: string;
  data?: T;
  timestamp?: string;
}

export interface ErrorResponse {
  success: false;
  statusCode: number;
  timestamp: string;
  path: string;
  method: string;
  error: string;
  message: string[];
  validationErrors?: any[];
}

export interface AuthResponse {
  user: {
    id: number;
    email: string;
    name: string;
    role: string;
    isEmailVerified: boolean;
  };
  accessToken?: string;
}
