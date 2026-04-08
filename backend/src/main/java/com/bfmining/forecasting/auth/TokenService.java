package com.bfmining.forecasting.auth;

import com.bfmining.forecasting.user.User;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.util.Date;

/**
 * Service for generating and validating JWT access and refresh tokens.
 */
@Service
@Slf4j
public class TokenService {

    private final SecretKey key;
    private final long accessExpiryMs;
    private final long refreshExpiryMs;

    public TokenService(
            @Value("${app.jwt.secret}") String secret,
            @Value("${app.jwt.access-expiry-ms}") long accessExpiryMs,
            @Value("${app.jwt.refresh-expiry-ms}") long refreshExpiryMs) {
        this.key = Keys.hmacShaKeyFor(secret.getBytes(StandardCharsets.UTF_8));
        this.accessExpiryMs = accessExpiryMs;
        this.refreshExpiryMs = refreshExpiryMs;
    }

    /** Generates a short-lived access token for the given user. */
    public String generateAccessToken(User user) {
        return buildToken(user.getEmail(), "access", accessExpiryMs);
    }

    /** Generates a long-lived refresh token for the given user. */
    public String generateRefreshToken(User user) {
        return buildToken(user.getEmail(), "refresh", refreshExpiryMs);
    }

    /** Extracts the email (subject) from a token without validating expiry. */
    public String extractEmail(String token) {
        return parseClaims(token).getSubject();
    }

    /** Returns true if the token is valid (signature OK and not expired). */
    public boolean isTokenValid(String token) {
        try {
            Claims claims = parseClaims(token);
            return !claims.getExpiration().before(new Date());
        } catch (Exception e) {
            log.debug("Token validation failed: {}", e.getMessage());
            return false;
        }
    }

    private String buildToken(String subject, String type, long expiryMs) {
        Date now = new Date();
        return Jwts.builder()
                .subject(subject)
                .claim("type", type)
                .issuedAt(now)
                .expiration(new Date(now.getTime() + expiryMs))
                .signWith(key)
                .compact();
    }

    private Claims parseClaims(String token) {
        return Jwts.parser()
                .verifyWith(key)
                .build()
                .parseSignedClaims(token)
                .getPayload();
    }
}
