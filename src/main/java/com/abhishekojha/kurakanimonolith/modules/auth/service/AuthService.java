package com.abhishekojha.kurakanimonolith.modules.auth.service;


import com.abhishekojha.kurakanimonolith.modules.auth.authDTO.*;

public interface AuthService {
    AuthResponse register(RegisterRequest request);
    AuthResponse authenticate(AuthRequest request);
    void password_reset(PasswordResetDTO passwordResetDTO);
    void password_reset_confirm(PasswordResetConfirmDTO passwordResetConfirmDTO);
}
