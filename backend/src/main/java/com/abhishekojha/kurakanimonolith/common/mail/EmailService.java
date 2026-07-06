package com.abhishekojha.kurakanimonolith.common.mail;



import jakarta.mail.MessagingException;

import java.util.Map;

public interface EmailService {
    void sendPlainText(String to, String subject, String body);

    void sendHtml(String to, String subject, String templateName, Map<String, String> placeholders) throws MessagingException;
}
