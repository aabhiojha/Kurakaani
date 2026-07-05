package com.abhishekojha.kurakanimonolith.modules.room.dto.roomMessage;

import com.abhishekojha.kurakanimonolith.modules.message.model.MessageType;
import jakarta.validation.constraints.NotNull;
import lombok.*;

import java.time.LocalDateTime;

@Getter
@Setter
@NoArgsConstructor
@ToString
public class RoomMessageDto {
    private Long id;
    private Long roomId;
    private UserinfoDto userInfo;
    private String content;
    private MessageType messageType;
    private String mediaUrl;
    private String mediaContentType;
    private String mediaFileName;
    private Boolean isEdited;
    private Boolean isDeleted;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private java.util.List<ReactionDto> reactions = new java.util.ArrayList<>();

    public RoomMessageDto(Long id, Long roomId, String content, MessageType messageType, String mediaUrl, String mediaContentType, String mediaFileName, Boolean isEdited, Boolean isDeleted, LocalDateTime createdAt, LocalDateTime updatedAt, Long userId, String username, String profileImageUrl) {
        this.id = id;
        this.roomId = roomId;
        this.content = content;
        this.messageType = messageType;
        this.mediaUrl = mediaUrl;
        this.mediaContentType = mediaContentType;
        this.mediaFileName = mediaFileName;
        this.isEdited = isEdited;
        this.isDeleted = isDeleted;
        this.createdAt = createdAt;
        this.updatedAt = updatedAt;
        this.userInfo = new UserinfoDto(userId, username, profileImageUrl);
    }
}
