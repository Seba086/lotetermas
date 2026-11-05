<?php
declare(strict_types=1);

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');

function respond(int $status, bool $success, string $message): never
{
    http_response_code($status);
    echo json_encode(
        ['success' => $success, 'message' => $message],
        JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES
    );
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    header('Allow: POST');
    respond(405, false, 'Método no permitido.');
}

$contentType = strtolower((string) ($_SERVER['CONTENT_TYPE'] ?? ''));
if (!str_contains($contentType, 'application/json')) {
    respond(415, false, 'Formato de solicitud no admitido.');
}

$rawBody = file_get_contents('php://input');
if ($rawBody === false || strlen($rawBody) > 20_000) {
    respond(400, false, 'Solicitud inválida.');
}

$data = json_decode($rawBody, true);
if (!is_array($data)) {
    respond(400, false, 'Solicitud inválida.');
}

// Los bots suelen completar este campo oculto. Simulamos éxito sin enviar correo.
if (trim((string) ($data['_honey'] ?? '')) !== '') {
    respond(200, true, 'Consulta recibida.');
}

$nombre = trim((string) ($data['nombre'] ?? ''));
$empresa = trim((string) ($data['empresa'] ?? ''));
$email = trim((string) ($data['email'] ?? ''));
$telefono = trim((string) ($data['telefono'] ?? ''));
$mensaje = trim((string) ($data['mensaje'] ?? ''));

if ($nombre === '' || mb_strlen($nombre) > 120) {
    respond(422, false, 'Ingresá un nombre válido.');
}

if (!filter_var($email, FILTER_VALIDATE_EMAIL) || strlen($email) > 254) {
    respond(422, false, 'Ingresá un correo electrónico válido.');
}

if (mb_strlen($empresa) > 160 || mb_strlen($telefono) > 60 || mb_strlen($mensaje) > 5_000) {
    respond(422, false, 'Uno de los campos supera la longitud permitida.');
}

// Evita inyección de encabezados en los campos usados por el correo.
if (preg_match('/[\r\n]/', $nombre . $empresa . $email)) {
    respond(422, false, 'Los datos ingresados no son válidos.');
}

$recipient = 'nfseba@gmail.com';
$subjectText = 'Consulta lote hotelero Termas Tapalqué: ' . ($empresa !== '' ? $empresa : $nombre);
$subject = function_exists('mb_encode_mimeheader')
    ? mb_encode_mimeheader($subjectText, 'UTF-8')
    : $subjectText;

$host = strtolower((string) ($_SERVER['SERVER_NAME'] ?? ''));
$host = preg_replace('/^www\./', '', $host) ?? '';
$host = preg_replace('/[^a-z0-9.-]/', '', $host) ?? '';
$senderDomain = filter_var($host, FILTER_VALIDATE_DOMAIN, FILTER_FLAG_HOSTNAME)
    ? $host
    : 'localhost';
$sender = 'no-reply@' . $senderDomain;

$bodyLines = [
    'Nueva consulta desde el sitio web',
    '',
    'Nombre y apellido: ' . $nombre,
    'Empresa / desarrolladora: ' . ($empresa !== '' ? $empresa : 'No informado'),
    'Correo electrónico: ' . $email,
    'Teléfono: ' . ($telefono !== '' ? $telefono : 'No informado'),
    '',
    'Mensaje:',
    $mensaje !== '' ? $mensaje : 'Sin mensaje',
    '',
    'Fecha: ' . date('d/m/Y H:i:s T'),
];

$headers = [
    'MIME-Version: 1.0',
    'Content-Type: text/plain; charset=UTF-8',
    'From: Lote Termas Tapalqué <' . $sender . '>',
    'Reply-To: ' . $email,
    'X-Mailer: PHP/' . PHP_VERSION,
];

$sent = mail(
    $recipient,
    $subject,
    implode("\r\n", $bodyLines),
    implode("\r\n", $headers)
);

if (!$sent) {
    error_log('No se pudo enviar una consulta del formulario de Lote Termas Tapalqué.');
    respond(500, false, 'El servidor no pudo enviar la consulta.');
}

respond(200, true, 'Consulta enviada correctamente.');
