package com.abhishekojha.kurakanimonolith.modules.auth.controller;

import com.abhishekojha.kurakanimonolith.common.security.JwtService;
import com.abhishekojha.kurakanimonolith.common.security.TokenDenylistService;
import com.abhishekojha.kurakanimonolith.modules.auth.authDTO.*;
import com.abhishekojha.kurakanimonolith.modules.auth.service.AuthServiceImpl;
import io.jsonwebtoken.JwtException;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
@Slf4j
@Tag(name = "Authentication", description = "Authentication and password recovery endpoints.")
public class AuthController {

    private final AuthServiceImpl authService;
    private final JwtService jwtService;
    private final TokenDenylistService tokenDenylistService;

    @Operation(summary = "Register a new user", description = "Creates a new user account. A verification email may be sent upon successful registration.")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Registration successful"),
            @ApiResponse(responseCode = "400", description = "Invalid request body or username/email already taken")
    })
    @PostMapping("/register")
    public ResponseEntity<AuthResponse> register(@Valid @RequestBody RegisterRequest request) {
        // Register new user and return JWT
        return ResponseEntity.ok(authService.register(request));
    }

    @Operation(summary = "Log in", description = "Authenticates a user with username and password, returning a JWT access token.")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Login successful, JWT returned"),
            @ApiResponse(responseCode = "401", description = "Invalid credentials")
    })
    @PostMapping("/login")
    public ResponseEntity<AuthResponse> authenticate(@Valid @RequestBody AuthRequest request) {
        // Authenticate and return JWT
        return ResponseEntity.ok(authService.authenticate(request));
    }

    @Operation(summary = "Request a password reset", description = "Sends a password-reset email with a one-time token to the registered address.")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Reset email sent (no-op if email is not registered)"),
            @ApiResponse(responseCode = "400", description = "Invalid request body")
    })
    @PostMapping("/password-reset")
    public ResponseEntity<?> passwordReset(@Valid @RequestBody PasswordResetDTO request) {
        authService.password_reset(request);
        return new ResponseEntity<>(HttpStatus.OK);
    }

    @Operation(summary = "Confirm password reset", description = "Validates the one-time reset token and sets the new password.")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Password updated successfully"),
            @ApiResponse(responseCode = "400", description = "Invalid or expired reset token")
    })
    @PostMapping("/password-reset-confirm")
    public ResponseEntity<?> passwordResetConfirm(@Valid @RequestBody PasswordResetConfirmDTO passwordResetConfirmDTO) {
        authService.password_reset_confirm(passwordResetConfirmDTO);
        return new ResponseEntity<>(HttpStatus.OK);
    }

    @Operation(summary = "Log out", description = "Revokes the presented JWT by adding its identifier to a server-side denylist until it expires.")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Token revoked (idempotent, always succeeds)")
    })
    @PostMapping("/logout")
    public ResponseEntity<Void> logout(@RequestHeader(value = HttpHeaders.AUTHORIZATION, required = false) String authHeader) {
        if (authHeader != null && authHeader.startsWith("Bearer ")) {
            String jwt = authHeader.substring(7);
            try {
                tokenDenylistService.denylist(jwtService.extractJti(jwt), jwtService.extractExpiration(jwt));
                log.info("event=logout_success");
            } catch (JwtException | IllegalArgumentException e) {
                // Malformed/expired token: nothing to revoke, treat as already logged out.
                log.debug("event=logout_ignored reason=invalid_token message={}", e.getMessage());
            }
        }
        return ResponseEntity.ok().build();
    }

}
