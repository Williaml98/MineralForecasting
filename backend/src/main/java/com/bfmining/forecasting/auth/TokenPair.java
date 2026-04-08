package com.bfmining.forecasting.auth;

import lombok.Builder;
import lombok.Data;

/**
 * Contains the JWT access and refresh tokens returned after a successful login or token refresh.
 */
@Data
@Builder
public class TokenPair {
    private String accessToken;
    private String refreshToken;
    private boolean mustChangePassword;
}
