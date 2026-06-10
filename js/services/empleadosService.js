const empleadosApi = {
    getAll: () => request(API.empleados, ''),
    getOne: (id) => request(API.empleados, `/${id}`),
    buscar: (params) => request(API.empleados, `/buscar?${new URLSearchParams(params)}`),
    create: (body) => request(API.empleados, '', 'POST', body),
    update: (id, body) => request(API.empleados, `/${id}`, 'PUT', body),
    cambiarEstado: (id, body) => request(API.empleados, `/${id}/estado`, 'PATCH', body)
};
