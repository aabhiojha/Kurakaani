package com.abhishekojha.kurakanimonolith.common.security;

import io.jsonwebtoken.JwtException;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.jspecify.annotations.NonNull;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;

@Component
@RequiredArgsConstructor
@Slf4j
public class JwtAuthenticationFilter extends OncePerRequestFilter {

    private final JwtService jwtService;
    private final UserDetailsService userDetailsService;
    private final TokenDenylistService tokenDenylistService;

    @Override
    protected void doFilterInternal(
            @NonNull HttpServletRequest request,
            @NonNull HttpServletResponse response,
            @NonNull FilterChain filterChain
    ) throws ServletException, IOException {

        // get authorization header
        final String authHeader = request.getHeader("Authorization");

        // tokens are sent as Bearer <token>
        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            log.debug("The Authorization header is invalid: {}", authHeader);
            filterChain.doFilter(request, response);
            return;
        }

        // the actual passed in token
        final String jwt = authHeader.substring(7);
        final String userName;
        try {
            // username passed in the token
            userName = jwtService.extractUsername(jwt);
            log.debug("Username extracted from the jwt: {}", userName);

            // Reject tokens that have been revoked via logout.
            if (tokenDenylistService.isDenylisted(jwtService.extractJti(jwt))) {
                log.debug("Rejected revoked (denylisted) JWT for user={}", userName);
                filterChain.doFilter(request, response);
                return;
            }
        } catch (JwtException | IllegalArgumentException exception) {
            log.debug("Invalid JWT received: {}", exception.getMessage());
            filterChain.doFilter(request, response);
            return;
        }

        if (userName != null && SecurityContextHolder.getContext().getAuthentication() == null) {
            UserDetails userDetails = this.userDetailsService.loadUserByUsername(userName);

            if (jwtService.isTokenValid(jwt, userDetails)) {
                // Create authentication token
                log.debug("JWT token is valid for user={}", userName);

                UsernamePasswordAuthenticationToken authToken = new UsernamePasswordAuthenticationToken(
                        userDetails,
                        null, // credentials are not needed as jwt has already validated the token
                        userDetails.getAuthorities()
                );

                // Attach request details
                authToken.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));

                // set the authentication in the security context
                SecurityContextHolder.getContext().setAuthentication(authToken);
                log.debug("Security context populated for user={}", userName);
            }
        }
        // Continue the filter chain
        filterChain.doFilter(request, response);
        log.debug("The filter Chain is continued");
    }
}
