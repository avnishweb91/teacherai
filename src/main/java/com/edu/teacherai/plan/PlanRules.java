package com.edu.teacherai.plan;

public class PlanRules {

    public static final int FREE_LESSON_LIMIT     = 3;
    public static final int FREE_ASSESSMENT_LIMIT = 2;
    public static final int FREE_NOTICE_LIMIT     = 2;
    public static final int FREE_REPORTCARD_LIMIT = 1;

    public static boolean isUnlimited(String plan) {
        return plan.equals("PRO") || plan.equals("SCHOOL");
    }

    public static int limitFor(String feature) {
        return switch (feature) {
            case "LESSON"     -> FREE_LESSON_LIMIT;
            case "ASSESSMENT" -> FREE_ASSESSMENT_LIMIT;
            case "NOTICE"     -> FREE_NOTICE_LIMIT;
            case "REPORTCARD" -> FREE_REPORTCARD_LIMIT;
            default           -> 1;
        };
    }
}
