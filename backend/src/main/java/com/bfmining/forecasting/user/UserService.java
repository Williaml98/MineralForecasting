package com.bfmining.forecasting.user;

import com.bfmining.forecasting.audit.AuditAction;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.beans.factory.annotation.Value;

import jakarta.mail.MessagingException;
import jakarta.mail.internet.MimeMessage;

import java.security.SecureRandom;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

/**
 * Service for user management operations (ADMIN only).
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class UserService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JavaMailSender mailSender;

    @Value("${app.mail.from}")
    private String mailFrom;

    @Value("${app.frontend.url:http://localhost:3000}")
    private String frontendUrl;

    /** Returns all users. */
    public List<UserDto> getAllUsers() {
        return userRepository.findAll().stream()
                .map(this::toDto)
                .collect(Collectors.toList());
    }

    /**
     * Creates a new user, generates a temporary password, and sends credentials via email.
     *
     * @param request  the create-user request
     * @param adminId  the ID of the admin creating the user
     * @return the created user DTO
     */
    @Transactional
    @AuditAction("USER_CREATE")
    public UserDto createUser(CreateUserRequest request, UUID adminId) {
        if (userRepository.existsByEmail(request.getEmail())) {
            throw new IllegalArgumentException("Email is already in use: " + request.getEmail());
        }

        String tempPassword = generateTemporaryPassword();

        User user = User.builder()
                .name(request.getName())
                .email(request.getEmail())
                .passwordHash(passwordEncoder.encode(tempPassword))
                .role(request.getRole())
                .active(true)
                .mustChangePassword(true)
                .createdBy(adminId)
                .build();

        user = userRepository.save(user);

        sendCredentialEmail(user, tempPassword);

        return toDto(user);
    }

    /**
     * Deactivates a user account.
     *
     * @param userId the user to deactivate
     * @return the updated user DTO
     */
    @Transactional
    @AuditAction("USER_DEACTIVATE")
    public UserDto deactivateUser(UUID userId) {
        User user = findById(userId);
        user.setActive(false);
        return toDto(userRepository.save(user));
    }

    /**
     * Reactivates a previously deactivated user account.
     *
     * @param userId the user to reactivate
     * @return the updated user DTO
     */
    @Transactional
    @AuditAction("USER_REACTIVATE")
    public UserDto reactivateUser(UUID userId) {
        User user = findById(userId);
        user.setActive(true);
        return toDto(userRepository.save(user));
    }

    /**
     * Updates the display name of a user.
     *
     * @param userId  the user to update
     * @param newName the new display name
     * @return the updated user DTO
     */
    @Transactional
    @AuditAction("USER_UPDATE_NAME")
    public UserDto updateName(UUID userId, String newName) {
        if (newName == null || newName.isBlank()) {
            throw new IllegalArgumentException("Name cannot be blank");
        }
        User user = findById(userId);
        user.setName(newName.trim());
        return toDto(userRepository.save(user));
    }

    /**
     * Changes the role of a user.
     *
     * @param userId  the user ID
     * @param newRole the new role to assign
     * @return the updated user DTO
     */
    @Transactional
    public UserDto changeRole(UUID userId, Role newRole) {
        User user = findById(userId);
        user.setRole(newRole);
        return toDto(userRepository.save(user));
    }

    // --- Helpers ---

    private User findById(UUID id) {
        return userRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("User not found: " + id));
    }

    private String generateTemporaryPassword() {
        String chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$";
        SecureRandom random = new SecureRandom();
        StringBuilder sb = new StringBuilder(12);
        for (int i = 0; i < 12; i++) {
            sb.append(chars.charAt(random.nextInt(chars.length())));
        }
        return sb.toString();
    }

    private void sendCredentialEmail(User user, String tempPassword) {
        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");
            helper.setFrom(mailFrom);
            helper.setTo(user.getEmail());
            helper.setSubject("Your BF Mining Forecasting System Account");
            helper.setText(buildEmailHtml(user, tempPassword), true);
            mailSender.send(message);
        } catch (MessagingException e) {
            log.error("Failed to send credential email to {}", user.getEmail(), e);
        }
    }

    private String buildEmailHtml(User user, String tempPassword) {
        return """
                <!DOCTYPE html>
                <html>
                <body style="font-family: Arial, sans-serif; color: #333; max-width: 600px; margin: auto;">
                  <div style="background:#1a3a5c; padding:24px; border-radius:8px 8px 0 0;">
                    <h1 style="color:#fff; margin:0; font-size:22px;">BF Mining Group — Forecasting System</h1>
                  </div>
                  <div style="padding:24px; border:1px solid #ddd; border-top:none; border-radius:0 0 8px 8px;">
                    <p>Hello <strong>%s</strong>,</p>
                    <p>An account has been created for you. Your login credentials are:</p>
                    <table style="width:100%%;border-collapse:collapse;margin:16px 0;">
                      <tr>
                        <td style="padding:8px 12px;background:#f5f5f5;font-weight:bold;">Email</td>
                        <td style="padding:8px 12px;">%s</td>
                      </tr>
                      <tr>
                        <td style="padding:8px 12px;background:#f5f5f5;font-weight:bold;">Temporary Password</td>
                        <td style="padding:8px 12px;font-family:monospace;font-size:16px;">%s</td>
                      </tr>
                    </table>
                    <p style="color:#e53e3e;"><strong>Important:</strong> You will be required to change your password on first login.</p>
                    <a href="%s/login" style="display:inline-block;background:#1a3a5c;color:#fff;padding:12px 24px;border-radius:4px;text-decoration:none;margin-top:8px;">
                      Log In Now
                    </a>
                    <p style="margin-top:24px;font-size:12px;color:#888;">
                      If you did not expect this email, please contact your system administrator.
                    </p>
                  </div>
                </body>
                </html>
                """.formatted(user.getName(), user.getEmail(), tempPassword, frontendUrl);
    }

    /**
     * Updates the profile picture for a user.
     *
     * @param userId    the user to update
     * @param avatarUrl base64 data URL of the image (e.g. "data:image/jpeg;base64,...")
     * @return the updated user DTO
     */
    @Transactional
    public UserDto updateAvatar(UUID userId, String avatarUrl) {
        User user = findById(userId);
        user.setAvatarUrl(avatarUrl);
        return toDto(userRepository.save(user));
    }

    /** Maps a User entity to its DTO representation. */
    public UserDto toDto(User user) {
        return UserDto.builder()
                .id(user.getId())
                .name(user.getName())
                .email(user.getEmail())
                .role(user.getRole())
                .active(user.isActive())
                .mustChangePassword(user.isMustChangePassword())
                .lastLogin(user.getLastLogin())
                .createdAt(user.getCreatedAt())
                .avatarUrl(user.getAvatarUrl())
                .build();
    }
}
