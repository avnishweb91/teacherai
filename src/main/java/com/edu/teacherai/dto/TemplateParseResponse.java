package com.edu.teacherai.dto;

import java.util.List;

public class TemplateParseResponse {
    public String documentType;
    public List<TemplateField> fields;
    public boolean hasTable;
    public List<String> tableColumns;
    public List<String> tableRowHeaders; // e.g. ["Monday","Tuesday",...] for timetables
    public DesignInfo design;

    // Image-based template fields
    public String htmlTemplate;           // complete inline-styled HTML with {{key}} and <!-- ROWS:id --> markers
    public List<EditableTable> editableTables; // structured table data for image templates

    public static class TemplateField {
        public String key;
        public String label;
        public String type; // "text" | "date" | "number" | "textarea"
    }

    public static class DesignInfo {
        public String titleText;
        public String headerBgColor;
        public String headerTextColor;
        public String altRowBgColor;
        public String borderColor;
        public String pageBgColor;
    }

    public static class EditableTable {
        public String id;
        public String title;
        public List<String> columns;
        public List<List<String>> rows;
        public String cellStyle;     // inline style applied to each data cell
        public String altRowStyle;   // inline style for alternating rows (empty if none)
    }
}
