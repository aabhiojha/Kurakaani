package com.abhishekojha.kurakanimonolith.common.objectStorage;

import com.abhishekojha.kurakanimonolith.common.helpers.FileNameUtils;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;
import software.amazon.awssdk.core.sync.RequestBody;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.DeleteObjectRequest;
import software.amazon.awssdk.services.s3.model.GetObjectRequest;
import software.amazon.awssdk.services.s3.model.PutObjectRequest;
import software.amazon.awssdk.services.s3.presigner.S3Presigner;
import software.amazon.awssdk.services.s3.presigner.model.GetObjectPresignRequest;

import java.io.IOException;
import java.time.Duration;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class S3Operations {

    private final S3Client s3Client;
    private final S3Presigner s3Presigner;

    @Value("${storage.endpoint}")
    private String endpoint;

    @Value("${storage.bucket}")
    private String bucket;

    @Value("${storage.presigned-get-expiry-minutes:15}")
    private long presignedGetExpiryMinutes;

//    chat/
//        dm/
//            conversationId/
//                images/
//                files/
//        group/
//             roomId/
//                  images/
//                  files/
//        profileImages/
    // upload and return the key
    public String uploadFile(MultipartFile file, String folder) throws IOException {
        String normalizedFileName = FileNameUtils.normalize(file.getOriginalFilename());
        String key = folder + "/" + UUID.randomUUID() + "_" + normalizedFileName;
        log.debug("event=s3_upload_attempt bucket={} key={} contentType={} size={}", bucket, key, file.getContentType(), file.getSize());

        s3Client.putObject(
                PutObjectRequest.builder()
                        .bucket(bucket)
                        .key(key)
                        .contentType(file.getContentType())
                        .contentLength(file.getSize())
                        .build(),
                RequestBody.fromBytes(file.getBytes())
        );

        log.info("event=s3_upload_success bucket={} key={}", bucket, key);
        return key;
    }

    public void deleteFile(String key) {
        log.debug("event=s3_delete_attempt bucket={} key={}", bucket, key);
        s3Client.deleteObject(
                DeleteObjectRequest.builder()
                        .bucket(bucket)
                        .key(key)
                        .build()
        );
        log.info("event=s3_delete_success bucket={} key={}", bucket, key);
    }

    //    Generates a pre-signed URL valid for the given duration.
    public String getPresignedUrl(String key, Duration expiry) {
        String url = s3Presigner.presignGetObject(
                GetObjectPresignRequest.builder()
                        .signatureDuration(expiry)
                        .getObjectRequest(GetObjectRequest.builder()
                                .bucket(bucket)
                                .key(key)
                                .build())
                        .build()
        ).url().toString();

        log.debug("event=s3_presigned_url_generated bucket={} key={} expiryMinutes={}", bucket, key, expiry.toMinutes());
        return url;
    }

    public String getProfileImageAccessUrl(String key) {
        if (key == null || key.isBlank()) {
            return null;
        }

        if (key.startsWith("http://") || key.startsWith("https://")) {
            return key;
        }

        return getPresignedUrl(key, Duration.ofMinutes(presignedGetExpiryMinutes));
    }

    public String getMediaAccessUrl(String key) {
        return getProfileImageAccessUrl(key);
    }
}
