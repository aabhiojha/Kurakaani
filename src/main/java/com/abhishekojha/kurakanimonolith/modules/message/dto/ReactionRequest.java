package com.abhishekojha.kurakanimonolith.modules.message.dto;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class ReactionRequest {
    private Long messageId;
    private String emoji;
}
