package com.abhishekojha.kurakanimonolith.modules.user.service;


import com.abhishekojha.kurakanimonolith.modules.user.dtos.UpdateUserDto;
import com.abhishekojha.kurakanimonolith.modules.user.dtos.UserDto;
import jakarta.mail.Multipart;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

public interface UserService {
    List<UserDto> getAllUsers();
    UserDto getCurrentUser();
    UserDto getUserById(Long userId);
    UserDto updateCurrentUser(UpdateUserDto updateUserDto);
    void deleteUser(Long userId);
    void setProfilePicture(MultipartFile profilePicture);
}
