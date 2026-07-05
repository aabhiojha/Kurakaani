package com.abhishekojha.kurakanimonolith.common.security;

import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.extern.slf4j.Slf4j;
import org.jspecify.annotations.NonNull;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.time.LocalDateTime;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicInteger;

/**
 * Lightweight, dependency-free per-IP token-bucket rate limiter for the
 * unauthenticated auth endpoints (login / register / password-reset), which are
 * the prime targets for brute-force and account-enumeration attacks.
 *
 * <p>Buckets are held in-memory, so in a multi-instance deployment each instance
 * limits independently. For a single-instance deployment this is sufficient; a
 * distributed limiter (e.g. Redis-backed) would be the next step when scaling out.
 *
 * <p>Wired explicitly into the Spring Security chain (see {@code SecurityConfig})
 * ahead of authentication, rather than auto-registered as a servlet filter.
 */
@Slf4j
public class AuthRateLimitFilter extends OncePerRequestFilter {

    private static final String PROTECTED_PREFIX = "/api/auth/";
    private static final int MAX_REQUESTS = 10;
    private static final long WINDOW_MILLIS = 60_000L;

    private final Map<String, Window> buckets = new ConcurrentHashMap<>();
    private final ObjectMapper objectMapper = new ObjectMapper();

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        // Only rate-limit the auth endpoints; skip pre-flight requests.
        return !request.getRequestURI().startsWith(PROTECTED_PREFIX)
                || "OPTIONS".equalsIgnoreCase(request.getMethod());
    }

    @Override
    protected void doFilterInternal(
            @NonNull HttpServletRequest request,
            @NonNull HttpServletResponse response,
            @NonNull FilterChain filterChain
    ) throws ServletException, IOException {

        String clientKey = resolveClientIp(request);
        if (isRateLimited(clientKey)) {
            log.warn("event=auth_rate_limited ip={} path={}", clientKey, request.getRequestURI());
            writeTooManyRequests(request, response);
            return;
        }
        filterChain.doFilter(request, response);
    }

    private boolean isRateLimited(String clientKey) {
        long now = System.currentTimeMillis();
        Window window = buckets.compute(clientKey, (key, existing) -> {
            if (existing == null || now - existing.windowStart >= WINDOW_MILLIS) {
                return new Window(now);
            }
            return existing;
        });
        return window.count.incrementAndGet() > MAX_REQUESTS;
    }

    private String resolveClientIp(HttpServletRequest request) {
        String forwarded = request.getHeader("X-Forwarded-For");
        if (forwarded != null && !forwarded.isBlank()) {
            // First hop is the originating client.
            return forwarded.split(",")[0].trim();
        }
        return request.getRemoteAddr();
    }

    private void writeTooManyRequests(HttpServletRequest request, HttpServletResponse response) throws IOException {
        response.setStatus(HttpStatus.TOO_MANY_REQUESTS.value());
        response.setContentType(MediaType.APPLICATION_JSON_VALUE);
        response.setHeader("Retry-After", String.valueOf(WINDOW_MILLIS / 1000));
        Map<String, Object> body = Map.of(
                "status", HttpStatus.TOO_MANY_REQUESTS.value(),
                "error", "TOO_MANY_REQUESTS",
                "message", "Too many requests. Please try again later.",
                "path", request.getRequestURI(),
                "timestamp", LocalDateTime.now().toString()
        );
        objectMapper.writeValue(response.getWriter(), body);
    }

    private static final class Window {
        private final long windowStart;
        private final AtomicInteger count = new AtomicInteger(0);

        private Window(long windowStart) {
            this.windowStart = windowStart;
        }
    }
}
