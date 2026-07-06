package com.abhishekojha.kurakanimonolith.modules.friendRequest.dto;

import com.abhishekojha.kurakanimonolith.modules.friendRequest.model.enums.FriendRequestStatus;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;

@Getter
@Setter
public class FriendShipDto {
    private Long id;
    private Long requesterId;
    private String requesterName;
    private Long recipientId;
    private String recipientName;
    private FriendRequestStatus status;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
