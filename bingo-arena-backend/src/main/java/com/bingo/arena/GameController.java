package com.bingo.arena;

import org.springframework.web.bind.annotation.*;
import java.util.*;
@RestController @RequestMapping("/api") public class GameController {
 private final GameService game;private final Auth auth;public GameController(GameService game,Auth auth){this.game=game;this.auth=auth;}
 private long uid(String token){return auth.requestUser(token);}
 @PostMapping("/rooms") public Map<String,Object> create(@RequestHeader("Authorization") String token){return game.create(uid(token));}
 @PostMapping("/rooms/{code}/join") public Map<String,Object> join(@PathVariable String code,@RequestHeader("Authorization") String token){return game.join(code,uid(token));}
 @GetMapping("/rooms/{code}") public Map<String,Object> room(@PathVariable String code,@RequestHeader("Authorization") String token){return game.getRoom(code,uid(token));}
 @PostMapping("/rooms/{code}/leave") public Map<String,String> leave(@PathVariable String code,@RequestHeader("Authorization") String token){game.leave(code,uid(token));return Map.of("message","Đã rời phòng.");}
 @PostMapping("/rooms/{code}/start") public Map<String,Object> start(@PathVariable String code,@RequestHeader("Authorization") String token){return game.start(code,uid(token));}
 @GetMapping("/matches/history") public List<Map<String,Object>> history(@RequestHeader("Authorization") String token){return game.history(uid(token));}
 @GetMapping("/matches/{id}") public Map<String,Object> match(@PathVariable long id,@RequestHeader("Authorization") String token){return game.matchView(id,uid(token));}
}
