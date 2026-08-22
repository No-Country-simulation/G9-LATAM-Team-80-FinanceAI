package com.financeai.controller;

import com.financeai.dto.HealthResponse;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDateTime;

@RestController
@RequestMapping("/api/health")
public class HealthController {

    @GetMapping
    public HealthResponse health() {

        return new HealthResponse(
                "UP",
                "Finance AI API",
                "1.0.0",
                LocalDateTime.now()
        );
    }
}

