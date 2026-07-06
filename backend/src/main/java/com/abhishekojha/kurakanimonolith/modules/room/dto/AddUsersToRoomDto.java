package com.abhishekojha.kurakanimonolith.modules.room.dto;

import jakarta.validation.constraints.NotNull;
import lombok.Builder;
import lombok.Getter;
import lombok.Setter;

import java.util.ArrayList;
import java.util.List;

@Getter
@Setter
@Builder
public class AddUsersToRoomDto {
    private List<@NotNull Long> userIds;
}
