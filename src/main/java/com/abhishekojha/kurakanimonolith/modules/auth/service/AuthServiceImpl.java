package com.abhishekojha.kurakanimonolith.modules.auth.service;

import com.abhishekojha.kurakanimonolith.common.exception.exceptions.DuplicateResourceException;
import com.abhishekojha.kurakanimonolith.common.helpers.RandomNumbers;
import com.abhishekojha.kurakanimonolith.common.security.JwtService;
import com.abhishekojha.kurakanimonolith.common.security.SecurityUtils;
import com.abhishekojha.kurakanimonolith.modules.auth.authDTO.*;
import com.abhishekojha.kurakanimonolith.modules.auth.event.PasswordResetConfirmEvent;
import com.abhishekojha.kurakanimonolith.modules.auth.event.PasswordResetEvent;
import com.abhishekojha.kurakanimonolith.modules.auth.event.UserRegisteredEvent;
import com.abhishekojha.kurakanimonolith.modules.auth.model.PasswordResetToken;
import com.abhishekojha.kurakanimonolith.modules.auth.model.Role;
import com.abhishekojha.kurakanimonolith.modules.auth.repository.PasswordResetTokenRepository;
import com.abhishekojha.kurakanimonolith.modules.auth.repository.RoleRepository;
import com.abhishekojha.kurakanimonolith.modules.user.model.User;
import com.abhishekojha.kurakanimonolith.modules.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.http.HttpStatus;
import org.springframework.scheduling.annotation.Async;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Slf4j
@Service
@RequiredArgsConstructor
public class AuthServiceImpl implements AuthService {

    private final UserRepository userRepository;
    private final RoleRepository roleRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;
    private final AuthenticationManager authenticationManager;
    private final PasswordResetTokenRepository passwordResetTokenRepository;
    private final ApplicationEventPublisher publisher;
    private final SecurityUtils securityUtils;

    @Override
    @Transactional
    public AuthResponse register(RegisterRequest request) {
        log.debug("event=register_attempt username={}", request.getUsername());

        if (userRepository.existsByUserName(request.getUsername())) {
            log.warn("event=register_rejected reason=username_taken username={}", request.getUsername());
            throw new DuplicateResourceException("Username already exists");
        }

        if (request.getEmail() != null && userRepository.findByEmailIgnoreCase(request.getEmail()).isPresent()) {
            log.warn("event=register_rejected reason=email_taken");
            throw new DuplicateResourceException("Email already registered");
        }

        // Create new user with encoded password
        User user = new User();
        user.setUserName(request.getUsername());
        user.setEmail(request.getEmail());
        user.setPassword(passwordEncoder.encode(request.getPassword()));
        user.setEnabled(true);

        Role defaultRole = roleRepository.findByNameIgnoreCase("ROLE_USER")
                .orElseGet(() -> roleRepository.save(new Role("ROLE_USER")));
        user.getRoles().add(defaultRole);

        // Save to database
        userRepository.save(user);
        log.info("event=user_registered userId={} username={}", user.getId(), user.getUsername());

        // Generate JWT for immediate login after registration
        var jwt = jwtService.generateToken(user);

        List<String> roles = user.getRoles().stream().map(Role::getName).toList();
        publisher.publishEvent(new UserRegisteredEvent(user));
        log.debug("event=user_registered_event_published userId={}", user.getId());
        return new AuthResponse(jwt, user.getUsername(), roles);
    }

    public AuthResponse authenticate(AuthRequest request) {
        log.debug("event=authenticate_attempt username={}", request.getUsername());

        authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(
                        request.getUsername(),
                        request.getPassword()
                )
        );

        var user = userRepository.findByUserName(request.getUsername())
                .orElseThrow(() -> new UsernameNotFoundException("User not found"));

        var jwt = jwtService.generateToken(user);
        List<String> roles = user.getRoles().stream()
                .map(Role::getName)
                .toList();
        log.info("event=authenticate_success userId={} username={}", user.getId(), user.getUsername());
        return new AuthResponse(jwt, user.getUsername(), roles);
    }

    @Async
    @Transactional
    @Override
    public void password_reset(PasswordResetDTO passwordResetDTO) {
        String email = passwordResetDTO.getEmail();
        log.debug("event=password_reset_attempt email={}", email);

        User user = userRepository.findByEmailIgnoreCase(email).orElse(null);
        if (user == null) {
            log.warn("event=password_reset_ignored reason=user_not_found email={}", email);
            return;
        }

        Optional<PasswordResetToken> existingToken = passwordResetTokenRepository.findFirstByUserOrderByIdDesc(user);
        boolean isReissue = existingToken.isPresent();
        PasswordResetToken pst = existingToken.orElseGet(() -> PasswordResetToken.builder()
                .user(user)
                .build());

        pst.setToken(RandomNumbers.generateRandomNumbers());
        pst.setExpiresAt(LocalDateTime.now().plusMinutes(30));
        pst.setUsed(false);

        passwordResetTokenRepository.save(pst);
        log.info("event=password_reset_token_issued userId={} reissued={}", user.getId(), isReissue);

        publisher.publishEvent(new PasswordResetEvent(user.getEmail(), pst.getToken()));
        log.debug("event=password_reset_event_published userId={}", user.getId());
    }

    @Async
    @Transactional
    @Override
    public void password_reset_confirm(PasswordResetConfirmDTO passwordResetConfirmDTO) {
        log.debug("event=password_reset_confirm_attempt");

        PasswordResetToken token = passwordResetTokenRepository.findByToken(passwordResetConfirmDTO.getToken());
        if (token == null) {
            log.warn("event=password_reset_confirm_rejected reason=token_not_found");
            return;
        }

        if (token.getUsed()) {
            log.warn("event=password_reset_confirm_rejected reason=token_already_used userId={}", token.getUser().getId());
            return;
        }

        if (token.getExpiresAt().isBefore(LocalDateTime.now())) {
            log.warn("event=password_reset_confirm_rejected reason=token_expired userId={}", token.getUser().getId());
            return;
        }

        User user = token.getUser();
        user.setPassword(passwordEncoder.encode(passwordResetConfirmDTO.getPassword()));
        log.info("event=password_reset_confirmed userId={}", user.getId());

        publisher.publishEvent(new PasswordResetConfirmEvent(user));
        log.debug("event=password_reset_confirm_event_published userId={}", user.getId());
    }
}
