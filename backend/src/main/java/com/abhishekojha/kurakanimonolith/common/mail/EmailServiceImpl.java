package com.abhishekojha.kurakanimonolith.common.mail;

import jakarta.mail.MessagingException;
import jakarta.mail.internet.MimeMessage;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.autoconfigure.condition.ConditionalOnBean;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.ClassPathResource;
import org.springframework.mail.MailException;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.Map;

@Slf4j
@Service
@RequiredArgsConstructor
public class EmailServiceImpl implements EmailService {
    private final JavaMailSender mailSender;

    @Value("${spring.mail.username:}")
    private String sender;

    @Override
    public void sendPlainText(String to, String subject, String body) {
        log.debug("event=send_plain_text_email_attempt to={} subject={}", to, subject);
        try {
            SimpleMailMessage message = new SimpleMailMessage();
            if (sender != null && !sender.isBlank()) {
                message.setFrom(sender);
            }
            message.setTo(to);
            message.setSubject(subject);
            message.setText(body);
            mailSender.send(message);
            log.info("event=send_plain_text_email_success to={}", to);
        } catch (MailException exception) {
            log.error("event=send_plain_text_email_failed to={} error={}", to, exception.getMessage(), exception);
            throw new IllegalStateException("Failed to send email", exception);
        }
    }

    @Override
    public void sendHtml(String to, String subject, String templateName, Map<String, String> placeholders) throws MessagingException {
        log.debug("event=send_html_email_attempt to={} subject={} template={}", to, subject, templateName);
        MimeMessage message = mailSender.createMimeMessage();
        MimeMessageHelper helper = new MimeMessageHelper(message, "UTF-8");

        if (sender != null && !sender.isBlank()) {
            helper.setFrom(sender);
        }
        helper.setTo(to);
        helper.setSubject(subject);
        helper.setText(renderTemplate(templateName, placeholders), true);

        mailSender.send(message);
        log.info("event=send_html_email_success to={} template={}", to, templateName);
    }

    private String loadTemplate(String templateName) throws IOException {
        ClassPathResource resource = new ClassPathResource("templates/" + templateName);
        if (!resource.exists()) {
            throw new IOException("Email template not found: " + templateName);
        }
        return new String(resource.getInputStream().readAllBytes(), StandardCharsets.UTF_8);
    }

    private String renderTemplate(String templateName, Map<String, String> placeholders) throws MessagingException {
        try {
            String rendered = loadTemplate(templateName);
            for (Map.Entry<String, String> entry : placeholders.entrySet()) {
                rendered = rendered.replace("{{" + entry.getKey() + "}}", entry.getValue());
            }
            return rendered;
        } catch (IOException exception) {
            throw new MessagingException("Failed to load email template: " + templateName, exception);
        }
    }

}
