// 1. LISTADO DE ADMINISTRADORES AUTORIZADOS
const admins = [
    { u: "DAMARIS MORALES", p: "V-19379614" },
    { u: "ERIKA RODRIGUEZ", p: "V-12421612" },
    { u: "IRIANA ROA", p: "V-30224501" },
    { u: "ROSA BERMUDEZ", p: "V-20978302" }
];

let baseDatosCasos = [];
let adminActual = null; 

// 2. LÓGICA DE INICIO DE SESIÓN
document.getElementById('login-form').onsubmit = function(e) {
    e.preventDefault();
    const user = document.getElementById('user').value;
    const pass = document.getElementById('pass').value;
    const auth = admins.find(a => a.u === user && a.p === pass);

    if (auth) {
        adminActual = auth;
        document.getElementById('login-screen').style.display = 'none';
        document.getElementById('dashboard').style.display = 'block';
        
        const btnLogout = document.getElementById('btn-logout');
        btnLogout.innerText = adminActual.u;
        
        btnLogout.onmouseenter = () => { btnLogout.innerText = "Cerrar Sesión"; };
        btnLogout.onmouseleave = () => { btnLogout.innerText = adminActual.u; };
        btnLogout.onclick = () => { location.reload(); };

        iniciarNube();
    } else {
        document.getElementById('error-msg').style.display = 'block';
    }
};

// 3. FUNCIÓN PARA LEER DATOS DE FIREBASE
function iniciarNube() {
    setTimeout(() => {
        if (window.dbOnValue && window.db) {
            window.dbOnValue(window.dbRef(window.db, 'casos'), (snapshot) => {
                const data = snapshot.val();
                baseDatosCasos = data ? Object.keys(data).map(key => ({...data[key], fId: key})) : [];
                filtrarCasos();
            });
        }
    }, 500);
}

// 4. LÓGICA DE REGISTRO DE CASOS
document.getElementById('registro-caso').onsubmit = function(e) {
    e.preventDefault();
    const fileInput = document.getElementById('file-input');
    
    const nuevoCaso = {
        id: Date.now(),
        fecha: new Date().toLocaleString(),
        nombre: document.getElementById('nombre').value,
        cedula: document.getElementById('cedula').value,
        tlf: document.getElementById('tlf').value,
        ambito: document.getElementById('ambito').value,
        estado: document.getElementById('estado').value,
        parroquia: document.getElementById('parroquia').value,
        sector: document.getElementById('sector').value,
        descripcion: document.getElementById('description').value,
        status: 'en revisión',
        archivo: null,
        nombreArchivo: null
    };

    const guardarEnNube = (caso) => {
        if (window.dbPush && window.db) {
            window.dbPush(window.dbRef(window.db, 'casos'), caso);
            document.getElementById('registro-caso').reset();
            document.getElementById('file-name-display').innerText = "";
            alert("¡Caso registrado exitosamente!");
        }
    };

    if (fileInput.files[0]) {
        const reader = new FileReader();
        reader.onload = (event) => {
            nuevoCaso.archivo = event.target.result;
            nuevoCaso.nombreArchivo = fileInput.files[0].name;
            guardarEnNube(nuevoCaso);
        };
        reader.readAsDataURL(fileInput.files[0]);
    } else {
        guardarEnNube(nuevoCaso);
    }
};

window.mostrarNombreArchivo = function(input) {
    const display = document.getElementById('file-name-display');
    if (input.files.length > 0) {
        display.innerText = "Archivo: " + input.files[0].name;
    } else {
        display.innerText = "";
    }
};

// 5. FILTRADO Y RENDERIZADO DE TARJETAS
function filtrarCasos() {
    const term = document.getElementById('buscador').value.toLowerCase();
    const listaArt = document.getElementById('lista-articulacion');
    const listaPart = document.getElementById('lista-participacion');
    
    listaArt.innerHTML = "";
    listaPart.innerHTML = "";

    baseDatosCasos.forEach(c => {
        if (c.nombre.toLowerCase().includes(term) || c.cedula.includes(term)) {
            const div = document.createElement('div');
            const statusClass = c.status.toLowerCase().replace(/\s/g, '').replace('ó', 'o');
            div.className = `card-caso status-${statusClass}`;
            
            div.innerHTML = `
                <strong>${c.nombre}</strong>
                <p>CI: ${c.cedula}</p>
                <p>Estatus: ${c.status}</p>
            `;
            
            div.onclick = () => verDetalle(c.fId);
            
            if (c.ambito === 'articulacion') {
                listaArt.appendChild(div);
            } else {
                listaPart.appendChild(div);
            }
        }
    });
}

// 6. MOSTRAR DETALLES, EDITAR Y ELIMINAR
function verDetalle(fId) {
    const c = baseDatosCasos.find(x => x.fId === fId);
    if (!c) return;

    document.getElementById('modal-detalle').style.display = 'flex';
    
    let adjuntoHtml = '';
    if (c.archivo) {
        if (c.archivo.startsWith('data:image')) {
            adjuntoHtml = `
                <div style="margin-top:15px;">
                    <strong>Evidencia Adjunta:</strong><br>
                    <img src="${c.archivo}" class="img-preview-detalle" style="width:100%; border-radius:10px; margin-top:10px; border:1px solid #ddd;">
                </div>`;
        } else {
            adjuntoHtml = `<p><strong>Archivo:</strong> <a href="${c.archivo}" download="${c.nombreArchivo}">Descargar Documento</a></p>`;
        }
    }

    document.getElementById('contenido-detalle').innerHTML = `
        <div style="display:flex; justify-content:space-between; align-items:center;">
            <h2 style="color:#28a745;">Detalle del Registro</h2>
            <small style="color:#666;">Registrado el: ${c.fecha || 'N/A'}</small> 
        </div>
        <hr style="margin:10px 0; opacity:0.2;">
        <p><strong>Nombre:</strong> ${c.nombre}</p>
        <p><strong>Cédula:</strong> ${c.cedula}</p>
        <p><strong>Teléfono:</strong> ${c.tlf}</p>
        <p><strong>Ubicación:</strong> ${c.estado}, ${c.parroquia}, ${c.sector}</p>
        <p><strong>Descripción:</strong> ${c.descripcion}</p>
        ${adjuntoHtml}
        
        <div style="margin-top:20px; padding-top:15px; border-top: 1px solid #eee;">
            <label><strong>Actualizar Estatus:</strong></label>
            <select onchange="actualizarEstatus('${fId}', this.value)" style="width:100%; padding:10px; margin-top:10px; border-radius:8px;">
                <option value="en revisión" ${c.status === 'en revisión' ? 'selected' : ''}>En Revisión</option>
                <option value="resuelto" ${c.status === 'resuelto' ? 'selected' : ''}>Resuelto</option>
                <option value="sin resolver" ${c.status === 'sin resolver' ? 'selected' : ''}>Sin Resolver</option>
            </select>
        </div>

        <div style="display:grid; grid-template-columns: 1fr 1fr; gap:10px; margin-top:20px;">
            <button onclick="prepararEdicion('${fId}')" class="btn-edit" style="background:#ffc107; color:black; border:none; padding:10px; border-radius:8px; cursor:pointer; font-weight:bold;">
                <i class="fas fa-edit"></i> Editar Datos
            </button>
            <button onclick="eliminarCaso('${fId}')" class="btn-delete" style="background:#dc3545; color:white; border:none; padding:10px; border-radius:8px; cursor:pointer; font-weight:bold;">
                <i class="fas fa-trash"></i> Eliminar Caso
            </button>
        </div>
    `;
}

window.actualizarEstatus = function(fId, nuevoStatus) {
    if (window.dbSet && window.db) {
        window.dbSet(window.dbRef(window.db, `casos/${fId}/status`), nuevoStatus);
        cerrarModal();
    }
};

window.eliminarCaso = function(fId) {
    if (confirm("¿Está seguro de que desea eliminar permanentemente este registro?")) {
        if (window.dbSet && window.db) {
            window.dbSet(window.dbRef(window.db, `casos/${fId}`), null);
            cerrarModal();
        }
    }
};

window.prepararEdicion = function(fId) {
    const c = baseDatosCasos.find(x => x.fId === fId);
    
    const nuevoNombre = prompt("Editar Nombre:", c.nombre);
    const nuevaDescripcion = prompt("Editar Descripción:", c.descripcion);
    const nuevaFecha = prompt("Editar Fecha (ejemplo: 21/4/2025, 10:00:00 a. m.):", c.fecha || "");
    
    if (nuevoNombre !== null && nuevaDescripcion !== null && nuevaFecha !== null) {
        if (window.dbSet && window.db) {
            window.dbSet(window.dbRef(window.db, `casos/${fId}/nombre`), nuevoNombre);
            window.dbSet(window.dbRef(window.db, `casos/${fId}/descripcion`), nuevaDescripcion);
            window.dbSet(window.dbRef(window.db, `casos/${fId}/fecha`), nuevaFecha);
            
            alert("Registro actualizado correctamente");
            cerrarModal();
        }
    }
};

// Asegúrate de que las funciones de cerrarGrafica y cerrarModal estén debajo si existen
function cerrarGrafica() { document.getElementById('modal-grafica').style.display = 'none'; }
function cerrarModal() { document.getElementById('modal-detalle').style.display = 'none'; }

// 7. REPORTES Y GRÁFICAS
window.descargarReporteGeneral = function() {
    const password = prompt("Seguridad OAC - Ingrese contraseña:");
    if (password === "OAC2024") {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();
        doc.text("Reporte General de Casos - OAC", 20, 20);
        let y = 30;
        baseDatosCasos.forEach((c, i) => {
            doc.text(`${i+1}. ${c.nombre} - CI: ${c.cedula} - Estatus: ${c.status}`, 20, y);
            y += 10;
        });
        doc.save("Reporte_OAC_Verde.pdf");
    }
};

let miGrafica;
window.abrirGrafica = function() {
    document.getElementById('modal-grafica').style.display = 'flex';
    const ctx = document.getElementById('graficaCasos').getContext('2d');
    const datos = new Array(12).fill(0);
    
    baseDatosCasos.forEach(c => {
        const mes = new Date(c.id).getMonth();
        datos[mes]++;
    });

    if (miGrafica) miGrafica.destroy();
    miGrafica = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'],
            datasets: [{ label: 'Casos Registrados', data: datos, backgroundColor: '#4CAF50' }]
        },
        options: { scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } } } }
    });
};

function cerrarGrafica() { document.getElementById('modal-grafica').style.display = 'none'; }
function cerrarModal() { document.getElementById('modal-detalle').style.display = 'none'; }