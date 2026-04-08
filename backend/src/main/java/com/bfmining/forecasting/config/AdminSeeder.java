package com.bfmining.forecasting.config;

import com.bfmining.forecasting.user.Role;
import com.bfmining.forecasting.user.User;
import com.bfmining.forecasting.user.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

/**
 * Seeds the admin account at application startup if it does not already exist.
 * Credentials are read from environment variables {@code ADMIN_EMAIL} and {@code ADMIN_PASSWORD}.
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class AdminSeeder implements CommandLineRunner {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    @Value("${app.admin.email}")
    private String adminEmail;

    @Value("${app.admin.password}")
    private String adminPassword;

    @Override
    public void run(String... args) {
        if (!userRepository.existsByEmail(adminEmail)) {
            User admin = User.builder()
                    .name("System Administrator")
                    .email(adminEmail)
                    .passwordHash(passwordEncoder.encode(adminPassword))
                    .role(Role.ADMIN)
                    .active(true)
                    .mustChangePassword(false)
                    .build();
            userRepository.save(admin);
            log.info("Admin account seeded: {}", adminEmail);
        }
    }
}
