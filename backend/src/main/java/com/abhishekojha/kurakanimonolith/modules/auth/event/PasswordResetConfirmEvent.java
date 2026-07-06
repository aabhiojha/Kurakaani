package com.abhishekojha.kurakanimonolith.modules.auth.event;


import com.abhishekojha.kurakanimonolith.modules.user.model.User;

public record PasswordResetConfirmEvent(User user) {
}
