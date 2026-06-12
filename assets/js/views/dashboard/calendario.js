import { nombreMes } from '../../utils/fecha.js';
import { colorEstado } from '../../utils/format.js';

export function renderCalendario(container, incapacidades = [], empleados = []) {
    let año = new Date().getFullYear();
    let mes = new Date().getMonth();

    function build() {
        const hoy = new Date();
        const primerDia = new Date(año, mes, 1).getDay();
        const diasEnMes = new Date(año, mes + 1, 0).getDate();

        // Agrupar incapacidades por día del mes actual
        const porDia = {};
        incapacidades.forEach(inc => {
            const inicio = new Date(inc.fecha_inicio);
            const fin    = new Date(inc.fecha_fin);
            for (let d = new Date(inicio); d <= fin; d.setDate(d.getDate() + 1)) {
                if (d.getFullYear() === año && d.getMonth() === mes) {
                    const dia = d.getDate();
                    if (!porDia[dia]) porDia[dia] = [];
                    porDia[dia].push(inc);
                }
            }
        });

        const dias = ['Do', 'Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sa'];

        let celdas = '';

        // Celdas vacías antes del primer día
        for (let i = 0; i < primerDia; i++) {
            celdas += `<div class="calendar-day other-month"></div>`;
        }

        for (let d = 1; d <= diasEnMes; d++) {
            const esHoy = hoy.getDate() === d && hoy.getMonth() === mes && hoy.getFullYear() === año;
            const incs  = porDia[d] || [];
            const dots  = incs.slice(0, 3).map(i =>
                `<span class="calendar-dot dot-${i.estado}"></span>`
            ).join('');

            celdas += `
                <div class="calendar-day${esHoy ? ' today' : ''}">
                    <span class="day-number">${d}</span>
                    <div class="calendar-day-dots">${dots}</div>
                </div>
            `;
        }

        container.innerHTML = `
            <div class="calendar-wrapper">
                <div class="calendar-header">
                    <button class="calendar-nav-btn" id="cal-prev">&#8592;</button>
                    <span class="calendar-month-label">${nombreMes(mes, año)}</span>
                    <button class="calendar-nav-btn" id="cal-next">&#8594;</button>
                </div>
                <div class="calendar-grid">
                    ${dias.map(d => `<div class="calendar-day-header">${d}</div>`).join('')}
                    ${celdas}
                </div>
            </div>
        `;

        container.querySelector('#cal-prev').addEventListener('click', () => {
            mes--;
            if (mes < 0) { mes = 11; año--; }
            build();
        });

        container.querySelector('#cal-next').addEventListener('click', () => {
            mes++;
            if (mes > 11) { mes = 0; año++; }
            build();
        });
    }

    build();
}
