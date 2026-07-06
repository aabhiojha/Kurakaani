package com.abhishekojha.kurakanimonolith.modules.room_member.dto;

import com.abhishekojha.kurakanimonolith.modules.room_member.model.RoomRole;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;

@Getter
@Setter
@AllArgsConstructor
@NoArgsConstructor
public class RoomMemberDto {
    private Long roomMemberId;
    @NotNull
    private Long roomId;
    @NotNull
    private Long userId;
    private String username;
    private String profileImageUrl;
    private RoomRole roomRole;
    private LocalDateTime joinedAt;

}
