const usuariosApi = {
    getAll: () => request(API.usuarios, ''),
    getOne: (id) => request(API.usuarios, `/${id}`),
    create: (body) => request(API.usuarios, '', 'POST', body),
    update: (id, body) => request(API.usuarios, `/${id}`, 'PUT', body),
    cambiarEstado: (id, body) => request(API.usuarios, `/${id}/estado`, 'PATCH', body)
};
