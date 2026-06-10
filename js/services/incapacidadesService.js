const incapacidadesApi = {
    getAll: () => request(API.incapacidades, ''),
    getOne: (id) => request(API.incapacidades, `/${id}`),
    buscar: (params) => request(API.incapacidades, `/buscar?${new URLSearchParams(params)}`),
    create: (body) => request(API.incapacidades, '', 'POST', body),
    update: (id, body) => request(API.incapacidades, `/${id}`, 'PUT', body),
    cambiarEstado: (id, body) => request(API.incapacidades, `/${id}/estado`, 'PATCH', body),
    finalizar: (id) => request(API.incapacidades, `/${id}/finalizar`, 'PATCH')
};