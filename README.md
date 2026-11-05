# lotetermas

## Formulario de contacto en Hostinger

El formulario envía un `POST` JSON a `/contact.php`. Vite copia
`public/contact.php` a la raíz de `dist/` durante `npm run build`.

Para publicarlo en Hostinger:

1. El sitio debe estar alojado en un entorno PHP/HTML de Hostinger, no en un
   servidor exclusivamente estático.
2. Usar PHP 8.1 o posterior y comprobar que la función `mail()` esté habilitada.
3. Crear la casilla `no-reply@dominio-del-sitio` en Hostinger Email. El endpoint
   obtiene el dominio automáticamente del sitio publicado y usa esa dirección
   como remitente.
4. Desplegar el contenido de `dist/` asegurándose de que `contact.php` quede en
   la raíz pública, junto a `index.html`.
5. Abrir `https://dominio-del-sitio/contact.php`: debe responder JSON con código
   405 indicando que solo acepta `POST`. Si muestra el código PHP, lo descarga o
   devuelve 404, el hosting no está ejecutando el endpoint.
6. Enviar una consulta de prueba y revisar también la carpeta Spam de
   `desarrollotermastapalque@gmail.com`.

Hostinger limita el envío no autenticado mediante `mail()`. Si el sitio necesita
mayor volumen o entregabilidad, el siguiente paso es usar PHPMailer con SMTP.
