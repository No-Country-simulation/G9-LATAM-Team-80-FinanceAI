package com.financeai.controller;

import com.financeai.persistence.entity.Usuario;
import com.financeai.service.AsistenteContextoService;
import com.financeai.service.SesionService;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

import java.time.YearMonth;
import java.time.format.DateTimeParseException;
import java.util.Map;

/**
 * Endpoint pensado para que el widget de chat agentico (Oven, ver
 * docs/widget-chat-agentico.md) pueda consultar el contexto financiero real del
 * usuario en una sola llamada, en vez de fabricar cifras cuando le preguntan por
 * su perfil, sus gastos o su ingreso.
 */
@RestController
@RequestMapping("/api")
public class AsistenteContextoController {

    private final SesionService sesiones;
    private final AsistenteContextoService contexto;

    public AsistenteContextoController(SesionService sesiones, AsistenteContextoService contexto) {
        this.sesiones = sesiones;
        this.contexto = contexto;
    }

    /**
     * mes es opcional -- sin el, se usa el mes actual del servidor, que es el que
     * un usuario esperaria si pregunta "como estan mis finanzas" sin mas contexto.
     */
    @GetMapping("/asistente/contexto")
    public Map<String, Object> obtenerContexto(
            @RequestHeader("Authorization") String authorization,
            @RequestParam(name = "mes", required = false) String mes
    ) {
        Usuario usuario = sesiones.requerirUsuario(authorization);
        return contexto.obtenerContexto(usuario, parsearMes(mes));
    }

    private YearMonth parsearMes(String mes) {
        if (mes == null || mes.isBlank()) return YearMonth.now();
        try {
            return YearMonth.parse(mes);
        } catch (DateTimeParseException e) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "El parametro mes debe tener el formato AAAA-MM");
        }
    }
}
