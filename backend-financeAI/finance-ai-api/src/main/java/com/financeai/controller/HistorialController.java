package com.financeai.controller;

import com.financeai.dto.PersistenciaDtos.*;
import com.financeai.persistence.entity.Usuario;
import com.financeai.service.HistorialAnalisisService;
import com.financeai.service.SesionService;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController @RequestMapping("/api/historial")
public class HistorialController {
    private final HistorialAnalisisService servicio; private final SesionService sesiones;
    public HistorialController(HistorialAnalisisService servicio, SesionService sesiones) { this.servicio = servicio; this.sesiones = sesiones; }
    @GetMapping public List<AnalisisHistorialResponse> listar(@RequestHeader("Authorization") String auth) { return servicio.listar(usuario(auth)); }
    @GetMapping("/{id}") public AnalisisDetalleResponse detalle(@RequestHeader("Authorization") String auth, @PathVariable Long id) { return servicio.detalle(usuario(auth), id); }
    @DeleteMapping("/{id}") @ResponseStatus(HttpStatus.NO_CONTENT) public void eliminar(@RequestHeader("Authorization") String auth, @PathVariable Long id) { servicio.eliminar(usuario(auth), id); }
    private Usuario usuario(String auth) { return sesiones.requerirUsuario(auth); }
}
