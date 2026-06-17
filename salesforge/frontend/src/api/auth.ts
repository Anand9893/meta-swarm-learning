import { useMutation } from '@tanstack/react-query'
import client from './client'
import type {
  LoginRequest,
  RegisterRequest,
  TokenResponse,
  User,
  ForgotPasswordRequest,
  ResetPasswordRequest,
} from '../types/auth'

export function useLogin() {
  return useMutation({
    mutationFn: (data: LoginRequest) =>
      client.post<TokenResponse>('/api/v1/auth/login', data).then((r) => r.data),
    onSuccess: (data) => {
      localStorage.setItem('sf_access_token', data.access_token)
      localStorage.setItem('sf_refresh_token', data.refresh_token)
    },
  })
}

export function useRegister() {
  return useMutation({
    mutationFn: (data: RegisterRequest) =>
      client.post<User>('/api/v1/auth/register', data).then((r) => r.data),
    onSuccess: (data) => {
      localStorage.setItem('sf_user', JSON.stringify(data))
    },
  })
}

export function useLogout() {
  return useMutation({
    mutationFn: () => {
      const refreshToken = localStorage.getItem('sf_refresh_token')
      return client
        .post('/api/v1/auth/logout', { refresh_token: refreshToken })
        .then((r) => r.data)
    },
    onSettled: () => {
      localStorage.removeItem('sf_access_token')
      localStorage.removeItem('sf_refresh_token')
      localStorage.removeItem('sf_user')
    },
  })
}

export function useForgotPassword() {
  return useMutation({
    mutationFn: (data: ForgotPasswordRequest) =>
      client.post('/api/v1/auth/forgot-password', data).then((r) => r.data),
  })
}

export function useResetPassword() {
  return useMutation({
    mutationFn: (data: ResetPasswordRequest) =>
      client.post('/api/v1/auth/reset-password', data).then((r) => r.data),
  })
}
