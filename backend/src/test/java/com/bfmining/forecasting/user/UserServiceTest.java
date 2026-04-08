package com.bfmining.forecasting.user;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;

/**
 * Unit tests for {@link UserService}.
 */
@ExtendWith(MockitoExtension.class)
class UserServiceTest {

    @Mock
    private UserRepository userRepository;

    @Mock
    private JavaMailSender mailSender;

    private PasswordEncoder passwordEncoder = new BCryptPasswordEncoder();
    private UserService userService;

    @BeforeEach
    void setUp() {
        userService = new UserService(userRepository, passwordEncoder, mailSender);
        ReflectionTestUtils.setField(userService, "mailFrom", "noreply@test.com");
        ReflectionTestUtils.setField(userService, "frontendUrl", "http://localhost:3000");
    }

    @Test
    void getAllUsers_returnsAllUsersAsDtos() {
        User user = User.builder().id(UUID.randomUUID()).name("Alice").email("alice@example.com")
                .role(Role.ANALYST).active(true).build();
        when(userRepository.findAll()).thenReturn(List.of(user));

        List<UserDto> result = userService.getAllUsers();

        assertThat(result).hasSize(1);
        assertThat(result.get(0).getEmail()).isEqualTo("alice@example.com");
    }

    @Test
    void createUser_withNewEmail_savesUserAndSendsEmail() {
        CreateUserRequest req = new CreateUserRequest();
        req.setName("Bob");
        req.setEmail("bob@example.com");
        req.setRole(Role.ANALYST);

        when(userRepository.existsByEmail("bob@example.com")).thenReturn(false);
        User saved = User.builder().id(UUID.randomUUID()).name("Bob").email("bob@example.com")
                .role(Role.ANALYST).active(true).mustChangePassword(true).build();
        when(userRepository.save(any())).thenReturn(saved);
        when(mailSender.createMimeMessage()).thenReturn(
                new org.springframework.mail.javamail.MimeMessageHelper(
                        new jakarta.mail.internet.MimeMessage((jakarta.mail.Session) null)).getMimeMessage());

        // Should not throw
        assertThatNoException().isThrownBy(() -> userService.createUser(req, UUID.randomUUID()));
    }

    @Test
    void createUser_withExistingEmail_throwsIllegalArgument() {
        CreateUserRequest req = new CreateUserRequest();
        req.setName("Dup");
        req.setEmail("dup@example.com");
        req.setRole(Role.ANALYST);

        when(userRepository.existsByEmail("dup@example.com")).thenReturn(true);

        assertThatThrownBy(() -> userService.createUser(req, UUID.randomUUID()))
                .isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    void deactivateUser_setsActiveToFalse() {
        UUID id = UUID.randomUUID();
        User user = User.builder().id(id).name("Test").email("t@t.com")
                .role(Role.ANALYST).active(true).build();
        when(userRepository.findById(id)).thenReturn(Optional.of(user));
        when(userRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        UserDto dto = userService.deactivateUser(id);

        assertThat(dto.isActive()).isFalse();
    }
}
