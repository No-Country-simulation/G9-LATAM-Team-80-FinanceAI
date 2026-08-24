package com.financeai.controller;

import com.financeai.dominio.CategoriasFinancieras;
import com.financeai.dto.PersistenciaDtos.*;
import com.financeai.service.PresupuestoService;
import com.financeai.service.SesionService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.time.YearMonth;
import java.time.format.DateTimeParseException;
import java.util.List;

@RestController @RequestMapping("/api/presupuestos")
public class PresupuestoController {
    private final PresupuestoService servicio; private final SesionService sesiones;
    public PresupuestoController(PresupuestoService servicio, SesionService sesiones) { this.servicio = servicio; this.sesiones = sesiones; }
    /**
     * Los limites del periodo indicado.
     *
     * @param mes formato AAAA-MM. Ausente: el mes mas reciente con movimientos, que es
     *            donde abre la pantalla.
     */
    @GetMapping public List<PresupuestoResponse> listar(
            @RequestHeader("Authorization") String auth,
            @RequestParam(required = false) String mes) {
        return servicio.listar(sesiones.requerirUsuario(auth), validar(mes));
    }

    /**
     * Varios limites del mismo periodo en una sola transaccion.
     *
     * Es lo que usa "Editar presupuesto": el mes se configura entero de una vez, asi que
     * o entran todos los limites o no entra ninguno.
     */
    @PutMapping("/lote") public List<PresupuestoResponse> guardarLote(
            @RequestHeader("Authorization") String auth,
            @RequestParam(required = false) String mes,
            @Valid @RequestBody PresupuestoLoteRequest req) {
        return servicio.guardarLote(sesiones.requerirUsuario(auth), req.limites(), validar(mes));
    }

    /** Crea o actualiza el limite en ESE periodo; los demas meses no se tocan. */
    @PutMapping public PresupuestoResponse guardar(
            @RequestHeader("Authorization") String auth,
            @RequestParam(required = false) String mes,
            @Valid @RequestBody PresupuestoRequest req) {
        return servicio.guardar(sesiones.requerirUsuario(auth), req, validar(mes));
    }

    /**
     * Quita el limite de una categoria en ESE periodo; los demas meses no se tocan.
     *
     * No reutiliza PresupuestoRequest para esto: su @DecimalMin("0.01") existe justo para
     * que un limite nunca sea 0 ni null, asi que no hay forma de pedir "sin limite" con
     * ese contrato. Un endpoint propio evita mezclar dos significados en un mismo campo.
     */
    @DeleteMapping @ResponseStatus(HttpStatus.NO_CONTENT) public void eliminar(
            @RequestHeader("Authorization") String auth,
            @RequestParam(required = false) String mes,
            @RequestParam String categoria) {
        if (!CategoriasFinancieras.OFICIALES.contains(categoria)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "categoria no pertenece al catalogo oficial");
        }
        servicio.eliminar(sesiones.requerirUsuario(auth), categoria, validar(mes));
    }

    /**
     * Un periodo mal escrito es un error de quien llama, no una invitacion a elegir otro.
     *
     * Antes se ignoraba en silencio y se respondia con los datos del mes mas reciente:
     * la pantalla enseñaba cifras validas de un periodo que nadie habia pedido, que es
     * la peor forma de fallar porque nadie se entera.
     */
    private String validar(String mes) {
        if (mes == null || mes.isBlank()) return null;
        try {
            YearMonth.parse(mes);
            return mes;
        } catch (DateTimeParseException fallo) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "El periodo debe tener el formato AAAA-MM. Recibido: '" + mes + "'");
        }
    }
}

