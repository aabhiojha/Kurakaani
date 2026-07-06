package com.abhishekojha.kurakanimonolith.modules.room.dto.roomMessage;

import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@ToString
public class UserinfoDto {
    private Long id;
    private String username;
    private String profileImageUrl;
}
