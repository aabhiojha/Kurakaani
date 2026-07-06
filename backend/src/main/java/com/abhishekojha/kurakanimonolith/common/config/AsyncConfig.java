package com.abhishekojha.kurakanimonolith.common.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.annotation.EnableAsync;

@Configuration
@EnableAsync
public class AsyncConfig {

    //TODO: can customize the async thread by implementing ThreadPoolTaskExecutor

}
