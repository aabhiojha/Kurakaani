package com.abhishekojha.kurakanimonolith.modules.notification;

import com.abhishekojha.kurakanimonolith.modules.notification.enums.NotificationType;
import lombok.*;

import java.time.Instant;

@Builder
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class NotificationMessage<T> {
    private String id;
    private NotificationType type;
    private String recipientId;
    private String senderId;
    private Instant timestamp;
    private boolean read;
    private T payload;
}
