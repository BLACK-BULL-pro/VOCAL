package com.vocal.controllers;

import com.vocal.services.MatchmakingService;
import java.security.Principal;
import org.springframework.context.event.EventListener;
import org.springframework.messaging.handler.annotation.DestinationVariable;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.stereotype.Controller;
import org.springframework.web.socket.messaging.SessionDisconnectEvent;

@Controller
public class MatchmakingController {
    private final MatchmakingService matchmaking;

    public MatchmakingController(MatchmakingService matchmaking) { this.matchmaking = matchmaking; }

    @MessageMapping("/matchmaking/search")
    public void search(@Payload SearchRequest request, Principal principal) {
        matchmaking.search(principal.getName(), request == null ? null : request.level(), request == null ? null : request.topicId());
    }

    @MessageMapping("/matchmaking/cancel")
    public void cancel(Principal principal) { matchmaking.cancel(principal.getName()); }

    @MessageMapping("/room/{roomId}")
    public void signal(@DestinationVariable String roomId, @Payload SignalRequest request, Principal principal) {
        if (request == null || request.type() == null) return;
        if ("LEAVE".equals(request.type())) matchmaking.leave(principal.getName(), roomId);
        else matchmaking.relay(principal.getName(), roomId, request.type(), request.payload());
    }

    @EventListener
    public void onDisconnect(SessionDisconnectEvent event) {
        if (event.getUser() != null) matchmaking.disconnect(event.getUser().getName());
    }

    public record SearchRequest(String level, String topicId) { }
    public record SignalRequest(String type, Object payload) { }
}
