package com.abhishekojha.kurakanimonolith.common.redis;

import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.jspecify.annotations.Nullable;
import org.springframework.data.redis.connection.MessageListener;
import org.springframework.messaging.Message;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Component;

import java.io.IOException;

@Slf4j
@Component
@RequiredArgsConstructor
public class RedisSubscriber implements MessageListener {

    private final SimpMessagingTemplate messagingTemplate;
    private final ObjectMapper objectMapper;

    @Override
    public void onMessage(org.springframework.data.redis.connection.Message message, @Nullable byte[] pattern) {

        String channel = new String(message.getChannel());
        String patternStr = new String(pattern);
        
        log.debug("event=redis_message_received channel={} pattern={}", channel, patternStr);

        Object payload;
        try {
            payload = objectMapper.readValue(message.getBody(), Object.class);
        } catch (IOException e) {
            log.error("event=redis_message_deserialization_failed channel={}", channel, e);
            return;
        }
        // DM (user-specific)
        if (channel.startsWith("chat.dm.user.")) {
            String username = extractLastSegment(channel);
            messagingTemplate.convertAndSendToUser(username, "/queue/messages", payload);
            log.debug("event=dm_message_forwarded username={}", username);
            return;
        }

        // Group chat (broadcast)
        if (channel.startsWith("chat.group.")) {
            messagingTemplate.convertAndSend("/topic/" + channel, payload);
            log.debug("event=group_message_forwarded channel={}", channel);
            return;
        }

        // Typing events
        if (channel.startsWith("chat.typing.")) {
            String roomId = extractLastSegment(channel);
            messagingTemplate.convertAndSend("/topic/rooms/" + roomId + "/typing", payload);
            log.debug("event=typing_event_forwarded roomId={}", roomId);
            return;
        }

        // Reactions
        if (channel.startsWith("chat.reaction.")) {
            String roomId = extractLastSegment(channel);
            messagingTemplate.convertAndSend("/topic/rooms/" + roomId + "/reaction", payload);
            log.debug("event=reaction_event_forwarded roomId={}", roomId);
            return;
        }

        // Notifications
        if (channel.startsWith("notification.")) {
            String username = extractLastSegment(channel);
            messagingTemplate.convertAndSendToUser(username, "/queue/notifications", payload);
            log.debug("event=notification_forwarded username={}", username);
        }
    }

    private String extractLastSegment(String channel) {
        return channel.substring(channel.lastIndexOf(".") + 1);
    }
}
