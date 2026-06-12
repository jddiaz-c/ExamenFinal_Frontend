// Labels legibles para valores del backend

export const LABELS_ESTADO_INCAPACIDAD = {
    registrada:   'Registrada',
    en_revision:  'En revisión',
    aprobada:     'Aprobada',
    rechazada:    'Rechazada',
    finalizada:   'Finalizada'
};

export const LABELS_TIPO_INCAPACIDAD = {
    enfermedad_general:  'Enfermedad general',
    accidente_laboral:   'Accidente laboral',
    licencia_medica:     'Licencia médica',
    incapacidad_temporal: 'Incapacidad temporal'
};

export const LABELS_ROL = {
    administrador:  'Administrador',
    gestion_humana: 'Gestión Humana',
    empleado:       'Empleado'
};

export const LABELS_ESTADO = {
    activo:   'Activo',
    inactivo: 'Inactivo'
};

// Genera el HTML de un badge de estado
export function badgeEstado(estado) {
    const label = LABELS_ESTADO_INCAPACIDAD[estado] || LABELS_ESTADO[estado] || estado;
    return `<span class="badge badge-${estado}">${label}</span>`;
}

// Genera el HTML de un badge de rol
export function badgeRol(rol) {
    const label = LABELS_ROL[rol] || rol;
    return `<span class="badge badge-${rol}">${label}</span>`;
}

// Iniciales de un nombre para avatares
export function iniciales(nombre) {
    if (!nombre) return '?';
    return nombre.trim().split(' ')
        .slice(0, 2)
        .map(p => p[0].toUpperCase())
        .join('');
}

// Color del dot de actividad según estado
export function colorEstado(estado) {
    const colores = {
        registrada:   'var(--color-neutral)',
        en_revision:  'var(--color-warning)',
        aprobada:     'var(--color-success)',
        rechazada:    'var(--color-danger)',
        finalizada:   'var(--color-purple-text)',
        activo:       'var(--color-success)',
        inactivo:     'var(--color-neutral)'
    };
    return colores[estado] || 'var(--color-neutral)';
}

// Ordena estados disponibles según la transición válida
export function estadosSiguientes(estadoActual) {
    const transiciones = {
        registrada:   ['en_revision', 'rechazada'],
        en_revision:  ['aprobada', 'rechazada'],
        aprobada:     [],   // solo se puede finalizar
        rechazada:    [],
        finalizada:   []
    };
    return transiciones[estadoActual] || [];
}
