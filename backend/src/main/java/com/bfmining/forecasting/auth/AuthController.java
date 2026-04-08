package com.bfmining.forecasting.auth;

import com.bfmining.forecasting.common.ApiResponse;
import com.bfmining.forecasting.user.User;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

/**
 * REST controller for authentication endpoints.
 */
@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;

    /** Authenticates a user and sets httpOnly cookies. */
    @PostMapping("/login")
    public ResponseEntity<ApiResponse<LoginResponse>> login(
            @Valid @RequestBody LoginRequest request,
            HttpServletResponse response) {

        TokenPair pair = authService.login(request.getEmail(), request.getPassword());
        setTokenCookies(response, pair);

        return ResponseEntity.ok(ApiResponse.ok(LoginResponse.from(pair)));
    }

    /** Refreshes the access token using the refresh token cookie. */
    @PostMapping("/refresh")
    public ResponseEntity<ApiResponse<LoginResponse>> refresh(
            HttpServletRequest request,
            HttpServletResponse response) {

        String refreshToken = extractCookie(request, "refresh_token");
        if (refreshToken == null) {
            return ResponseEntity.status(401).body(ApiResponse.error("No refresh token"));
        }

        TokenPair pair = authService.refresh(refreshToken);
        setTokenCookies(response, pair);

        return ResponseEntity.ok(ApiResponse.ok(LoginResponse.from(pair)));
    }

    /** Clears authentication cookies to log out. */
    @PostMapping("/logout")
    public ResponseEntity<ApiResponse<Void>> logout(HttpServletResponse response) {
        clearCookie(response, "access_token");
        clearCookie(response, "refresh_token");
        return ResponseEntity.ok(ApiResponse.ok("Logged out", null));
    }

    /** Changes the authenticated user's password. */
    @PostMapping("/change-password")
    public ResponseEntity<ApiResponse<Void>> changePassword(
            @Valid @RequestBody ChangePasswordRequest request,
            @AuthenticationPrincipal User user) {

        authService.changePassword(user, request.getNewPassword());
        return ResponseEntity.ok(ApiResponse.ok("Password changed successfully", null));
    }

    // --- Helpers ---

    private void setTokenCookies(HttpServletResponse response, TokenPair pair) {
        addHttpOnlyCookie(response, "access_token", pair.getAccessToken(), 15 * 60);
        addHttpOnlyCookie(response, "refresh_token", pair.getRefreshToken(), 7 * 24 * 60 * 60);
    }

    private void addHttpOnlyCookie(HttpServletResponse response, String name, String value, int maxAge) {
        Cookie cookie = new Cookie(name, value);
        cookie.setHttpOnly(true);
        cookie.setPath("/");
        cookie.setMaxAge(maxAge);
        response.addCookie(cookie);
    }

    private void clearCookie(HttpServletResponse response, String name) {
        Cookie cookie = new Cookie(name, "");
        cookie.setHttpOnly(true);
        cookie.setPath("/");
        cookie.setMaxAge(0);
        response.addCookie(cookie);
    }

    private String extractCookie(HttpServletRequest request, String name) {
        if (request.getCookies() == null) return null;
        for (Cookie c : request.getCookies()) {
            if (name.equals(c.getName())) return c.getValue();
        }
        return null;
    }

    // --- Inner DTOs ---

    @Data
    public static class LoginRequest {
        @NotBlank private String email;
        @NotBlank private String password;
    }

    @Data
    public static class ChangePasswordRequest {
        @NotBlank private String newPassword;
    }

    @Data
    public static class LoginResponse {
        private boolean mustChangePassword;

        public static LoginResponse from(TokenPair pair) {
            LoginResponse r = new LoginResponse();
            r.mustChangePassword = pair.isMustChangePassword();
            return r;
        }
    }
}
