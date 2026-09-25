# Para el cliente: crear la cuenta donde va a vivir el sitio

Primer mensaje (ya enviado; el cliente creó la cuenta e invitó a Agustín). Se
conserva como registro. **El paso 3, la tarjeta, quedó descartado el 25/09**: ver
las notas al final.

---

Hola, ¿cómo están? Para poner la web en línea necesito que creen una cuenta en
**Cloudflare**, que es el servicio donde va a estar alojado el sitio. Es gratis
para lo que usamos. Son 10 minutos, y les pido que la creen ustedes (y no yo)
para que el sitio quede a nombre de la empresa.

**1. Crear la cuenta**
- Entrá a https://dash.cloudflare.com/sign-up
- Usá un correo de la empresa (por ejemplo, jvanden@silospy.com) y elegí una
  contraseña. Guardala en un lugar seguro: es la llave del sitio.
- Te va a llegar un mail de Cloudflare para confirmar el correo. Hacé clic en
  el botón que trae.

**2. Agregarme como colaborador**
Así puedo trabajar adentro de su cuenta sin que me pasen la contraseña.
- Ya adentro, en el menú de la izquierda buscá **Manage Account → Members**
  (en español: *Administrar cuenta → Miembros*).
- Botón **Invite** (*Invitar*). Poné mi correo: AGUSTIN_EMAIL
- En el rol elegí **Super Administrator – All Privileges** y enviá la invitación.

**3. Cargar un medio de pago (no se cobra nada)** — *descartado, ver notas*

**4. Mandame estos datos**
- Que la cuenta ya está creada y que me enviaron la invitación.
- El correo con el que la crearon.
- Nombre y correo de cada persona que va a usar el panel para cargar productos.
- Si los teléfonos y correos que aparecen en la web son los definitivos.

---

# Paso 2 para el cliente: cambiar los nameservers en GoDaddy

Mandar **sólo después** de verificar los registros de correo en Cloudflare (hecho el
25/09: 11 de 11 idénticos; ver `DNS-SILOSPY.md`). Tono de amigo, a pedido de
Agustín: el cliente es el papá de un amigo. Texto plano para WhatsApp.

---

Buenas! ¿Cómo andás? Te cuento cómo venimos con la web.

Ya dejé todo preparado en Cloudflare, que es donde va a quedar alojada. Falta un solo paso que tenés que hacer vos en GoDaddy, porque es tu cuenta. Son 5 minutitos.

Antes que nada, tranquilo: ya copié y revisé uno por uno todos los datos del correo, así que no vas a notar ningún cambio. El mail sigue andando igual y silospy.com sigue mostrando lo mismo que hoy.

1. Entrá a GoDaddy con tu usuario, como siempre.

2. En la lista de productos, al lado de silospy.com, tocá "DNS".

3. Arriba vas a ver unas pestañas. Tocá "Nameservers" (Servidores de nombres).

4. Tocá "Change Nameservers" (Cambiar servidores de nombres) y elegí "I'll use my own nameservers" (Usaré mis propios servidores de nombres).

5. Borrá lo que haya escrito y poné exactamente estos dos, uno en cada casilla:

danica.ns.cloudflare.com
everton.ns.cloudflare.com

6. Tocá "Save" (Guardar). GoDaddy te va a tirar un aviso de que esto puede afectar la web o el correo. Es un aviso general, en nuestro caso ya está todo resuelto, así que dale a "Continue" (Continuar).

7. Capaz te pida un código que te llega por SMS o por mail. Lo ponés y listo.

8. Mandame una captura de cómo quedó.

El cambio puede tardar desde unos minutos hasta un día en impactar, pero mientras tanto el correo anda igual, porque los datos están en los dos lados.

Si en algún momento GoDaddy te muestra algún cartel sobre el correo o el DNS, no te preocupes: es porque ahora el dominio se maneja desde Cloudflare y no hace falta tocar nada. Eso sí, no canceles ni cambies nada del correo de Microsoft ni del dominio, que siguen en GoDaddy como siempre.

Dos cositas más:

- Lo de cargar la tarjeta en Cloudflare al final no hace falta, así que olvidate de eso.
- Para entrar al panel donde vas a cargar los productos vas a usar usuario y contraseña, no el código por mail que te había comentado. Te los paso yo cuando esté todo listo. Si todavía no me dijiste quiénes lo van a usar, pasame los nombres así le armo el usuario a cada uno.

Cualquier cosa, antes de tocar algo me escribís y lo vemos. ¡Abrazo!

---

## Notas para Agustín (no van en el mensaje)

- **Sin tarjeta (decidido el 25/09).** R2 y el plan gratuito de Zero Trust (Access)
  piden medio de pago aunque cuesten US$ 0; el resto no (D1, Workers y Browser
  Rendering ya se probaron en su cuenta sin tarjeta). Reemplazos:
  - Fotos en **Workers KV** en vez de R2. Para fotos de ~60 KB alcanza de sobra;
    una foto nueva puede tardar hasta un minuto en verse en todas las regiones.
  - Panel con **usuario y contraseña** en vez de Access. Contraseñas generadas
    (largas), así el hash cabe en los 10 ms de CPU del plan gratuito.
  - Reversible: si algún día cargan la tarjeta, se pasa a R2 y a ingreso por
    código al mail.
- Registros de correo verificados antes de cambiar los nameservers (ver
  `DNS-SILOSPY.md`). DNSSEC apagado.
- Recomendales activar la verificación en dos pasos en la cuenta de Cloudflare
  cuando esté todo andando: **My Profile → Authentication → Two-Factor
  Authentication**.
