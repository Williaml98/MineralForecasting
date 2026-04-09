package com.bfmining.forecasting.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.web.client.RestTemplateBuilder;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.reactive.function.client.WebClient;

/**
 * Spring configuration class for reactive HTTP client beans.
 * Provides a pre-configured {@link WebClient} instance for communicating
 * with the external ML microservice.
 */
@Configuration
public class WebClientConfig {

    /**
     * Creates a {@link WebClient} bean pre-configured with the ML service base URL.
     * The base URL is read from the {@code app.ml.service-url} application property.
     *
     * @param mlUrl the base URL of the ML microservice
     * @return a configured {@link WebClient} instance
     */
    @Bean
    public WebClient mlWebClient(@Value("${app.ml.service-url}") String mlUrl) {
        return WebClient.builder()
                .baseUrl(mlUrl)
                .build();
    }

    /**
     * Synchronous HTTP client used by {@code TrainingSimulator} inside {@code @Async} threads.
     */
    @Bean
    public RestTemplate restTemplate(RestTemplateBuilder builder) {
        return builder.build();
    }
}
