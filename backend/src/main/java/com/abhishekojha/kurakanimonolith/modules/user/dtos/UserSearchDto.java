package com.abhishekojha.kurakanimonolith.modules.user.dtos;

import lombok.*;

import java.time.LocalDateTime;
import java.util.List;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UserSearchDto {
    private Long id;
    private String userName;
    private String profileImageUrl;
    private boolean enabled;
    private LocalDateTime createdAt;
}
