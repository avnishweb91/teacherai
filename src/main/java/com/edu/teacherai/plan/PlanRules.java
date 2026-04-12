package com.edu.teacherai.plan;

public class PlanRules {

    public static final int FREE_LESSON_LIMIT = 3;
    public static final int FREE_ASSESSMENT_LIMIT = 2;

    public static boolean isUnlimited(String plan) {
        return plan.equals("PRO") || plan.equals("SCHOOL");
    }
}
