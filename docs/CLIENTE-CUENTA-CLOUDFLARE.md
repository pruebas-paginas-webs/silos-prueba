# Para el cliente: crear la cuenta donde va a vivir el sitio

Texto pensado para mandar tal cual (WhatsApp o mail). Son 10 minutos y no hace
falta saber nada técnico. Lo demás (dominio, publicación, panel) lo hace Agustín
desde adentro de esa cuenta.

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

**3. Cargar un medio de pago (no se cobra nada)**
Cloudflare pide una tarjeta para activar el guardado de fotos y el acceso al
panel, aunque el plan sea de US$ 0. Con el uso de este sitio no hay cargos;
las cuentas gratuitas no pasan a pagas solas.
- Menú de la izquierda: **Billing → Payment info** (*Facturación → Datos de pago*)
  y agregá la tarjeta.
- Si prefieren no cargarla ahora, no pasa nada: me avisan y lo vemos en el
  momento en que haga falta.

**4. Mandame estos datos**
- Que la cuenta ya está creada y que me enviaron la invitación.
- El correo con el que la crearon.
- Nombre y correo de cada persona que va a usar el panel para cargar
  productos. Para entrar no va a hacer falta contraseña: se les manda un
  código por mail cada vez.
- Si los teléfonos y correos que aparecen en la web son los definitivos.

**Qué va a pasar después**
Voy a pasar el dominio silospy.com a Cloudflare, para que la web salga con su
dirección. Les va a llegar un mail de GoDaddy avisando de ese cambio: es
normal, no hay que hacer nada. **El correo de la empresa no se toca y sigue
funcionando igual.** Con la cuenta lista, la web queda en línea en pocos días.

Cualquier duda me escriben y lo vemos juntos.

---

# Paso 2 para el cliente: cambiar los nameservers en GoDaddy

Mandar **sólo después** de verificar los registros de correo en Cloudflare (hecho el
25/09: 11 de 11 idénticos; ver `DNS-SILOSPY.md`).

---

Hola, ¿cómo están? Ya dejé todo preparado en Cloudflare. Falta un único paso que
tienen que hacer ustedes en GoDaddy, porque es su cuenta. Son 5 minutos.

**Antes de empezar, tranquilidad:** ya copié y verifiqué uno por uno todos los datos
del correo. No van a notar ningún cambio: el mail sigue funcionando igual y la
dirección silospy.com sigue mostrando lo mismo que hoy.

**1.** Entrá a GoDaddy con tu usuario, como siempre.

**2.** En la lista de productos, al lado de **silospy.com**, tocá **DNS**.

**3.** Arriba vas a ver dos pestañas. Tocá **Nameservers** (*Servidores de nombres*).

**4.** Tocá **Change Nameservers** (*Cambiar servidores de nombres*) y elegí
**I'll use my own nameservers** (*Usaré mis propios servidores de nombres*).

**5.** Borrá lo que aparezca escrito y poné exactamente estos dos, uno en cada casilla:

```
danica.ns.cloudflare.com
everton.ns.cloudflare.com
```

**6.** Tocá **Save** (*Guardar*). GoDaddy te va a mostrar un aviso de que esto puede
afectar al sitio o al correo: **es un aviso general, en nuestro caso ya está todo
resuelto**. Tocá **Continue** (*Continuar*).

**7.** Te puede pedir un código que te llega por SMS o por mail. Ingresalo y listo.

**8.** Mandame una captura de cómo quedó.

El cambio tarda desde unos minutos hasta un día en aplicarse en todo el mundo. En
ese tiempo el correo funciona igual, porque los datos están en los dos lados.

Si en algún momento GoDaddy muestra un aviso sobre el correo o sobre el DNS, es
esperable: pasa porque ahora el dominio se administra desde Cloudflare. No hace
falta tocar nada. Por favor, **no cancelen ni modifiquen el correo de Microsoft
365 ni el dominio**: los dos siguen contratados en GoDaddy como hasta ahora.

Cualquier duda, me escriben antes de tocar.

---

## Notas para Agustín (no van en el mensaje)

- Reemplazá `AGUSTIN_EMAIL` por tu correo antes de mandarlo.
- Lo que hacés vos desde su cuenta: agregar el sitio `silospy.com`, verificar
  que Cloudflare haya importado **todos** los registros de Microsoft 365 (MX,
  SPF, DKIM, autodiscover) antes de cambiar los nameservers en GoDaddy, y recién
  después cambiarlos. Pages, D1, R2, Access y Browser Rendering se activan desde
  adentro.
- La tarjeta hace falta para activar R2 (fotos) y el plan gratuito de Zero
  Trust (Access, el login del panel). Si el cliente no quiere cargarla, el
  login del panel se puede hacer con usuario y contraseña propios, como hoy,
  pero las fotos igual necesitan R2.
- Recomendales activar la verificación en dos pasos en la cuenta cuando esté
  todo andando: **My Profile → Authentication → Two-Factor Authentication**.
