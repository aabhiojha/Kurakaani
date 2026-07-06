package com.abhishekojha.kurakanimonolith.modules.auth.authDTO;

import lombok.*;

import java.util.List;

@Setter
@Getter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AuthResponse {
    private String token;
    private String username;
    private List<String> roles;
}
