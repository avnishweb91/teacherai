package com.edu.teacherai.dto;

public class TemplateParseRequest {
    public String fileType;      // "word" | "excel" | "image"
    public String textContent;   // extracted text for word/excel
    public String base64Image;   // base64 encoded image data (without data: prefix)
    public String mimeType;      // e.g. "image/jpeg" for image files
}
