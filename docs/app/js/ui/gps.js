// «Capturar ubicación» (RF-23): llena latitud y longitud con la posición del dispositivo, o explica por qué no se pudo.
const MENSAJES = {
  1: 'Permiso de ubicación denegado. Escriba las coordenadas a mano.',
  2: 'No se pudo determinar la ubicación. Escriba las coordenadas a mano.',
  3: 'La ubicación tardó demasiado. Intente de nuevo o escriba las coordenadas.',
};

export function capturarUbicacion({ boton, estadoEl, alExito, alError }) {
  if (!navigator.geolocation) { alError('Este dispositivo no permite capturar la ubicación. Escriba las coordenadas.'); return; }
  boton.disabled = true;
  estadoEl.textContent = 'Buscando ubicación…';
  navigator.geolocation.getCurrentPosition((pos) => {
    boton.disabled = false;
    estadoEl.textContent = `Ubicación capturada (precisión ≈ ${Math.round(pos.coords.accuracy)} m).`;
    alExito(pos.coords.latitude.toFixed(6), pos.coords.longitude.toFixed(6));
  }, (err) => {
    boton.disabled = false;
    estadoEl.textContent = '';
    alError(MENSAJES[err.code] ?? 'No se pudo capturar la ubicación.');
  }, { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 });
}
