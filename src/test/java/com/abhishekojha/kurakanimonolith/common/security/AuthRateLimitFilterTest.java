package com.abhishekojha.kurakanimonolith.common.security;

import jakarta.servlet.FilterChain;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;

import static org.junit.jupiter.api.Assertions.assertEquals;

class AuthRateLimitFilterTest {

    private final AuthRateLimitFilter filter = new AuthRateLimitFilter();

    private MockHttpServletRequest authRequest(String ip) {
        MockHttpServletRequest request = new MockHttpServletRequest("POST", "/api/auth/login");
        request.setRemoteAddr(ip);
        return request;
    }

    @Test
    void allowsRequestsUpToTheLimitThenBlocks() throws Exception {
        FilterChain chain = (req, res) -> ((MockHttpServletResponse) res).setStatus(200);

        // First 10 requests from the same IP pass through the chain.
        for (int i = 0; i < 10; i++) {
            MockHttpServletResponse response = new MockHttpServletResponse();
            filter.doFilter(authRequest("10.0.0.1"), response, chain);
            assertEquals(200, response.getStatus(), "request " + i + " should be allowed");
        }

        // The 11th is rate limited and never reaches the chain.
        MockHttpServletResponse blocked = new MockHttpServletResponse();
        filter.doFilter(authRequest("10.0.0.1"), blocked, chain);
        assertEquals(429, blocked.getStatus());
    }

    @Test
    void limitsAreTrackedPerIp() throws Exception {
        FilterChain chain = (req, res) -> ((MockHttpServletResponse) res).setStatus(200);

        for (int i = 0; i < 11; i++) {
            filter.doFilter(authRequest("10.0.0.2"), new MockHttpServletResponse(), chain);
        }

        // A different IP still has a fresh bucket.
        MockHttpServletResponse other = new MockHttpServletResponse();
        filter.doFilter(authRequest("10.0.0.3"), other, chain);
        assertEquals(200, other.getStatus());
    }

    @Test
    void nonAuthPathsAreNotRateLimited() throws Exception {
        FilterChain chain = (req, res) -> ((MockHttpServletResponse) res).setStatus(200);
        MockHttpServletRequest request = new MockHttpServletRequest("GET", "/api/rooms/messages/search");
        request.setRemoteAddr("10.0.0.4");

        for (int i = 0; i < 50; i++) {
            MockHttpServletResponse response = new MockHttpServletResponse();
            filter.doFilter(request, response, chain);
            assertEquals(200, response.getStatus());
        }
    }
}
