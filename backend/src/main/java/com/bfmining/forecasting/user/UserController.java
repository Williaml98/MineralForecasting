package com.bfmining.forecasting.user;

import com.bfmining.forecasting.common.ApiResponse;
import jakarta.validation.Valid;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

/**
 * REST controller for user management (ADMIN only) and self-service profile endpoints.
 */
@RestController
@RequestMapping("/api/users")
@RequiredArgsConstructor
public class UserController {

    private final UserService userService;

    /** Returns all users in the system (ADMIN only). */
    @GetMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<List<UserDto>>> getAllUsers() {
        return ResponseEntity.ok(ApiResponse.ok(userService.getAllUsers()));
    }

    /** Returns the currently authenticated user's own profile. */
    @GetMapping("/me")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ApiResponse<UserDto>> getMe(@AuthenticationPrincipal User currentUser) {
        return ResponseEntity.ok(ApiResponse.ok(userService.toDto(currentUser)));
    }

    /** Updates the profile picture for the currently authenticated user. */
    @PutMapping("/me/avatar")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ApiResponse<UserDto>> updateAvatar(
            @RequestBody AvatarRequest request,
            @AuthenticationPrincipal User currentUser) {
        UserDto updated = userService.updateAvatar(currentUser.getId(), request.getAvatarUrl());
        return ResponseEntity.ok(ApiResponse.ok("Avatar updated", updated));
    }

    @Data
    static class AvatarRequest {
        private String avatarUrl;
    }

    /** Creates a new user and sends credential email. */
    @PostMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<UserDto>> createUser(
            @Valid @RequestBody CreateUserRequest request,
            @AuthenticationPrincipal User admin) {
        UserDto created = userService.createUser(request, admin.getId());
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok("User created", created));
    }

    /** Deactivates a user account. */
    @PutMapping("/{id}/deactivate")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<UserDto>> deactivateUser(@PathVariable UUID id) {
        return ResponseEntity.ok(ApiResponse.ok(userService.deactivateUser(id)));
    }

    /** Reactivates a deactivated user account. */
    @PutMapping("/{id}/reactivate")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<UserDto>> reactivateUser(@PathVariable UUID id) {
        return ResponseEntity.ok(ApiResponse.ok(userService.reactivateUser(id)));
    }

    /** Changes the role of a user. */
    @PutMapping("/{id}/role")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<UserDto>> changeRole(
            @PathVariable UUID id,
            @RequestParam Role role) {
        return ResponseEntity.ok(ApiResponse.ok(userService.changeRole(id, role)));
    }

    /** Updates the display name of a user. */
    @PutMapping("/{id}/name")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<UserDto>> updateName(
            @PathVariable UUID id,
            @RequestParam String name) {
        return ResponseEntity.ok(ApiResponse.ok(userService.updateName(id, name)));
    }
}
