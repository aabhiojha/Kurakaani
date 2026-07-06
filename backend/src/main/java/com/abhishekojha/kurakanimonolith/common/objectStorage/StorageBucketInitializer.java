package com.abhishekojha.kurakanimonolith.common.objectStorage;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.stereotype.Component;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.BucketAlreadyExistsException;
import software.amazon.awssdk.services.s3.model.BucketAlreadyOwnedByYouException;
import software.amazon.awssdk.services.s3.model.CreateBucketRequest;
import software.amazon.awssdk.services.s3.model.HeadBucketRequest;

@Component
@RequiredArgsConstructor
@Slf4j
public class StorageBucketInitializer implements ApplicationRunner {

    private static final int MAX_ATTEMPTS = 30;
    private static final long RETRY_DELAY_MS = 2000L;

    private final S3Client s3Client;

    @Value("${storage.bucket}")
    private String bucket;

    @Override
    public void run(ApplicationArguments args) throws Exception {
        for (int attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
            try {
                ensureBucketExists();
                return;
            } catch (Exception e) {
                if (attempt == MAX_ATTEMPTS) {
                    throw new IllegalStateException("Unable to initialize storage bucket " + bucket, e);
                }

                log.warn("Storage bucket {} is not ready yet (attempt {}/{}): {}", bucket, attempt, MAX_ATTEMPTS, e.getMessage());
                Thread.sleep(RETRY_DELAY_MS);
            }
        }
    }

    private void ensureBucketExists() {
        try {
            s3Client.headBucket(HeadBucketRequest.builder()
                    .bucket(bucket)
                    .build());
            log.info("Storage bucket {} is ready", bucket);
        } catch (Exception ignored) {
            try {
                s3Client.createBucket(CreateBucketRequest.builder()
                        .bucket(bucket)
                        .build());
                log.info("Created storage bucket {}", bucket);
            } catch (BucketAlreadyExistsException | BucketAlreadyOwnedByYouException alreadyExists) {
                log.info("Storage bucket {} already exists", bucket);
            }
        }
    }
}
