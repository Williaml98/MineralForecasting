package com.bfmining.forecasting.auth;

import com.bfmining.forecasting.audit.AuditAction;
import com.bfmining.forecasting.user.User;
import com.bfmining.forecasting.user.UserRepository;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.regex.Pattern;

/**
 * Service handling authentication operations: login, token refresh, logout, and password change.
 */
@Service
@RequiredArgsConstructor
public class AuthService {

    private static final Pattern PASSWORD_PATTERN =
            Pattern.compile("^(?=.*[0-9])(?=.*[!@#$%^&*()_+\\-=\\[\\]{};':\"\\\\|,.<>/?]).{8,}$");

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final TokenService tokenService;

    /**
     * Authenticates a user and returns a token pair.
     *
     * @param email    the user's email
     * @param password the raw password
     * @return token pair (access + refresh)
     */
    @Transactional
    @AuditAction("LOGIN")
    public TokenPair login(String email, String password) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new BadCredentialsException("Invalid credentials"));

        if (!user.isActive()) {
            throw new BadCredentialsException("Account is deactivated");
        }

        if (!passwordEncoder.matches(password, user.getPasswordHash())) {
            throw new BadCredentialsException("Invalid credentials");
        }

        user.setLastLogin(LocalDateTime.now());
        userRepository.save(user);

        return TokenPair.builder()
                .accessToken(tokenService.generateAccessToken(user))
                .refreshToken(tokenService.generateRefreshToken(user))
                .mustChangePassword(user.isMustChangePassword())
                .build();
    }

    /**
     * Issues a new token pair from a valid refresh token.
     *
     * @param refreshToken the refresh token string
     * @return new token pair
     */
    public TokenPair refresh(String refreshToken) {
        if (!tokenService.isTokenValid(refreshToken)) {
            throw new BadCredentialsException("Invalid or expired refresh token");
        }
        String email = tokenService.extractEmail(refreshToken);
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new EntityNotFoundException("User not found"));

        return TokenPair.builder()
                .accessToken(tokenService.generateAccessToken(user))
                .refreshToken(tokenService.generateRefreshToken(user))
                .mustChangePassword(user.isMustChangePassword())
                .build();
    }

    /**
     * Changes the authenticated user's password after validating complexity requirements.
     *
     * @param user        the currently authenticated user
     * @param newPassword the new raw password
     */
    @Transactional
    @AuditAction("PASSWORD_CHANGE")
    public void changePassword(User user, String newPassword) {
        if (!PASSWORD_PATTERN.matcher(newPassword).matches()) {
            throw new IllegalArgumentException(
                    "Password must be at least 8 characters and contain at least one number and one special character");
        }
        user.setPasswordHash(passwordEncoder.encode(newPassword));
        user.setMustChangePassword(false);
        userRepository.save(user);
    }
}
