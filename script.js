// =================================================================
// LÓGICA DE NAVEGACIÓN Y VARIABLES GLOBALES
// =================================================================

let currentStep = 1;
const totalSteps = 4;
const BID_AMOUNTS = [50, 100, 150, 200, 300, 400]; // Vector de precios
let initialBid = 0;
let finalBid = 0;

// Variables para guardar las respuestas
let payload = {
    monto1: 0,
    respuesta1: '',
    monto2: 0,
    respuesta2: '',
    razon: '',
    certeza: '',
    conoce: '',
    gravedad: '',
    visita: '',
    ambientalista: '',
    genero: '',
    edad: '',
    educacion: '',
    ingreso: ''
};

// =================================================================
// FUNCIONES DE NAVEGACIÓN
// =================================================================

function updateProgress() {
    const progress = (currentStep - 1) / totalSteps;
    document.getElementById('progressBar').style.width = (progress * 100) + '%';
}

function nextStep(step) {
    // Validar paso actual antes de avanzar
    if (step > currentStep) {
        if (!validarPaso(currentStep)) return;
    }

    const currentSection = document.getElementById(`step${currentStep}`);
    const nextSection = document.getElementById(`step${step}`);

    if (currentSection) currentSection.classList.remove('active');
    if (nextSection) nextSection.classList.add('active');

    currentStep = step;
    updateProgress();
    window.scrollTo(0, 0);
}

function prevStep(step) {
    nextStep(step);
}

function showSuccess() {
    nextStep(5);
    // Ocultar la barra de progreso
    document.querySelector('.progress-bar-container').style.display = 'none';
}

function validarPaso(step) {
    if (step === 1) {
        const conoce = document.getElementById('conoce').value;
        const gravedad = document.getElementById('gravedad').value;
        if (!conoce || !gravedad) {
            alert("Por favor responda todas las preguntas para continuar.");
            return false;
        }
    }
    return true;
}

// =================================================================
// LÓGICA DE VALORACIÓN CONTINGENTE (STEP 3)
// =================================================================

function iniciarBidding() {
    // 1. Selecciona un monto de puja inicial aleatorio
    const randomIndex = Math.floor(Math.random() * BID_AMOUNTS.length);
    initialBid = BID_AMOUNTS[randomIndex];

    // 2. Muestra el monto inicial
    document.getElementById('lblMonto1').innerText = initialBid;

    // 3. Guarda el monto inicial en el payload
    payload.monto1 = initialBid;

    // 4. Inicia el paso 3
    nextStep(3);
}

function procesarRespuesta1(respuesta) {
    payload.respuesta1 = respuesta;

    // Lógica Doble Límite
    if (respuesta === 'SI') {
        // Si acepta, probamos un monto más alto (el doble)
        finalBid = initialBid * 2;
        document.getElementById('textoPregunta2').innerText = "Vemos que valora el proyecto. ¿Si el costo fuera mayor, estaría dispuesto a pagar:";
    } else {
        // Si rechaza, probamos un monto más bajo (la mitad)
        finalBid = Math.floor(initialBid / 2);
        if (finalBid < 1) finalBid = 1; // Mínimo 1 Bs
        document.getElementById('textoPregunta2').innerText = "Entendemos. ¿Y si el costo fuera menor, estaría dispuesto a pagar:";
    }

    payload.monto2 = finalBid;
    document.getElementById('lblMonto2').innerText = finalBid;

    // Transición interna en el paso 3
    document.getElementById('pregunta1').classList.remove('active');
    document.getElementById('pregunta2').classList.add('active');
}

function procesarRespuesta2(respuesta) {
    payload.respuesta2 = respuesta;

    // Configurar preguntas de seguimiento en el paso 4
    const divRazon = document.getElementById('divRazon');
    const divCerteza = document.getElementById('divCerteza');

    // Si dijo NO a todo (NO -> NO), preguntamos razón
    if (payload.respuesta1 === 'NO' && payload.respuesta2 === 'NO') {
        divRazon.classList.remove('hidden');
        divCerteza.classList.add('hidden');
        document.getElementById('razon').setAttribute('required', 'required');
        document.getElementById('certeza').removeAttribute('required');
    } else {
        // Si dijo SI al menos una vez, preguntamos certeza
        divRazon.classList.add('hidden');
        divCerteza.classList.remove('hidden');
        document.getElementById('certeza').setAttribute('required', 'required');
        document.getElementById('razon').removeAttribute('required');
    }

    nextStep(4);
}

// =================================================================
// FUNCIÓN DE ENVÍO DE DATOS (INTEGRACIÓN REAL CON GOOGLE APPS SCRIPT)
// =================================================================

function enviarDatos() {
    // 1. LIMPIEZA DE DATOS (Fix para evitar "MuySeguro" cuando es NO)
    // Si rechazó ambas veces (NO -> NO), Certeza no aplica
    if (payload.respuesta1 === 'NO' && payload.respuesta2 === 'NO') {
        payload.razon = document.getElementById('razon').value;
        payload.certeza = 'N/A';
    } else {
        // Si aceptó al menos una vez, Razón no aplica
        payload.razon = 'N/A';
        payload.certeza = document.getElementById('certeza').value;
    }

    // 2. Recolección del resto de datos
    payload.conoce = document.getElementById('conoce').value;
    payload.gravedad = document.getElementById('gravedad').value;
    payload.visita = document.getElementById('visita').value;
    payload.ambientalista = document.getElementById('ambientalista').value;
    payload.genero = document.getElementById('genero').value;
    payload.edad = document.getElementById('edad').value;
    payload.educacion = document.getElementById('educacion').value;
    payload.ingreso = document.getElementById('ingreso').value;

    // 3. Validación simple
    let requiredFields = document.querySelectorAll('#step1 select, #step4 select[required], #step4 input[required]');
    let isValid = true;
    requiredFields.forEach(field => {
        if (!field.value) {
            isValid = false;
        }
    });

    if (!isValid) {
        document.getElementById('msgError').classList.remove('hidden');
        return;
    }
    document.getElementById('msgError').classList.add('hidden');

    // 4. ENVÍO A GOOGLE APPS SCRIPT
    // Tu URL real:
    const WEB_APP_URL = 'https://script.google.com/macros/s/AKfycbzsDMtjdfHFN0Do5XlzdGopa9_Z4X20rNVheC0e2lOFMFdMN97Cuh-iBKnJHhPNxHm15w/exec';

    // Deshabilita el botón
    const btn = document.getElementById('btnEnviar');
    btn.textContent = 'Enviando...';
    btn.disabled = true;

    // Lógica robusta con no-cors
    fetch(WEB_APP_URL, {
        method: 'POST',
        mode: 'no-cors', // CLAVE PARA EVITAR ERRORES DE RED
        headers: {
            'Content-Type': 'text/plain;charset=utf-8',
        },
        body: JSON.stringify(payload)
    })
        .then(() => {
            // Con no-cors, si llegamos aquí es que se envió (aunque no podamos leer la respuesta)
            console.log("Envío exitoso (modo no-cors)");
            showSuccess();
        })
        .catch(error => {
            console.error('Error de conexión:', error);
            alert("Hubo un problema de conexión. Por favor intente nuevamente.");
            btn.textContent = 'Enviar Respuestas';
            btn.disabled = false;
        });
}

// Inicialización
document.addEventListener('DOMContentLoaded', updateProgress);