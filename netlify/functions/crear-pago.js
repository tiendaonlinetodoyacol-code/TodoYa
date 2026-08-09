// netlify/functions/crear-pago.js
//
// Esta función corre en el servidor de Netlify (nunca en el navegador del cliente).
// Recibe el total del carrito, y le pide a Wompi que cree un Enlace de Pago
// nuevo con ese monto exacto y bloqueado (el cliente no puede editarlo).
//
// Requiere la variable de entorno WOMPI_LLAVE_PRIVADA configurada en Netlify
// (Site configuration → Environment variables). NUNCA pongas la llave privada
// directamente en este archivo ni en el HTML.

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Método no permitido' }) };
  }

  let body;
  try {
    body = JSON.parse(event.body);
  } catch {
    return { statusCode: 400, body: JSON.stringify({ error: 'Cuerpo de la petición inválido' }) };
  }

  const { amount, reference } = body;

  // Validación básica: el monto debe ser un número razonable en pesos colombianos
  if (!amount || typeof amount !== 'number' || amount < 1000) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Monto inválido' }) };
  }

  const LLAVE_PRIVADA = process.env.WOMPI_LLAVE_PRIVADA;
  if (!LLAVE_PRIVADA) {
    return { statusCode: 500, body: JSON.stringify({ error: 'Falta configurar WOMPI_LLAVE_PRIVADA en Netlify' }) };
  }

  // Usa sandbox mientras pruebas (llave privada prv_test_...), y producción cuando
  // pases a llaves reales (prv_prod_...). No necesitas cambiar nada aquí: Wompi
  // detecta el ambiente según el prefijo de tu llave.
  const BASE_URL = LLAVE_PRIVADA.startsWith('prv_prod_')
    ? 'https://production.wompi.co/v1'
    : 'https://sandbox.wompi.co/v1';

  const pedidoRef = reference || `TODOYA-${Date.now()}`;

  try {
    const wompiResponse = await fetch(`${BASE_URL}/payment_links`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${LLAVE_PRIVADA}`,
      },
      body: JSON.stringify({
        name: 'Pedido TODOYA',
        description: `Pedido ${pedidoRef}`,
        single_use: true,        // el enlace se desactiva después del primer pago aprobado
        collect_shipping: true,  // le pide dirección de envío al cliente en el checkout
        currency: 'COP',
        amount_in_cents: Math.round(amount * 100), // monto BLOQUEADO, el cliente no lo edita
      }),
    });

    const data = await wompiResponse.json();

    if (!wompiResponse.ok) {
      return { statusCode: 502, body: JSON.stringify({ error: 'Wompi rechazó la solicitud', details: data }) };
    }

    const linkId = data.data.id;
    return {
      statusCode: 200,
      body: JSON.stringify({ url: `https://checkout.wompi.co/l/${linkId}` }),
    };
  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};
