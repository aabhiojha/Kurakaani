package com.abhishekojha.kurakanimonolith.common.security;

import com.abhishekojha.kurakanimonolith.common.exception.exceptions.ResourceNotFoundException;
import com.abhishekojha.kurakanimonolith.common.exception.exceptions.UnauthorizedException;
import com.abhishekojha.kurakanimonolith.modules.user.model.User;
import com.abhishekojha.kurakanimonolith.modules.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;

import java.security.Principal;

@Component
@RequiredArgsConstructor
@Slf4j
public class SecurityUtils {

    private final UserRepository userRepository;

    public User getRequestUser() {
        Authentication authentication = requireAuthentication();
        return resolveUser(authentication.getName());
    }

    public User getRequestUser(Principal principal) {
        if (principal != null) {
            return resolveUser(principal.getName());
        }

        Authentication authentication = requireAuthentication();
        return resolveUser(authentication.getName());
    }

    private Authentication requireAuthentication() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !authentication.isAuthenticated()) {
            log.warn("Security context does not contain authentication");
            throw new UnauthorizedException("The user is not authenticated.");
        }
        return authentication;
    }

    private User resolveUser(String principalName) {
        log.debug("Looking up request user by principal={}", principalName);

        User user = userRepository.findByUserName(principalName)
                .or(() -> userRepository.findByEmailIgnoreCase(principalName))
                .orElseThrow(() -> new ResourceNotFoundException("User not found."));

        log.debug("Resolved request user: id={} username={}", user.getId(), user.getUsername());
        return user;
    }
}
