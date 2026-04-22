package com.edu.teacherai.dto;

import java.util.List;

public class TemplateParseResponse {
    public String documentType;
    public List<TemplateField> fields;
    public boolean hasTable;
    public List<String> tableColumns;

    public static class TemplateField {
        public String key;
        public String label;
        public String type; // "text" | "date" | "number" | "textarea"
    }
}
