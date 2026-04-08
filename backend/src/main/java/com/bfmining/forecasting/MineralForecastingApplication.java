package com.bfmining.forecasting;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableAsync;

/**
 * Entry point for the BF Mining Mineral Demand Forecasting backend.
 */
@SpringBootApplication
@EnableAsync
public class MineralForecastingApplication {

    public static void main(String[] args) {
        SpringApplication.run(MineralForecastingApplication.class, args);
    }
}
