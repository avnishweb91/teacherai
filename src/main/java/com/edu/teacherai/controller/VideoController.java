package com.edu.teacherai.controller;

import com.edu.teacherai.entity.LessonVideo;
import com.edu.teacherai.service.VideoStorageService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import software.amazon.awssdk.core.ResponseInputStream;
import software.amazon.awssdk.services.s3.model.GetObjectResponse;
import java.io.IOException;
import java.util.List;
import java.util.Map;

@RestController
public class VideoController {
    private final VideoStorageService storage;
    public VideoController(VideoStorageService storage) { this.storage = storage; }

    @PostMapping("/api/admin/videos/upload")
    public ResponseEntity<LessonVideo> upload(@RequestParam MultipartFile file, @RequestParam String title, @RequestParam String grade, @RequestParam String subject, @RequestParam String chapter) throws IOException { return ResponseEntity.ok(storage.upload(file, title, grade, subject, chapter)); }
    @GetMapping("/api/videos")
    public List<LessonVideo> list(@RequestParam String grade, @RequestParam String subject) { return storage.list(grade, subject); }
    @GetMapping("/api/videos/chapter")
    public ResponseEntity<LessonVideo> chapter(@RequestParam String grade, @RequestParam String subject, @RequestParam String chapter) { LessonVideo video = storage.chapter(grade, subject, chapter); return video == null ? ResponseEntity.notFound().build() : ResponseEntity.ok(video); }
    @DeleteMapping("/api/admin/videos/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) { storage.delete(id); return ResponseEntity.noContent().build(); }
    @GetMapping("/api/videos/{id}/stream")
    public void stream(@PathVariable Long id, HttpServletRequest request, HttpServletResponse response) throws IOException {
        LessonVideo video = storage.get(id); String range = request.getHeader("Range");
        ResponseInputStream<GetObjectResponse> body = storage.read(video, range);
        GetObjectResponse meta = body.response(); response.setContentType(video.getContentType()); response.setHeader("Accept-Ranges", "bytes"); response.setHeader("Cache-Control", "private, max-age=3600");
        if (range != null) { response.setStatus(HttpServletResponse.SC_PARTIAL_CONTENT); response.setHeader("Content-Range", meta.contentRange()); }
        if (meta.contentLength() != null) response.setContentLengthLong(meta.contentLength());
        try (body) { body.transferTo(response.getOutputStream()); }
    }
    @ExceptionHandler({IllegalArgumentException.class, IllegalStateException.class})
    public ResponseEntity<Map<String, String>> badRequest(RuntimeException e) { return ResponseEntity.badRequest().body(Map.of("message", e.getMessage())); }
}
