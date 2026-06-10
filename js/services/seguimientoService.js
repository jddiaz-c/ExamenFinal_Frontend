const seguimientoApi = {
    getAll: () => request(API.seguimiento, ''),
    getOne: (id) => request(API.seguimiento, `/${id}`),
    buscar: (params) => request(API.seguimiento, `/buscar?${new URLSearchParams(params)}`),
    create: (body) => request(API.seguimiento, '', 'POST', body)
};