package com.abhishekojha.kurakanimonolith.modules.user.service;

import com.abhishekojha.kurakanimonolith.common.exception.exceptions.ResourceNotFoundException;
import com.abhishekojha.kurakanimonolith.common.helpers.FileNameUtils;
import com.abhishekojha.kurakanimonolith.common.objectStorage.S3Operations;
import com.abhishekojha.kurakanimonolith.modules.auth.model.Role;
import com.abhishekojha.kurakanimonolith.modules.user.dtos.UpdateUserDto;
import com.abhishekojha.kurakanimonolith.modules.user.dtos.UserDto;
import com.abhishekojha.kurakanimonolith.modules.user.model.User;
import com.abhishekojha.kurakanimonolith.modules.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

@Slf4j
@RequiredArgsConstructor
@Service
public class UserServiceImpl implements UserService {
    private final UserRepository userRepository;
    private final S3Operations s3Operations;

    @Override
    @Transactional(readOnly = true)
    public List<UserDto> getAllUsers() {
        log.debug("event=get_all_users_attempt");
        List<UserDto> users = userRepository.findAll().stream()
                .map(this::toDto)
                .toList();
        log.info("event=get_all_users_done count={}", users.size());
        return users;
    }

    @Override
    @Transactional(readOnly = true)
    public UserDto getCurrentUser() {
        User user = getAuthenticatedUser();
        log.debug("event=get_current_user userId={}", user.getId());
        return toDto(user);
    }

    @Override
    @Transactional(readOnly = true)
    public UserDto getUserById(Long userId) {
        log.debug("event=get_user_by_id_attempt userId={}", userId);
        return toDto(findUserById(userId));
    }

    @Override
    @Transactional
    public UserDto updateCurrentUser(UpdateUserDto updateUserDto) {
        User user = getAuthenticatedUser();
        log.debug("event=update_user_attempt userId={}", user.getId());

        if (updateUserDto.getUserName() != null && !updateUserDto.getUserName().isBlank()) {
            userRepository.findByUserName(updateUserDto.getUserName())
                    .filter(existingUser -> !existingUser.getId().equals(user.getId()))
                    .ifPresent(existingUser -> {
                        log.warn("event=update_user_rejected reason=username_taken userId={} username={}", user.getId(), updateUserDto.getUserName());
                        throw new IllegalArgumentException("Username already exists.");
                    });
            user.setUserName(updateUserDto.getUserName());
        }

        if (updateUserDto.getEmail() != null && !updateUserDto.getEmail().isBlank()) {
            userRepository.findByEmailIgnoreCase(updateUserDto.getEmail())
                    .filter(existingUser -> !existingUser.getId().equals(user.getId()))
                    .ifPresent(existingUser -> {
                        log.warn("event=update_user_rejected reason=email_taken userId={} email={}", user.getId(), updateUserDto.getEmail());
                        throw new IllegalArgumentException("Email already exists.");
                    });
            user.setEmail(updateUserDto.getEmail());
        }

        User savedUser = userRepository.save(user);
        log.info("event=update_user_success userId={}", savedUser.getId());
        return toDto(savedUser);
    }

    @Override
    @Transactional
    public void deleteUser(Long userId) {
        log.debug("event=delete_user_attempt userId={}", userId);
        User user = findUserById(userId);
        userRepository.delete(user);
        log.info("event=delete_user_success userId={}", userId);
    }

    @Override
    @Transactional
    public void setProfilePicture(MultipartFile profilePicture) {
        User user = getAuthenticatedUser();
        log.debug("event=set_profile_picture_attempt userId={} contentType={} fileSize={}", user.getId(), profilePicture.getContentType(), profilePicture.getSize());
        String profilePicUrl = null;
        try {
            profilePicUrl = s3Operations.uploadFile(profilePicture, "profile");
            user.setProfileImageUrl(profilePicUrl);
            userRepository.save(user);
            log.info("event=set_profile_picture_success userId={} mediaKey={}", user.getId(), profilePicUrl);
        } catch (Exception e) {
            log.error("event=set_profile_picture_failed userId={} error={}", user.getId(), e.getMessage(), e);
            if (profilePicUrl != null) {
                s3Operations.deleteFile(profilePicUrl);
                log.debug("event=profile_picture_upload_rolled_back userId={} mediaKey={}", user.getId(), profilePicUrl);
            }
            throw new RuntimeException("Failed to upload profile picture", e);
        }
    }

    private User getAuthenticatedUser() {
        User user = (User) SecurityContextHolder.getContext()
                .getAuthentication()
                .getPrincipal();
        log.debug("event=authenticated_user_resolved userId={}", user.getId());
        return user;
    }

    private User findUserById(Long userId) {
        return userRepository.findById(userId)
                .orElseThrow(() -> {
                    log.warn("event=user_not_found userId={}", userId);
                    return new ResourceNotFoundException("User not found with id: " + userId);
                });
    }

    private UserDto toDto(User user) {
        return UserDto.builder()
                .id(user.getId())
                .userName(user.getUsername())
                .email(user.getEmail())
                .profileImageUrl(s3Operations.getProfileImageAccessUrl(user.getProfileImageUrl()))
                .enabled(user.isEnabled())
                .roles(user.getRoles().stream().map(Role::getName).toList())
                .createdAt(user.getCreatedAt())
                .updatedAt(user.getUpdatedAt())
                .build();
    }
}
