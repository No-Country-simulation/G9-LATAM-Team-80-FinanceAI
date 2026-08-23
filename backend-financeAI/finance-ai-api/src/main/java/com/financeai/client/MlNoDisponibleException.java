package com.financeai.client;

import org.springframework.web.client.RestClientException;

/**
 * Se lanza cuando el cortacircuitos esta abierto y la llamada al ML ni siquiera se
 * intenta.
 *
 * Extiende RestClientException para que GlobalExceptionHandler la traduzca a 502 igual
 * que un fallo real del servicio: desde el punto de vista de quien consume la API el
 * resultado es el mismo, el analisis no esta disponible. La diferencia queda en el log,
 * donde si importa distinguir "el ML fallo" de "dejamos de llamarlo a proposito".
 */
public class MlNoDisponibleException extends RestClientException {

    public MlNoDisponibleException(String mensaje) {
        super(mensaje);
    }
}
