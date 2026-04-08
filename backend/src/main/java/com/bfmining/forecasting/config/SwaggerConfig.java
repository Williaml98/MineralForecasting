package com.bfmining.forecasting.config;

import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Info;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * OpenAPI / Swagger configuration. UI available at /api/docs.
 */
@Configuration
public class SwaggerConfig {

    @Bean
    public OpenAPI openAPI() {
        return new OpenAPI()
                .info(new Info()
                        .title("BF Mining — Mineral Demand Forecasting API")
                        .description("Backend REST API for the AI-Driven Mineral Demand Forecasting System")
                        .version("1.0.0"));
    }
}
