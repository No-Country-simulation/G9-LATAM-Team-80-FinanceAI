package com.financeai.dto;

import java.time.LocalDateTime;

public record HealthResponse(

        String status,
        String application,
        String version,
        LocalDateTime timestamp

) {
}
