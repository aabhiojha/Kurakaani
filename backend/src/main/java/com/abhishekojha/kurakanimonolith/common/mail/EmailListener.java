package com.abhishekojha.kurakanimonolith.common.mail;

import com.abhishekojha.kurakanimonolith.modules.auth.event.PasswordResetConfirmEvent;
import com.abhishekojha.kurakanimonolith.modules.auth.event.PasswordResetEvent;
import com.abhishekojha.kurakanimonolith.modules.auth.event.UserRegisteredEvent;
import com.abhishekojha.kurakanimonolith.modules.user.model.User;
import jakarta.mail.MessagingException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Component;

import java.util.Map;

@Slf4j
@Component
@RequiredArgsConstructor
public class EmailListener {
    private final EmailService emailService;

    @EventListener
    public void handleUserRegistered(UserRegisteredEvent event) throws MessagingException {
        User user = event.user();
        log.debug("event=welcome_email_attempt userId={} email={}", user.getId(), user.getEmail());
        emailService.sendHtml(
                user.getEmail(),
                "Welcome to the website",
                "welcome-email.html",
                Map.of("username", user.getUsername())
        );
        log.info("event=welcome_email_sent userId={}", user.getId());
    }

    @EventListener
    public void handlePasswordReset(PasswordResetEvent event) throws MessagingException {
        log.debug("event=password_reset_email_attempt email={}", event.email());
        emailService.sendHtml(
                event.email(),
                "Password update request OTP",
                "password-reset.html",
                Map.of("RESET_CODE", String.valueOf(event.token()))
        );
        log.info("event=password_reset_email_sent email={}", event.email());
    }

    @EventListener
    public void handlePasswordResetConfirmation(PasswordResetConfirmEvent event) throws MessagingException {
        User user = event.user();
        log.debug("event=password_reset_confirm_email_attempt userId={} email={}", user.getId(), user.getEmail());
        emailService.sendHtml(
                user.getEmail(),
                "Password reset successful",
                "password-reset-confimation.html",
                Map.of("username", user.getUsername())
        );
        log.info("event=password_reset_confirm_email_sent userId={}", user.getId());
    }

}
