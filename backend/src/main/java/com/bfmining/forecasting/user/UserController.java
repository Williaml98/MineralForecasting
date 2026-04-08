package com.bfmining.forecasting.user;

import com.bfmining.forecasting.common.ApiResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

/**
 * REST controller for user management (ADMIN only).
 */
@RestController
@RequestMapping("/api/users")
@PreAuthorize("hasRole('ADMIN')")
@RequiredArgsConstructor
public class UserController {

    private final UserService userService;

    /** Returns all users in the system. */
    @GetMapping
    public ResponseEntity<ApiResponse<List<UserDto>>> getAllUsers() {
        return ResponseEntity.ok(ApiResponse.ok(userService.getAllUsers()));
    }

    /** Creates a new user and sends credential email. */
    @PostMapping
    public ResponseEntity<ApiResponse<UserDto>> createUser(
            @Valid @RequestBody CreateUserRequest request,
            @AuthenticationPrincipal User admin) {
        UserDto created = userService.createUser(request, admin.getId());
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok("User created", created));
    }

    /** Deactivates a user account. */
    @PutMapping("/{id}/deactivate")
    public ResponseEntity<ApiResponse<UserDto>> deactivateUser(@PathVariable UUID id) {
        return ResponseEntity.ok(ApiResponse.ok(userService.deactivateUser(id)));
    }

    /** Changes the role of a user. */
    @PutMapping("/{id}/role")
    public ResponseEntity<ApiResponse<UserDto>> changeRole(
            @PathVariable UUID id,
            @RequestParam Role role) {
        return ResponseEntity.ok(ApiResponse.ok(userService.changeRole(id, role)));
    }
}
