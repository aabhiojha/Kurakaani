package com.abhishekojha.kurakanimonolith.modules.room.dto;

import com.abhishekojha.kurakanimonolith.modules.message.dto.MessageDto;
import com.abhishekojha.kurakanimonolith.modules.room.model.RoomType;
import com.abhishekojha.kurakanimonolith.modules.room_member.dto.RoomMemberDto;
import com.abhishekojha.kurakanimonolith.modules.room_member.model.RoomMember;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;
import java.util.List;

@Getter
@Setter
@AllArgsConstructor
@NoArgsConstructor
public class RoomDto {

    private Long id;
    private String name;
    private String description;
    private List<RoomMemberDto> members;
    private List<MessageDto> messages;
    private RoomType type;
    @NotNull
    private Long createdById;
    @NotNull
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

}
