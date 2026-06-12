// Formatea una fecha ISO a formato legible (ej: 15 de enero de 2025)
export function formatFecha(fechaStr) {
    if (!fechaStr) return '—';
    const [year, month, day] = fechaStr.split('T')[0].split('-');
    const meses = [
        'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
        'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'
    ];
    return `${parseInt(day)} de ${meses[parseInt(month) - 1]} de ${year}`;
}

// Formatea fecha corta: 15 ene 2025
export function formatFechaCorta(fechaStr) {
    if (!fechaStr) return '—';
    const [year, month, day] = fechaStr.split('T')[0].split('-');
    const meses = ['ene', 'feb', 'mar', 'abr', 'may', 'jun',
                   'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
    return `${parseInt(day)} ${meses[parseInt(month) - 1]} ${year}`;
}

// Retorna cuántos días han pasado desde una fecha
export function diasDesde(fechaStr) {
    if (!fechaStr) return null;
    const fecha = new Date(fechaStr.split('T')[0]);
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    const diff = Math.floor((hoy - fecha) / (1000 * 60 * 60 * 24));
    return diff;
}

// Retorna texto relativo: "hace 2 días", "hoy", "ayer"
export function tiempoRelativo(fechaStr) {
    const dias = diasDesde(fechaStr);
    if (dias === null) return '';
    if (dias === 0) return 'hoy';
    if (dias === 1) return 'ayer';
    if (dias < 7) return `hace ${dias} días`;
    if (dias < 30) return `hace ${Math.floor(dias / 7)} sem.`;
    if (dias < 365) return `hace ${Math.floor(dias / 30)} meses`;
    return `hace ${Math.floor(dias / 365)} año(s)`;
}

// Fecha de hoy en formato YYYY-MM-DD para inputs
export function hoyISO() {
    return new Date().toISOString().split('T')[0];
}

// Calcula días entre dos fechas ISO
export function calcularDias(inicio, fin) {
    if (!inicio || !fin) return 0;
    const a = new Date(inicio);
    const b = new Date(fin);
    return Math.floor((b - a) / (1000 * 60 * 60 * 24)) + 1;
}

// Nombre del mes capitalizado
export function nombreMes(mes, año) {
    const meses = [
        'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
        'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
    ];
    return `${meses[mes]} ${año}`;
}
