package com.financeai.controller;

import com.financeai.dto.PersistenciaDtos.*;
import com.financeai.service.PresupuestoService;
import com.financeai.service.SesionService;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController @RequestMapping("/api/presupuestos")
public class PresupuestoController {
    private final PresupuestoService servicio; private final SesionService sesiones;
    public PresupuestoController(PresupuestoService servicio, SesionService sesiones) { this.servicio = servicio; this.sesiones = sesiones; }
    @GetMapping public List<PresupuestoResponse> listar(@RequestHeader("Authorization") String auth) { return servicio.listar(sesiones.requerirUsuario(auth)); }
    @PutMapping public PresupuestoResponse guardar(@RequestHeader("Authorization") String auth, @Valid @RequestBody PresupuestoRequest req) { return servicio.guardar(sesiones.requerirUsuario(auth), req); }
}

