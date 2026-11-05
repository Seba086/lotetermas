// Datos editables del sitio.
export const CONFIG = {
  // Número de WhatsApp en formato internacional, solo dígitos (ej.: '5492283123456').
  // Vacío: el botón flotante lleva al formulario de contacto.
  whatsappNumber: '5492281585125',
  whatsappMessage: 'Quiero saber más información sobre el Desarrollo del Lote Termas de Tapalqué',

  // Endpoint de FormSubmit. El primer envío dispara un correo de activación a esta casilla.
  formEndpoint: 'https://formsubmit.co/ajax/nfseba@gmail.com',
};

// Coordenadas [lat, lng]. El lote es PROVISORIO: reemplazar por las coordenadas reales.
export const PLACES = {
  lote: {
    center: [-36.3490, -60.0088],
    // Polígono provisorio de ~7.500 m² (100 × 75 m) dentro del complejo
    polygon: [
      [-36.348662, -60.009358],
      [-36.348662, -60.008242],
      [-36.349338, -60.008242],
      [-36.349338, -60.009358],
    ],
  },
  termas: [-36.3496181, -60.0077553],
  ciudades: {
    // dir: lado de la etiqueta en el mapa · km: distancia por ruta (dato del cliente)
    azul: { name: 'Azul', coords: [-36.7770, -59.8585], dir: 'right', km: 51 },
    olavarria: { name: 'Olavarría', coords: [-36.8927, -60.3225], dir: 'bottom', km: 100 },
    tandil: { name: 'Tandil', coords: [-37.3217, -59.1332], dir: 'right', km: 155 },
    mardelplata: { name: 'Mar del Plata', coords: [-38.0055, -57.5426], dir: 'top', km: 325 },
    caba: { name: 'Capital Federal', coords: [-34.6037, -58.3816], dir: 'top', km: 271 },
    laplata: { name: 'La Plata', coords: [-34.9214, -57.9544], dir: 'right', km: 282 },
    saladillo: { name: 'Saladillo', coords: [-35.6373, -59.7781], dir: 'right', km: 85 },
    chivilcoy: { name: 'Chivilcoy', coords: [-34.8957, -60.0167], dir: 'left', km: 185 },
    bahiablanca: { name: 'Bahía Blanca', coords: [-38.7183, -62.2663], dir: 'bottom', km: 371 },
  },
};
