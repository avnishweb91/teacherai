package com.edu.teacherai.dto;

import java.util.List;

public class TemplateParseResponse {
    public String documentType;
    public List<TemplateField> fields;
    public boolean hasTable;
    public List<String> tableColumns;
    public DesignInfo design;

    public static class TemplateField {
        public String key;
        public String label;
        public String type; // "text" | "date" | "number" | "textarea"
    }

    public static class DesignInfo {
        public String titleText;        // main title visible in the document
        public String headerBgColor;    // hex, e.g. "#1a237e"
        public String headerTextColor;  // hex, e.g. "#ffffff"
        public String altRowBgColor;    // hex for alternating rows, empty if none
        public String borderColor;      // hex for table borders
        public String pageBgColor;      // hex for page/background color
    }
}
