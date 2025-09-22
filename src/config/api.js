const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001'

export const endpoints = {
  appleWallet: `${API_BASE_URL}/api/wallet/apple/generate`,
  googleWallet: `${API_BASE_URL}/api/wallet/google/generate`,
  health: `${API_BASE_URL}/health`
}

export default {
  baseURL: API_BASE_URL,
  endpoints
}