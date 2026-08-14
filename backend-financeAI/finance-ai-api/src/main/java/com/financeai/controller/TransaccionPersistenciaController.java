package com.financeai.controller;

import com.financeai.dto.PersistenciaDtos.*;
import com.financeai.persistence.entity.Usuario;
import com.financeai.service.SesionService;
import com.financeai.service.TransaccionPersistenciaService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController @RequestMapping("/api/transacciones")
public class TransaccionPersistenciaController {
    private final TransaccionPersistenciaService servicio; private final SesionService sesiones;
    public TransaccionPersistenciaController(TransaccionPersistenciaService servicio, SesionService sesiones) { this.servicio = servicio; this.sesiones = sesiones; }
    @GetMapping public List<TransaccionResponse> listar(@RequestHeader("Authorization") String auth) { return servicio.listar(usuario(auth)); }
    @PostMapping @ResponseStatus(HttpStatus.CREATED) public TransaccionResponse crear(@RequestHeader("Authorization") String auth, @Valid @RequestBody TransaccionGuardarRequest req) { return servicio.crear(usuario(auth), req); }
    @PostMapping("/importar") @ResponseStatus(HttpStatus.CREATED) public List<TransaccionResponse> importar(@RequestHeader("Authorization") String auth, @Valid @RequestBody ImportarTransaccionesRequest req) { return servicio.importar(usuario(auth), req); }
    @PutMapping("/{id}") public TransaccionResponse actualizar(@RequestHeader("Authorization") String auth, @PathVariable Long id, @Valid @RequestBody TransaccionGuardarRequest req) { return servicio.actualizar(usuario(auth), id, req); }
    @DeleteMapping("/{id}") @ResponseStatus(HttpStatus.NO_CONTENT) public void eliminar(@RequestHeader("Authorization") String auth, @PathVariable Long id) { servicio.eliminar(usuario(auth), id); }
    private Usuario usuario(String auth) { return sesiones.requerirUsuario(auth); }
}

