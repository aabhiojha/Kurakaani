package com.abhishekojha.kurakanimonolith.common.exception.exceptions;

public class UnauthorizedException extends RuntimeException {
    public UnauthorizedException(String message) {
        super(message);
    }
}
