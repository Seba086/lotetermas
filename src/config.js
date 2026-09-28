// Datos editables del sitio.
export const CONFIG = {
  // Número de WhatsApp en formato internacional, solo dígitos (ej.: '5492283123456').
  // Vacío: el botón flotante lleva al formulario de contacto.
  whatsappNumber: '',
  whatsappMessage: 'Hola, me interesa recibir información sobre el lote hotelero en Termas Tapalqué.',

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
  centro: [-36.3563106, -60.0251321],
  ciudades: {
    // dir: lado de la etiqueta en el mapa
    azul: { name: 'Azul', coords: [-36.7770, -59.8585], dir: 'right' },
    olavarria: { name: 'Olavarría', coords: [-36.8927, -60.3225], dir: 'bottom' },
    tandil: { name: 'Tandil', coords: [-37.3217, -59.1332], dir: 'right' },
    mardelplata: { name: 'Mar del Plata', coords: [-38.0055, -57.5426], dir: 'top' },
    caba: { name: 'Buenos Aires', coords: [-34.6037, -58.3816], dir: 'top' },
  },
};
