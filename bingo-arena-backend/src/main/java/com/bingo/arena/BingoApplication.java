package com.bingo.arena;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableScheduling
public class BingoApplication {
    public static void main(String[] args) {
        SpringApplication.run(BingoApplication.class, args);
    }
}
