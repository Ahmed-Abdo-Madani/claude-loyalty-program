/**
 * Admin API utilities for authenticated requests
 * Handles secure admin authentication headers
 */

export const getAdminAuthHeaders = () => {
    const token = localStorage.getItem('adminAccessToken')
    const sessionToken = localStorage.getItem('adminSessionToken')
    return {
        'Authorization': `Bearer ${token}`,
        'X-Session-Token': sessionToken,
        'Content-Type': 'application/json'
    }
}

export const adminApiRequest = async (url, options = {}) => {
    const headers = {
        ...getAdminAuthHeaders(),
        ...(options.headers || {})
    }

    const response = await fetch(url, {
        ...options,
        headers
    })

    if (response.status === 401) {
        // Redirect to admin login on auth failure
        localStorage.removeItem('adminAuthenticated')
        localStorage.removeItem('adminAccessToken')
        localStorage.removeItem('adminSessionToken')
        localStorage.removeItem('adminInfo')
        window.location.href = '/admin/login'
        throw new Error('Admin authentication failed')
    }

    return response
}

export const adminApi = {
    get: (url) => adminApiRequest(url, { method: 'GET' }),
    post: (url, data) => adminApiRequest(url, { method: 'POST', body: JSON.stringify(data) }),
    put: (url, data) => adminApiRequest(url, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (url) => adminApiRequest(url, { method: 'DELETE' })
}

export default adminApi;
