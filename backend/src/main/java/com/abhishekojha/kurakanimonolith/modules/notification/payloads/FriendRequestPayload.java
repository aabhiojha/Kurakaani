package com.abhishekojha.kurakanimonolith.modules.notification.payloads;

import com.abhishekojha.kurakanimonolith.modules.notification.enums.FriendRequestEvent;
import lombok.*;

@Builder
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class FriendRequestPayload {
    private String requestId;
    private FriendRequestEvent event;
    private String senderName;
    private String senderAvatar;
}
