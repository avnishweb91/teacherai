package com.edu.teacherai.controller;

import com.edu.teacherai.entity.SyllabusChapter;
import com.edu.teacherai.entity.User;
import com.edu.teacherai.repository.SyllabusChapterRepository;
import com.edu.teacherai.repository.UserRepository;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

@RestController
@RequestMapping("/api/syllabus")
public class SyllabusController {

    private final SyllabusChapterRepository chapterRepo;
    private final UserRepository userRepo;

    public SyllabusController(SyllabusChapterRepository chapterRepo, UserRepository userRepo) {
        this.chapterRepo = chapterRepo;
        this.userRepo = userRepo;
    }

    private Long userId(Authentication auth) {
        return userRepo.findByMobile(auth.getName())
                .map(User::getId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED));
    }

    @GetMapping
    public List<SyllabusChapter> getChapters(
            @RequestParam String grade,
            @RequestParam String board,
            Authentication auth) {
        return chapterRepo.findByUserIdAndGradeAndBoardOrderBySortOrderAscCreatedAtAsc(userId(auth), grade, board);
    }

    @GetMapping("/subjects")
    public List<String> getSubjects(
            @RequestParam String grade,
            @RequestParam String board,
            Authentication auth) {
        return chapterRepo.findSubjectsByUserIdAndGradeAndBoard(userId(auth), grade, board);
    }

    @PostMapping
    public SyllabusChapter addChapter(@RequestBody SyllabusChapter body, Authentication auth) {
        body.setId(null);
        body.setUserId(userId(auth));
        return chapterRepo.save(body);
    }

    @PostMapping("/bulk")
    @Transactional
    public List<SyllabusChapter> bulkReplace(
            @RequestParam String grade,
            @RequestParam String board,
            @RequestParam String subject,
            @RequestBody List<SyllabusChapter> chapters,
            Authentication auth) {
        Long uid = userId(auth);
        chapterRepo.deleteByUserIdAndGradeAndBoardAndSubject(uid, grade, board, subject);
        chapters.forEach(c -> { c.setId(null); c.setUserId(uid); c.setGrade(grade); c.setBoard(board); c.setSubject(subject); });
        return chapterRepo.saveAll(chapters);
    }

    @PatchMapping("/{id}/toggle")
    public SyllabusChapter toggleDone(@PathVariable Long id, Authentication auth) {
        Long uid = userId(auth);
        SyllabusChapter chapter = chapterRepo.findByIdAndUserId(id, uid)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));
        chapter.setDone(!chapter.isDone());
        return chapterRepo.save(chapter);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteChapter(@PathVariable Long id, Authentication auth) {
        Long uid = userId(auth);
        chapterRepo.findByIdAndUserId(id, uid)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));
        chapterRepo.deleteById(id);
        return ResponseEntity.noContent().build();
    }
}
