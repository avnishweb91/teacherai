package com.edu.teacherai.service;

import com.edu.teacherai.entity.LessonVideo;
import com.edu.teacherai.repository.LessonVideoRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;
import software.amazon.awssdk.core.ResponseInputStream;
import software.amazon.awssdk.core.sync.RequestBody;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.*;
import java.io.IOException;
import java.util.List;
import java.util.UUID;
import java.util.Map;

@Service
public class VideoStorageService {
    private final LessonVideoRepository videos;
    private final S3Client s3;
    @Value("${storage.bucket-name:}") private String bucket;
    @Value("${demo.video-key:}") private String demoVideoKey;

    public VideoStorageService(LessonVideoRepository videos, S3Client s3) { this.videos = videos; this.s3 = s3; }

    public LessonVideo upload(MultipartFile file, String title, String grade, String subject, String chapter) throws IOException {
        requireStorage();
        if (file.isEmpty() || file.getContentType() == null || !file.getContentType().startsWith("video/")) throw new IllegalArgumentException("Please upload a video file");
        if (file.getSize() > 2L * 1024 * 1024 * 1024) throw new IllegalArgumentException("Video must be 2 GB or smaller");
        String safeName = file.getOriginalFilename() == null ? "lesson.mp4" : file.getOriginalFilename().replaceAll("[^a-zA-Z0-9._-]", "_");
        String key = "lessons/" + UUID.randomUUID() + "/" + safeName;
        s3.putObject(PutObjectRequest.builder().bucket(bucket).key(key).contentType(file.getContentType()).build(), RequestBody.fromInputStream(file.getInputStream(), file.getSize()));
        LessonVideo video = new LessonVideo();
        video.setTitle(title == null || title.isBlank() ? chapter : title.trim()); video.setGrade(grade); video.setSubject(subject); video.setChapter(chapter);
        video.setStorageKey(key); video.setContentType(file.getContentType()); video.setSizeBytes(file.getSize());
        return videos.save(video);
    }
    public List<LessonVideo> list(String grade, String subject) { return videos.findByGradeAndSubjectOrderByCreatedAtDesc(grade, subject); }
    public LessonVideo get(Long id) { return videos.findById(id).orElseThrow(() -> new IllegalArgumentException("Video not found")); }
    public LessonVideo chapter(String grade, String subject, String chapter) { return videos.findFirstByGradeAndSubjectAndChapterOrderByCreatedAtDesc(grade, subject, chapter).orElse(null); }
    public ResponseInputStream<GetObjectResponse> read(LessonVideo video, String range) { requireStorage(); return s3.getObject(GetObjectRequest.builder().bucket(bucket).key(video.getStorageKey()).range(range).build()); }
    public void delete(Long id) { requireStorage(); LessonVideo video = get(id); s3.deleteObject(DeleteObjectRequest.builder().bucket(bucket).key(video.getStorageKey()).build()); videos.delete(video); }
    /** Only the explicitly configured object is exposed in the public vendor demo. */
    public Map<String, String> sampleVideo() {
        requireStorage();
        if (demoVideoKey.isBlank() || !isVideoKey(demoVideoKey)) throw new IllegalStateException("Demo video is not configured");
        return Map.of("key", demoVideoKey, "title", demoVideoKey.substring(demoVideoKey.lastIndexOf('/') + 1));
    }
    public ResponseInputStream<GetObjectResponse> readKey(String key, String range) {
        requireStorage();
        if (key == null || !isVideoKey(key)) throw new IllegalArgumentException("Video not found");
        return s3.getObject(GetObjectRequest.builder().bucket(bucket).key(key).range(range).build());
    }
    public String contentTypeFor(String key) { return key.toLowerCase().endsWith(".webm") ? "video/webm" : key.toLowerCase().endsWith(".mov") ? "video/quicktime" : "video/mp4"; }
    private boolean isVideoKey(String key) { String lower = key.toLowerCase(); return lower.endsWith(".mp4") || lower.endsWith(".webm") || lower.endsWith(".mov"); }
    private void requireStorage() { if (s3 == null || bucket.isBlank()) throw new IllegalStateException("Video storage is not configured"); }
}
