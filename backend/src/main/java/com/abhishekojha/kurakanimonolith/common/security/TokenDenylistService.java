package com.abhishekojha.kurakanimonolith.common.security;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.util.Date;

/**
 * Redis-backed revocation list for JWTs. On logout a token's {@code jti} is stored
 * with a TTL equal to the token's remaining lifetime, so it expires from Redis
 * exactly when the token itself would have expired — no unbounded growth.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class TokenDenylistService {

    private static final String KEY_PREFIX = "jwt:denylist:";

    private final StringRedisTemplate redisTemplate;

    /** Revoke a token by its {@code jti} until its original expiry. */
    public void denylist(String jti, Date expiresAt) {
        if (jti == null || jti.isBlank()) {
            return;
        }
        long ttlMillis = expiresAt.getTime() - System.currentTimeMillis();
        if (ttlMillis <= 0) {
            return; // already expired, nothing to revoke
        }
        redisTemplate.opsForValue().set(KEY_PREFIX + jti, "revoked", Duration.ofMillis(ttlMillis));
        log.debug("event=token_denylisted jti={} ttlMs={}", jti, ttlMillis);
    }

    public boolean isDenylisted(String jti) {
        if (jti == null || jti.isBlank()) {
            return false;
        }
        return Boolean.TRUE.equals(redisTemplate.hasKey(KEY_PREFIX + jti));
    }
}
