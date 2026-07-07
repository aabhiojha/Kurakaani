package com.abhishekojha.kurakanimonolith;

import org.junit.jupiter.api.Disabled;
import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;

@Disabled("Requires Redis and MinIO; run manually with docker-compose up")
@SpringBootTest
@ActiveProfiles("test")
class KurakaniMonolithApplicationTests {

    @Test
    void contextLoads() {
    }

}
