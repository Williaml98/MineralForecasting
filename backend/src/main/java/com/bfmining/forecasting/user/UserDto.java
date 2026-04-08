package com.bfmining.forecasting.user;

import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;
import java.util.UUID;

/**
 * DTO returned to clients when querying user information.
 */
@Data
@Builder
public class UserDto {
    private UUID id;
    private String name;
    private String email;
    private Role role;
    private boolean active;
    private boolean mustChangePassword;
    private LocalDateTime lastLogin;
    private LocalDateTime createdAt;
}
