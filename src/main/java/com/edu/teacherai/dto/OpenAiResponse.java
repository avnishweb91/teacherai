package com.edu.teacherai.dto;

import java.util.List;

@SuppressWarnings("unused")
public class OpenAiResponse {

    public List<Choice> choices;

    public static class Choice {
        public Message message;
    }

    public static class Message {
        public String role;
        public String content;
    }
}
