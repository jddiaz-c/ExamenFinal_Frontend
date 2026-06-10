const authApi = {
    login: (body) => request(API.auth, '/login', 'POST', body),
    logout: () => request(API.auth, '/logout', 'POST')
};