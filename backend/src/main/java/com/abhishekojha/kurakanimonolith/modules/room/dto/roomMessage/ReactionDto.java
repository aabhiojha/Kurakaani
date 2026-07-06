package com.abhishekojha.kurakanimonolith.modules.room.dto.roomMessage;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class ReactionDto {
    private String emoji;
    private Long userId;
    private String userName;
}
