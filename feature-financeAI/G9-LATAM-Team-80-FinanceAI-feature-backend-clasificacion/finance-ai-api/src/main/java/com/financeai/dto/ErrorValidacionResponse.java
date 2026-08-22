package com.financeai.dto;

import java.time.LocalDateTime;
import java.util.Map;

public record ErrorValidacionResponse(

        LocalDateTime timestamp,
        int status,
        String mensaje,
        Map<String, String> errores

) {
}
