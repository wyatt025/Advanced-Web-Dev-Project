export async function login(username, password) {
    const response = await fetch('/api/auth/login', {
        method: 'POST',
        credentials: 'same-origin',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password }),
    });

    if (response.status === 401) {
        throw new Error('Invalid username or password.');
    }
    if (!response.ok) {
        throw new Error('Login is unavailable. Please try again.');
    }
    return response.json();
}
export async function logout() {
    const response = await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'same-origin',
    });

    if (!response.ok) {
        throw new Error('Logout failed. Please try again.');
    }
}
export async function getCurrentSession(signal) {
    const response = await fetch('/api/auth/me',{
        cache: 'no-store',
        credentials: 'same-origin',
        signal,
    });
    if (response.status === 401) {
        return null; // No active session
    }
    if (!response.ok) {
        throw new Error('Could not check the login session.');
    }
    const data = await response.json();
if (!['admin', 'employee', 'user'].includes(data.role)) {
    throw new Error('The server returned an invalid session response.');
}
return data;
}