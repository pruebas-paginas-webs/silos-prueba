# DNS de silospy.com antes de pasar a Cloudflare

Foto tomada el 25/09/2026 desde el servidor autoritativo de GoDaddy
(`ns23.domaincontrol.com`). Es la lista contra la que se verifica lo que importe
Cloudflare **antes** de cambiar los nameservers en GoDaddy.

El correo es **Microsoft 365 contratado a través de GoDaddy** (lo delata el TXT
`NETORGFT…onmicrosoft.com`). Si falta o se altera un registro de correo, dejan de
llegar mails o falla la configuración de Outlook.

## Correo y Microsoft 365 — copiar tal cual, siempre «DNS only» (nube gris)

| Nombre | Tipo | Valor |
|---|---|---|
| `silospy.com` | MX | `0 silospy-com.mail.protection.outlook.com` |
| `silospy.com` | TXT | `NETORGFT15781213.onmicrosoft.com` |
| `silospy.com` | TXT | `v=spf1 include:secureserver.net -all` |
| `autodiscover` | CNAME | `autodiscover.outlook.com` |
| `msoid` | CNAME | `clientconfig.microsoftonline-p.net` |
| `lyncdiscover` | CNAME | `webdir.online.lync.com` |
| `sip` | CNAME | `sipdir.online.lync.com` |
| `_sip._tls` | SRV | `100 1 443 sipdir.online.lync.com` |
| `_sipfederationtls._tcp` | SRV | `100 1 5061 sipfed.online.lync.com` |
| `email` | CNAME | `email.secureserver.net` |

No hay DKIM (`selector1/2._domainkey`), DMARC ni CAA configurados: no falta nada
de eso en la importación.

## Web — hoy apuntan a la página de estacionamiento de GoDaddy

| Nombre | Tipo | Valor |
|---|---|---|
| `silospy.com` | A | `3.33.130.190` y `15.197.148.33` |
| `www` | CNAME | `silospy.com` |

Se reemplazan cuando el sitio se publique en Cloudflare. Mientras tanto se pueden
dejar como estén.

## De GoDaddy, sin uso después de la mudanza

| Nombre | Tipo | Valor |
|---|---|---|
| `_domainconnect` | CNAME | `_domainconnect.gd.domaincontrol.com` |

Inofensivo; se puede copiar o no.

## Verificación en Cloudflare (25/09/2026)

Zona creada en Cloudflare (plan Free). Nameservers asignados:
**`danica.ns.cloudflare.com`** y **`everton.ns.cloudflare.com`**.

Consultados directamente esos servidores antes de cambiar nada en GoDaddy:
**los 11 registros de correo dan el valor exacto de la tabla de arriba** (MX, los dos
TXT, los seis CNAME y los dos SRV), y los CNAME responden con su destino real, o sea
que están en «DNS only». La importación automática los había puesto en «Proxied» y se
corrigieron a mano.

DNSSEC apagado: el registro `.com` no tiene DS para `silospy.com`, así que el cambio de
nameservers no requiere pasos previos.

## Orden

1. Agregar el sitio en Cloudflare (plan **Free**). No cambia nada en vivo.
2. Comparar lo importado contra esta lista: los 10 de correo presentes, idénticos
   y en «DNS only».
3. Recién ahí cambiar los nameservers en GoDaddy.
4. Verificar después: mail entrante y saliente, y configuración de Outlook.
