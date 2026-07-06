package com.abhishekojha.kurakanimonolith.modules.message;

public record TypingEvent(Long userId, String userName, Boolean typing) {}
