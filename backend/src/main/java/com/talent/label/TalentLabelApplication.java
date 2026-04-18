package com.talent.label;

import org.mybatis.spring.annotation.MapperScan;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@MapperScan("com.talent.label.mapper")
@EnableScheduling
public class TalentLabelApplication {
    public static void main(String[] args) {
        SpringApplication.run(TalentLabelApplication.class, args);
    }
}
