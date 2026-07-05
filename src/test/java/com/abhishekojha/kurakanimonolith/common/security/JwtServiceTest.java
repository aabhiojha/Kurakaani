package com.abhishekojha.kurakanimonolith.common.security;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.security.core.userdetails.User;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.Collections;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

class JwtServiceTest {

    private JwtService jwtService;

    private UserDetails user(String username) {
        return new User(username, "irrelevant", Collections.emptyList());
    }

    @BeforeEach
    void setUp() {
        jwtService = new JwtService();
        ReflectionTestUtils.setField(jwtService, "jwtSecretKey",
                "VGhpc0lzQVN1ZmZpY2llbnRseUxvbmdTZWNyZXRLZXlGb3JIUzI1Ng==");
        ReflectionTestUtils.setField(jwtService, "jwtExpirationSeconds", 3600L);
    }

    @Test
    void generatedTokenCarriesSubjectAndUniqueJti() {
        UserDetails alice = user("alice");
        String token = jwtService.generateToken(alice);

        assertEquals("alice", jwtService.extractUsername(token));
        assertNotNull(jwtService.extractJti(token), "jti must be present for the denylist");
        assertTrue(jwtService.extractExpiration(token).getTime() > System.currentTimeMillis());

        // Each token gets its own jti so it can be revoked independently.
        String anotherToken = jwtService.generateToken(alice);
        assertFalse(jwtService.extractJti(token).equals(jwtService.extractJti(anotherToken)));
    }

    @Test
    void tokenIsValidOnlyForItsOwnSubject() {
        String token = jwtService.generateToken(user("alice"));

        assertTrue(jwtService.isTokenValid(token, user("alice")));
        assertFalse(jwtService.isTokenValid(token, user("mallory")));
    }

    @Test
    void tamperedTokenIsRejected() {
        String token = jwtService.generateToken(user("alice"));
        String tampered = token.substring(0, token.length() - 2) + "xx";

        assertFalse(jwtService.isTokenValid(tampered, user("alice")));
    }
}
