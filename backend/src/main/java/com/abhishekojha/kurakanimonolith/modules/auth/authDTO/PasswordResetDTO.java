package com.abhishekojha.kurakanimonolith.modules.auth.authDTO;

import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class PasswordResetDTO {
    @NotNull
    private String email;
}
