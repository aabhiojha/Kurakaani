package com.abhishekojha.kurakanimonolith.modules.auth.event;

public record PasswordResetEvent(String email, Integer token) {
}
