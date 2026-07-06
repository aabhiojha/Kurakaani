package com.abhishekojha.kurakanimonolith.modules.room.dto.roomList;

import com.abhishekojha.kurakanimonolith.modules.message.model.MessageType;
import lombok.*;

import java.time.LocalDateTime;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class RecentMessageDto {
    private Long id;
    private Long roomId;
    private String content;
    private MessageType messageType;
    private LocalDateTime sentAt;
    private MessageSenderDTO sender;

    public RecentMessageDto(Long id, Long roomId, String content, MessageType messageType, LocalDateTime sentAt, Long senderId, String senderUsername) {
        this.id = id;
        this.roomId = roomId;
        this.content = content;
        this.messageType = messageType;
        this.sentAt = sentAt;
        this.sender = new MessageSenderDTO(senderId, senderUsername);
    }
}
