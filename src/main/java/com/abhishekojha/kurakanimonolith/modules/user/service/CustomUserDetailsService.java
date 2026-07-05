package com.abhishekojha.kurakanimonolith.modules.user.service;

import com.abhishekojha.kurakanimonolith.modules.user.model.User;
import com.abhishekojha.kurakanimonolith.modules.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class CustomUserDetailsService implements UserDetailsService {

    private final UserRepository userRepository;

    @Override
    public UserDetails loadUserByUsername(String username) throws UsernameNotFoundException {
        // Fetch roles eagerly: getAuthorities() is invoked by the auth filters after
        // the persistence session has closed, so LAZY roles would fail there.
        User user = userRepository.findWithRolesByUserName(username)
                .orElseThrow(() -> new UsernameNotFoundException("User not found"));
        return user;
    }
}
