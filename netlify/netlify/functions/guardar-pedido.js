// netlify/functions/guardar-pedido.js
//
// Esta función corre en el servidor de Netlify. Recibe los datos del pedido
// (productos, totales, datos de envío) desde la tienda y los reenvía a tu
// Google Sheet a través de la URL de Apps Script, para que quede un registro
// centralizado de TODOS los pedidos, se hayan pagado con Wompi o confirmado
// por WhatsApp.
//
// Requiere la variable de entorno GOOGLE_SHEETS_URL configurada en Netlify
// (la URL que termina en /exec que copiaste al desplegar tu Apps Script).

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Método no permitido' }) };
  }

  const SHEETS_URL = process.env.GOOGLE_SHEETS_URL;
  if (!SHEETS_URL) {
    // No bloqueamos la venta si falta configurar esto — solo avisamos.
    return { statusCode: 200, body: JSON.stringify({ status: 'omitido', reason: 'Falta configurar GOOGLE_SHEETS_URL' }) };
  }

  let body;
  try {
    body = JSON.parse(event.body);
  } catch {
    return { statusCode: 400, body: JSON.stringify({ error: 'Cuerpo de la petición inválido' }) };
  }

  try {
    await fetch(SHEETS_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      redirect: 'follow',
    });
    // Apps Script a veces responde con una redirección que el runtime de
    // Netlify maneja solo; no necesitamos leer el contenido de la respuesta.
    return { statusCode: 200, body: JSON.stringify({ status: 'ok' }) };
  } catch (err) {
    // Tampoco bloqueamos la venta si el registro falla — el pedido igual
    // sigue su curso por Wompi o WhatsApp.
    return { statusCode: 200, body: JSON.stringify({ status: 'error_no_bloqueante', error: err.message }) };
  }
};
