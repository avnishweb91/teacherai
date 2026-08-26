package com.edu.teacherai.repository;

import com.edu.teacherai.entity.LessonVideo;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface LessonVideoRepository extends JpaRepository<LessonVideo, Long> {
    List<LessonVideo> findByGradeAndSubjectOrderByCreatedAtDesc(String grade, String subject);
    Optional<LessonVideo> findFirstByGradeAndSubjectAndChapterOrderByCreatedAtDesc(String grade, String subject, String chapter);
}
