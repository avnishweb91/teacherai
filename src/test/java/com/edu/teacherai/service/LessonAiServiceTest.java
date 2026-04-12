/*
package com.edu.teacherai.service;

import com.edu.teacherai.dto.LessonRequest;
import com.theokanning.openai.service.OpenAiService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import retrofit2.HttpException;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class LessonAiServiceTest {

    @Mock
    private OpenAiService openAiService;

    @InjectMocks
    private LessonAiService lessonAiService;

    @Test
    void generateLesson_fallbackOn429() {

        LessonRequest req = new LessonRequest();
        req.setSubject("Math");
        req.setGrade("6");
        req.setTopic("Fractions");
        req.setDuration(40);

        HttpException http429 = mock(HttpException.class);
        when(http429.code()).thenReturn(429);

        when(openAiService.createCompletion(any()))
                .thenThrow(http429);

        String result = lessonAiService.generateLesson(req);

        assertNotNull(result);
        assertTrue(result.contains("Lesson"));
    }
}
*/
