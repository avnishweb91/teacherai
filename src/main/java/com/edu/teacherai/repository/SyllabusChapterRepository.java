package com.edu.teacherai.repository;

import com.edu.teacherai.entity.SyllabusChapter;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.util.List;
import java.util.Optional;

public interface SyllabusChapterRepository extends JpaRepository<SyllabusChapter, Long> {
    List<SyllabusChapter> findByUserIdAndGradeAndBoardOrderBySortOrderAscCreatedAtAsc(Long userId, String grade, String board);
    Optional<SyllabusChapter> findByIdAndUserId(Long id, Long userId);

    @Modifying
    @Query("DELETE FROM SyllabusChapter c WHERE c.userId = :userId AND c.grade = :grade AND c.board = :board AND c.subject = :subject")
    void deleteByUserIdAndGradeAndBoardAndSubject(@Param("userId") Long userId,
                                                   @Param("grade") String grade,
                                                   @Param("board") String board,
                                                   @Param("subject") String subject);

    @Query("SELECT DISTINCT c.subject FROM SyllabusChapter c WHERE c.userId = :userId AND c.grade = :grade AND c.board = :board ORDER BY c.subject")
    List<String> findSubjectsByUserIdAndGradeAndBoard(@Param("userId") Long userId,
                                                      @Param("grade") String grade,
                                                      @Param("board") String board);
}
