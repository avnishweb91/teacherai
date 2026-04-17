package com.edu.teacherai;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableAsync;

@SpringBootApplication
@EnableAsync
public class TeacherAiApplication {

	public static void main(String[] args) {
		SpringApplication.run(TeacherAiApplication.class, args);
	}

}
