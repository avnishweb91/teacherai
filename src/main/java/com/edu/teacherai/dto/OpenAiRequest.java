package com.edu.teacherai.dto;

import java.util.List;
import java.util.Map;

@SuppressWarnings("unused")
public class OpenAiRequest {

    public String model;
    public List<Map<String, String>> messages;
    public double temperature = 0.7;
    public int max_tokens = 800;
}
