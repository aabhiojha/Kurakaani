package com.abhishekojha.kurakanimonolith.modules.room.dto;

import lombok.*;

import java.util.List;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UpdateRoomDetails {
    private String name;
    private String description;
    private List<Long> userId;
}
