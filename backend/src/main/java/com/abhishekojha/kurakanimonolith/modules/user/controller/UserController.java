package com.abhishekojha.kurakanimonolith.modules.user.controller;

import com.abhishekojha.kurakanimonolith.modules.user.dtos.UpdateUserDto;
import com.abhishekojha.kurakanimonolith.modules.user.dtos.UserDto;
import com.abhishekojha.kurakanimonolith.modules.user.service.UserService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

@Slf4j
@RestController
@RequestMapping("/api/user")
@RequiredArgsConstructor
@Tag(name = "Users", description = "User profile and user administration endpoints.")
public class UserController {
    private final UserService userService;

    @Operation(summary = "Get all users", description = "Returns a list of all registered users.")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "List of users returned")
    })
    @GetMapping
    public ResponseEntity<List<UserDto>> getAllUsers() {
        log.debug("Received request to fetch all users");
        return ResponseEntity.ok(userService.getAllUsers());
    }

    @Operation(summary = "Get current user profile", description = "Returns the profile of the authenticated user derived from the JWT.")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "User profile returned"),
            @ApiResponse(responseCode = "401", description = "Not authenticated")
    })
    @GetMapping("/me")
    public ResponseEntity<UserDto> getCurrentUser() {
        log.debug("Received request to fetch current user profile");
        return ResponseEntity.ok(userService.getCurrentUser());
    }

    @Operation(summary = "Get user by ID (admin)", description = "Returns the profile of any user by their ID. Requires ADMIN role.")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "User profile returned"),
            @ApiResponse(responseCode = "403", description = "Access denied — ADMIN role required"),
            @ApiResponse(responseCode = "404", description = "User not found")
    })
    @PreAuthorize("hasRole('ADMIN')")
    @GetMapping("/{userId}")
    public ResponseEntity<UserDto> getUserById(@PathVariable Long userId) {
        log.debug("Received request to fetch user by id: {}", userId);
        return ResponseEntity.ok(userService.getUserById(userId));
    }

    @Operation(summary = "Update current user profile", description = "Partially updates the authenticated user's profile (display name, avatar, etc.).")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Updated user profile returned"),
            @ApiResponse(responseCode = "400", description = "Invalid request body"),
            @ApiResponse(responseCode = "401", description = "Not authenticated")
    })
    @PatchMapping("/me")
    public ResponseEntity<UserDto> updateCurrentUser(@RequestBody UpdateUserDto updateUserDto) {
        log.debug("Received request to update current user profile");
        return ResponseEntity.ok(userService.updateCurrentUser(updateUserDto));
    }

    @Operation(summary = "Delete user (admin)", description = "Permanently deletes a user account by ID. Requires ADMIN role.")
    @ApiResponses({
            @ApiResponse(responseCode = "204", description = "User deleted successfully"),
            @ApiResponse(responseCode = "403", description = "Access denied — ADMIN role required"),
            @ApiResponse(responseCode = "404", description = "User not found")
    })
    @PreAuthorize("hasRole('ADMIN')")
    @DeleteMapping("/{userId}")
    public ResponseEntity<Void> deleteUser(@PathVariable Long userId) {
        log.debug("Received request to delete user by id: {}", userId);
        userService.deleteUser(userId);
        return new ResponseEntity<>(HttpStatus.NO_CONTENT);
    }

    @PostMapping("profilePic/upload")
    public ResponseEntity<Void> uploadProfilePicture(@RequestParam("file") MultipartFile file) {

        userService.setProfilePicture(file);
        return new ResponseEntity<>(HttpStatus.OK   );
    }

}
