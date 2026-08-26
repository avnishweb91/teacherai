package com.edu.teacherai.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import software.amazon.awssdk.auth.credentials.AwsBasicCredentials;
import software.amazon.awssdk.auth.credentials.StaticCredentialsProvider;
import software.amazon.awssdk.regions.Region;
import software.amazon.awssdk.services.s3.S3Client;
import java.net.URI;

@Configuration
public class VideoStorageConfig {
    @Bean
    public S3Client videoBucketClient(
            @Value("${storage.endpoint:}") String endpoint,
            @Value("${storage.region:auto}") String region,
            @Value("${storage.access-key:}") String accessKey,
            @Value("${storage.secret-key:}") String secretKey) {
        // Keep local development bootable when Railway variables are absent. The upload
        // service rejects requests until a bucket name and real credentials are supplied.
        if (endpoint.isBlank() || accessKey.isBlank() || secretKey.isBlank()) {
            return S3Client.builder().region(Region.US_EAST_1).build();
        }
        return S3Client.builder().endpointOverride(URI.create(endpoint)).region(Region.of(region))
                .credentialsProvider(StaticCredentialsProvider.create(AwsBasicCredentials.create(accessKey, secretKey)))
                .forcePathStyle(false).build();
    }
}
