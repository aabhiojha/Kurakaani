package com.abhishekojha.kurakanimonolith.modules.notification.payloads;

import com.abhishekojha.kurakanimonolith.modules.notification.enums.RoomEvent;
import lombok.*;

@Builder
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class RoomPayload {
    private String roomId;
    private String roomName;
    private RoomEvent event;
    private String preview;
}
