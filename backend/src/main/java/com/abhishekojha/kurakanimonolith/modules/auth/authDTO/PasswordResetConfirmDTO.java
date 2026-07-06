package com.abhishekojha.kurakanimonolith.modules.auth.authDTO;

import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class PasswordResetConfirmDTO {
    @NotNull
    private Integer token;
    @NotNull
    private String password;
}
