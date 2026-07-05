package com.abhishekojha.kurakanimonolith.common.exception.exceptions;

/**
 * Thrown when an object-storage operation (upload/delete) fails. Mapped to a
 * 502 Bad Gateway so callers can distinguish an upstream storage failure from a
 * generic 500, without leaking the underlying stack trace.
 */
public class FileStorageException extends RuntimeException {
    public FileStorageException(String message, Throwable cause) {
        super(message, cause);
    }
}
