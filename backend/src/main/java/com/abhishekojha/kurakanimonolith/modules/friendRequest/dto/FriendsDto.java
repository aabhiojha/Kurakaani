package com.abhishekojha.kurakanimonolith.modules.friendRequest.dto;

import com.abhishekojha.kurakanimonolith.modules.friendRequest.model.enums.FriendRequestStatus;
import lombok.*;

import java.time.LocalDateTime;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class FriendsDto {
    private Long userId;
    private String username;
    private String profilePicUrl;
}
