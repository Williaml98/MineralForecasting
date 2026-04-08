package com.bfmining.forecasting.auth;

import com.bfmining.forecasting.user.Role;
import com.bfmining.forecasting.user.User;
import com.bfmining.forecasting.user.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.Optional;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;

/**
 * Unit tests for {@link AuthService}.
 */
@ExtendWith(MockitoExtension.class)
class AuthServiceTest {

    @Mock
    private UserRepository userRepository;

    @Mock
    private TokenService tokenService;

    private PasswordEncoder passwordEncoder = new BCryptPasswordEncoder();

    private AuthService authService;

    @BeforeEach
    void setUp() {
        authService = new AuthService(userRepository, passwordEncoder, tokenService);
    }

    @Test
    void login_withValidCredentials_returnsTokenPair() {
        String rawPassword = "Password@1";
        User user = User.builder()
                .email("test@example.com")
                .passwordHash(passwordEncoder.encode(rawPassword))
                .role(Role.ANALYST)
                .active(true)
                .mustChangePassword(false)
                .build();

        when(userRepository.findByEmail("test@example.com")).thenReturn(Optional.of(user));
        when(tokenService.generateAccessToken(user)).thenReturn("access-token");
        when(tokenService.generateRefreshToken(user)).thenReturn("refresh-token");
        when(userRepository.save(any())).thenReturn(user);

        TokenPair pair = authService.login("test@example.com", rawPassword);

        assertThat(pair.getAccessToken()).isEqualTo("access-token");
        assertThat(pair.getRefreshToken()).isEqualTo("refresh-token");
    }

    @Test
    void login_withWrongPassword_throwsBadCredentials() {
        User user = User.builder()
                .email("test@example.com")
                .passwordHash(passwordEncoder.encode("correct"))
                .role(Role.ANALYST)
                .active(true)
                .build();

        when(userRepository.findByEmail("test@example.com")).thenReturn(Optional.of(user));

        assertThatThrownBy(() -> authService.login("test@example.com", "wrong"))
                .isInstanceOf(BadCredentialsException.class);
    }

    @Test
    void login_withInactiveUser_throwsBadCredentials() {
        User user = User.builder()
                .email("test@example.com")
                .passwordHash(passwordEncoder.encode("pass"))
                .role(Role.ANALYST)
                .active(false)
                .build();

        when(userRepository.findByEmail("test@example.com")).thenReturn(Optional.of(user));

        assertThatThrownBy(() -> authService.login("test@example.com", "pass"))
                .isInstanceOf(BadCredentialsException.class);
    }

    @Test
    void changePassword_withValidPassword_updatesHash() {
        User user = User.builder()
                .email("test@example.com")
                .passwordHash(passwordEncoder.encode("old"))
                .role(Role.ANALYST)
                .active(true)
                .mustChangePassword(true)
                .build();

        when(userRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        authService.changePassword(user, "NewPass@1");

        assertThat(user.isMustChangePassword()).isFalse();
        assertThat(passwordEncoder.matches("NewPass@1", user.getPasswordHash())).isTrue();
    }

    @Test
    void changePassword_withWeakPassword_throwsIllegalArgument() {
        User user = User.builder().email("test@example.com").role(Role.ANALYST).active(true).build();

        assertThatThrownBy(() -> authService.changePassword(user, "weakpassword"))
                .isInstanceOf(IllegalArgumentException.class);
    }
}
