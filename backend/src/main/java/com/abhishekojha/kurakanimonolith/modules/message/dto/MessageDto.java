package com.abhishekojha.kurakanimonolith.modules.message.dto;

import com.abhishekojha.kurakanimonolith.modules.message.model.MessageType;
import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;

@Getter
@Setter
public class MessageDto {
    private Long id;
    @NotNull
    private Long senderId;
    @NotNull
    private Long roomId;
    private String content;
    private MessageType messageType;
    private String mediaUrl;
    private String mediaContentType;
    private String mediaFileName;
    private Boolean isEdited;
    private Boolean isDeleted;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

}
