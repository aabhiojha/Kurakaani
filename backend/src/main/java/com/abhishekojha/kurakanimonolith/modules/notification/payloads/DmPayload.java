package com.abhishekojha.kurakanimonolith.modules.notification.payloads;

import lombok.*;

@Builder
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class DmPayload {
    private String messageId;
    private String roomId;
    private String preview;
    private String mediaType;
}
