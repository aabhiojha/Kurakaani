package com.abhishekojha.kurakanimonolith.common.exception;

import com.abhishekojha.kurakanimonolith.common.exception.exceptions.BadRequestException;
import com.abhishekojha.kurakanimonolith.common.exception.exceptions.DuplicateResourceException;
import com.abhishekojha.kurakanimonolith.common.exception.exceptions.FileStorageException;
import com.abhishekojha.kurakanimonolith.common.exception.exceptions.ResourceNotFoundException;
import com.abhishekojha.kurakanimonolith.common.exception.exceptions.UnauthorizedException;
import jakarta.servlet.http.HttpServletRequest;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import java.time.LocalDateTime;
import java.util.List;

@Slf4j
@RestControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler(ResourceNotFoundException.class)
    public ResponseEntity<ErrorResponse> handleResourceNotFound(
            ResourceNotFoundException exception,
            HttpServletRequest request
    ) {
        log.warn("event=resource_not_found path={} message={}", request.getRequestURI(), exception.getMessage());
        ErrorResponse response = ErrorResponse.builder()
                .status(404)
                .error("NOT_FOUND")
                .message(exception.getMessage())
                .path(request.getRequestURI())
                .timestamp(LocalDateTime.now()).build();
        return ResponseEntity.status(HttpStatus.NOT_FOUND).body(response);
    }

    @ExceptionHandler(DuplicateResourceException.class)
    public ResponseEntity<ErrorResponse> handleDuplicateResource(
            DuplicateResourceException exception,
            HttpServletRequest request
    ) {
        log.warn("event=duplicate_resource path={} message={}", request.getRequestURI(), exception.getMessage());
        ErrorResponse response = ErrorResponse.builder()
                .status(409)
                .error("CONFLICT")
                .message(exception.getMessage())
                .path(request.getRequestURI())
                .timestamp(LocalDateTime.now()).build();
        return ResponseEntity.status(HttpStatus.CONFLICT).body(response);
    }


    @ExceptionHandler(BadRequestException.class)
    public ResponseEntity<ErrorResponse> handleBadRequest(
            BadRequestException exception,
            HttpServletRequest request
    ) {
        log.warn("event=bad_request path={} message={}", request.getRequestURI(), exception.getMessage());
        ErrorResponse response = ErrorResponse.builder()
                .status(400)
                .error("BAD_REQUEST")
                .message(exception.getMessage())
                .path(request.getRequestURI())
                .timestamp(LocalDateTime.now()).build();
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(response);
    }


    @ExceptionHandler(UnauthorizedException.class)
    public ResponseEntity<ErrorResponse> handleUnauthorized(
            UnauthorizedException exception,
            HttpServletRequest request
    ) {
        log.warn("event=unauthorized path={} message={}", request.getRequestURI(), exception.getMessage());
        ErrorResponse response = ErrorResponse.builder()
                .status(401)
                .error("UNAUTHORIZED")
                .message(exception.getMessage())
                .path(request.getRequestURI())
                .timestamp(LocalDateTime.now()).build();
        return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(response);
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ErrorResponse> handleValidation(
            MethodArgumentNotValidException exception,
            HttpServletRequest request
    ) {
        List<FieldErrorDetail> fieldErrors = exception.getBindingResult().getFieldErrors().stream()
                .map(error -> FieldErrorDetail.builder()
                        .field(error.getField())
                        .message(error.getDefaultMessage())
                        .build())
                .toList();
        log.warn("event=validation_failed path={} fieldErrorCount={}", request.getRequestURI(), fieldErrors.size());
        ErrorResponse response = ErrorResponse.builder()
                .status(400)
                .error("VALIDATION_FAILED")
                .message("Request validation failed")
                .path(request.getRequestURI())
                .fieldErrors(fieldErrors)
                .timestamp(LocalDateTime.now()).build();
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(response);
    }

    @ExceptionHandler({BadCredentialsException.class, UsernameNotFoundException.class})
    public ResponseEntity<ErrorResponse> handleBadCredentials(
            Exception exception,
            HttpServletRequest request
    ) {
        // Uniform message so login does not leak whether a username exists.
        log.warn("event=authentication_failed path={}", request.getRequestURI());
        ErrorResponse response = ErrorResponse.builder()
                .status(401)
                .error("UNAUTHORIZED")
                .message("Invalid username or password")
                .path(request.getRequestURI())
                .timestamp(LocalDateTime.now()).build();
        return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(response);
    }

    @ExceptionHandler(FileStorageException.class)
    public ResponseEntity<ErrorResponse> handleFileStorage(
            FileStorageException exception,
            HttpServletRequest request
    ) {
        log.error("event=file_storage_error path={} message={}", request.getRequestURI(), exception.getMessage(), exception);
        ErrorResponse response = ErrorResponse.builder()
                .status(502)
                .error("STORAGE_ERROR")
                .message("Failed to store the uploaded file. Please try again.")
                .path(request.getRequestURI())
                .timestamp(LocalDateTime.now()).build();
        return ResponseEntity.status(HttpStatus.BAD_GATEWAY).body(response);
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<ErrorResponse> handleGeneric(
            Exception ex,
            HttpServletRequest request) {
        log.error("event=unhandled_exception path={} error={}", request.getRequestURI(), ex.getMessage(), ex);
        ErrorResponse response = ErrorResponse.builder()
                .status(500)
                .error("INTERNAL_SERVER_ERROR")
                // Do not leak internal exception details to clients.
                .message("An unexpected error occurred")
                .path(request.getRequestURI())
                .timestamp(LocalDateTime.now()).build();
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
    }
}
