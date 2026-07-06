package com.abhishekojha.kurakanimonolith.modules.room.dto;

import com.abhishekojha.kurakanimonolith.modules.room.model.RoomType;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class CreateRoomRequestDto {
    @NotBlank
    @Size(max = 100)
    private String name;
    @NotNull
    @Size(max = 255)
    private String description;
    @NotNull
    private RoomType type;
}
