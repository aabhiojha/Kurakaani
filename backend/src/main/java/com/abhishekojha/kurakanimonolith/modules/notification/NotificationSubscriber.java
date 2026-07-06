package com.abhishekojha.kurakanimonolith.modules.notification;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.connection.Message;
import org.springframework.data.redis.connection.MessageListener;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
@Slf4j
public class NotificationSubscriber implements MessageListener {

    private final SimpMessagingTemplate messagingTemplate;

    @Override
    public void onMessage(Message message, byte[] pattern) {
        String channel = new String(message.getChannel());
        String body = new String(message.getBody());

        // channel is "notifications.{username}"
        String username = channel.substring(channel.indexOf('.') + 1);

        messagingTemplate.convertAndSendToUser(username, "/queue/notifications", body);
        log.debug("Pushed notification to user={}", username);
    }
}
