package com.bfmining.forecasting.user;

import com.bfmining.forecasting.common.ApiResponse;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

/**
 * REST controller exposing the currently authenticated user's own profile endpoints.
 */
@RestController
@RequestMapping("/api/users")
@RequiredArgsConstructor
public class MeController {

    private final UserService userService;

    /** Returns the profile of the currently authenticated user. */
    @GetMapping("/me")
    public ResponseEntity<ApiResponse<UserDto>> getMe(@AuthenticationPrincipal User user) {
        return ResponseEntity.ok(ApiResponse.ok(userService.toDto(user)));
    }

    /** Updates the profile picture for the currently authenticated user. */
    @PutMapping("/me/avatar")
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
}
