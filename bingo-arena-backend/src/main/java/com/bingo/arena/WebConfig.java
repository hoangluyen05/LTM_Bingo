package com.bingo.arena;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.*;
import org.springframework.web.socket.config.annotation.*;
@Configuration @EnableWebSocket public class WebConfig implements WebSocketConfigurer,WebMvcConfigurer {
 private final GameSocket socket;private final String[] origins;
 public WebConfig(GameSocket socket,@Value("${app.allowed-origins}") String origins){this.socket=socket;this.origins=origins.split(",");}
 @Override public void registerWebSocketHandlers(WebSocketHandlerRegistry registry){registry.addHandler(socket,"/ws/game").setAllowedOrigins(origins);}
 @Override public void addCorsMappings(CorsRegistry registry){registry.addMapping("/api/**").allowedOrigins(origins).allowedMethods("GET","POST","OPTIONS").allowedHeaders("Authorization","Content-Type");}
}
