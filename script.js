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
        fecha: new Date().toLocaleString(), // Fecha del sistema
        fechaCaso: document.getElementById('fecha-caso').value, // Fecha asignada al caso para la gráfica
        tipoSolicitante: document.getElementById('tipo-solicitante').value, // Nuevo campo
        nombre: document.getElementById('nombre').value,
        cedula: document.getElementById('cedula').value,
        tlf: document.getElementById('tlf').value,
        ambito: document.getElementById('ambito').value,
        estado: document.getElementById('estado').value,
        parroquia: document.getElementById('parroquia').value,
        sector: document.getElementById('sector').value,
        descripcion: document.getElementById('description').value,
        status: 'en revisión',
        archivos: [] // Ahora es un arreglo para múltiples archivos
    };

    const guardarEnNube = (caso) => {
        if (window.dbPush && window.db) {
            window.dbPush(window.dbRef(window.db, 'casos'), caso);
            document.getElementById('registro-caso').reset();
            document.getElementById('file-name-display').innerText = "";
            alert("¡Caso registrado exitosamente!");
        }
    };

    // Procesar múltiples archivos
    if (fileInput.files.length > 0) {
        const promesasDeArchivos = Array.from(fileInput.files).map(file => {
            return new Promise((resolve) => {
                const reader = new FileReader();
                reader.onload = (event) => {
                    resolve({
                        data: event.target.result,
                        nombre: file.name
                    });
                };
                reader.readAsDataURL(file);
            });
        });

        // Esperar a que se lea todos los archivos antes de guardar
        Promise.all(promesasDeArchivos).then(archivosLeidos => {
            nuevoCaso.archivos = archivosLeidos;
            guardarEnNube(nuevoCaso);
        });
    } else {
        guardarEnNube(nuevoCaso);
    }
};

// Muestra la cantidad de archivos seleccionados
window.mostrarNombreArchivo = function(input) {
    const display = document.getElementById('file-name-display');
    if (input.files.length > 0) {
        if (input.files.length === 1) {
            display.innerText = "Archivo: " + input.files[0].name;
        } else {
            display.innerText = input.files.length + " archivos seleccionados";
        }
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
    
    // Unificar archivos viejos (archivo único) y nuevos (arreglo) para no perder compatibilidad
    let listaDocumentos = c.archivos ? [...c.archivos] : [];
    if (c.archivo && !c.archivos) {
        listaDocumentos.push({ data: c.archivo, nombre: c.nombreArchivo });
    }

    if (listaDocumentos.length > 0) {
        adjuntoHtml = `
            <div style="margin-top:15px;">
                <strong>Evidencia Adjunta:</strong>
                <div style="display: flex; gap: 10px; flex-wrap: wrap; margin-top:10px;">
        `;
        listaDocumentos.forEach(doc => {
            if (doc.data.startsWith('data:image')) {
                // SOLUCIÓN: Cambiado window.open por la función personalizada del visor interno
                adjuntoHtml += `<img src="${doc.data}" style="width: 120px; height: 120px; object-fit: cover; border-radius: 10px; border: 1px solid #ddd; cursor: pointer;" onclick="mostrarVisorImagen('${doc.data}')" title="${doc.nombre}">`;
            } else {
                adjuntoHtml += `<p><a href="${doc.data}" download="${doc.nombre}" style="display:inline-block; padding: 5px 10px; background: #6f42c1; color: white; border-radius: 5px; text-decoration: none; font-size: 14px;">Descargar ${doc.nombre}</a></p>`;
            }
        });
        adjuntoHtml += `</div></div>`;
    }

    // Usar la fecha del caso si existe, sino la de registro
    const fechaAmostrar = c.fechaCaso ? c.fechaCaso : (c.fecha || 'N/A');

    // Inyectamos la estructura dividida en dos contenedores controlados
    document.getElementById('contenido-detalle').innerHTML = `
        <div id="detalle-textos">
            <div style="display:flex; justify-content:space-between; align-items:center;">
                <h2 style="color:#28a745;">Detalle del Registro</h2>
                <small style="color:#666;">Fecha del Caso: ${fechaAmostrar}</small> 
            </div>
            <hr style="margin:10px 0; opacity:0.2;">
            <p><strong>Tipo de Solicitante:</strong> <span style="background: #eef; padding: 2px 8px; border-radius: 12px; font-size: 14px;">${c.tipoSolicitante || 'No definido'}</span></p>
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
        </div>
        
        <div id="visor-imagen-container" style="display:none; text-align:center; position:relative;">
            <button onclick="cerrarVisorImagen()" style="position:absolute; top:-10px; left:0; background:#dc3545; color:white; border:none; padding:6px 14px; border-radius:5px; cursor:pointer; font-weight:bold; font-size:14px; z-index:10;">
                <i class="fas fa-arrow-left"></i> Volver al Detalle
            </button>
            <div style="margin-top:35px; width:100%; overflow:hidden;">
                <img id="imagen-ampliada" src="" style="max-width:100%; max-height:55vh; object-fit:contain; border-radius:8px; box-shadow:0 4px 12px rgba(0,0,0,0.2);">
            </div>
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
    const nuevaFecha = prompt("Editar Fecha (Formato AAAA-MM-DD):", c.fechaCaso || "");
    
    if (nuevoNombre !== null && nuevaDescripcion !== null && nuevaFecha !== null) {
        if (window.dbSet && window.db) {
            window.dbSet(window.dbRef(window.db, `casos/${fId}/nombre`), nuevoNombre);
            window.dbSet(window.dbRef(window.db, `casos/${fId}/descripcion`), nuevaDescripcion);
            window.dbSet(window.dbRef(window.db, `casos/${fId}/fechaCaso`), nuevaFecha);
            
            alert("Registro actualizado correctamente");
            cerrarModal();
        }
    }
};

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
        let mesIndex;
        if (c.fechaCaso) {
            const partes = c.fechaCaso.split('-');
            if (partes.length >= 2) {
                mesIndex = parseInt(partes[1], 10) - 1;
            }
        } else {
            mesIndex = new Date(c.id).getMonth();
        }

        if (mesIndex >= 0 && mesIndex <= 11) {
            datos[mesIndex]++;
        }
    });

    if (miGrafica) miGrafica.destroy();
    miGrafica = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'],
            datasets: [{ label: 'Casos Registrados por mes correspondiente', data: datos, backgroundColor: '#4CAF50' }]
        },
        options: { scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } } } }
    });
};

function cerrarGrafica() { document.getElementById('modal-grafica').style.display = 'none'; }

// FUNCIONES ESPECIALES PARA EL CONTROL DE VISTAS EN EL VISOR INTERNO
window.mostrarVisorImagen = function(src) {
    document.getElementById('detalle-textos').style.display = 'none';
    const visorContainer = document.getElementById('visor-imagen-container');
    const imgAmpliada = document.getElementById('imagen-ampliada');
    
    imgAmpliada.src = src;
    visorContainer.style.display = 'block';
};

window.cerrarVisorImagen = function() {
    document.getElementById('visor-imagen-container').style.display = 'none';
    document.getElementById('detalle-textos').style.display = 'block';
};

function cerrarModal() { 
    document.getElementById('modal-detalle').style.display = 'none'; 
    // Limpieza de estado: asegura que la ventana vuelva a mostrar textos al abrir un caso nuevo
    const textos = document.getElementById('detalle-textos');
    const visor = document.getElementById('visor-imagen-container');
    if (textos && visor) {
        textos.style.display = 'block';
        visor.style.display = 'none';
    }
}