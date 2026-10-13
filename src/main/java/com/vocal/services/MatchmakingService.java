package com.vocal.services;

import com.vocal.models.User;
import com.vocal.models.UserRepository;
import com.vocal.models.PartnerRating;
import com.vocal.models.PartnerRatingRepository;
import java.util.ArrayDeque;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;

@Service
public class MatchmakingService {
    private static final Set<String> LEVELS = Set.of("A1", "A2", "B1", "B2", "C1", "C2");
    private final SimpMessagingTemplate messaging;
    private final UserRepository users;
    private final PartnerRatingRepository ratings;
    private final Map<MatchKey, ArrayDeque<QueueEntry>> waitingByLevelAndTopic = new ConcurrentHashMap<>();
    private final Map<String, Set<String>> membersByRoom = new ConcurrentHashMap<>();
    private final Map<String, Set<String>> readyByRoom = new ConcurrentHashMap<>();
    private final Map<String, Set<String>> completedRoomMembers = new ConcurrentHashMap<>();
    private final Map<String, Set<String>> ratedByRoom = new ConcurrentHashMap<>();
    private final Map<String, String> roomByUser = new ConcurrentHashMap<>();
    private final Object queueLock = new Object();

    public MatchmakingService(SimpMessagingTemplate messaging, UserRepository users, PartnerRatingRepository ratings) {
        this.messaging = messaging;
        this.users = users;
        this.ratings = ratings;
    }

    public void search(String email, String requestedLevel, String requestedTopicId) {
        String level = requestedLevel == null ? "" : requestedLevel.toUpperCase();
        if (!LEVELS.contains(level)) {
            sendMatch(email, new MatchMessage("ERROR", null, false, null, null, null, "Unsupported student level."));
            return;
        }
        String topicId = requestedTopicId == null ? "" : requestedTopicId.trim();
        if (topicId.isBlank() || topicId.length() > 100 || !topicId.matches("[a-zA-Z0-9._-]+")) {
            sendMatch(email, new MatchMessage("ERROR", null, false, null, null, null, "Choose a valid conversation topic."));
            return;
        }
        synchronized (queueLock) {
            removeFromQueues(email);
            ArrayDeque<QueueEntry> queue = waitingByLevelAndTopic.computeIfAbsent(new MatchKey(level, topicId), ignored -> new ArrayDeque<>());
            QueueEntry partner = queue.pollFirst();
            while (partner != null && partner.userId().equals(email)) partner = queue.pollFirst();
            if (partner == null) {
                queue.addLast(new QueueEntry(email));
                sendMatch(email, new MatchMessage("WAITING", null, false, topicId, null, null, "Waiting for a student with your level and topic."));
                return;
            }
            String roomId = UUID.randomUUID().toString();
            membersByRoom.put(roomId, ConcurrentHashMap.newKeySet());
            membersByRoom.get(roomId).add(email);
            membersByRoom.get(roomId).add(partner.userId());
            roomByUser.put(email, roomId);
            roomByUser.put(partner.userId(), roomId);
            completedRoomMembers.put(roomId, Set.copyOf(membersByRoom.get(roomId)));
            User currentUser = users.findById(email).orElse(null);
            User partnerUser = users.findById(partner.userId()).orElse(null);
            sendMatch(partner.userId(), new MatchMessage("MATCH_FOUND", roomId, false, topicId,
                    displayName(currentUser, email), level, null));
            sendMatch(email, new MatchMessage("MATCH_FOUND", roomId, true, topicId,
                    displayName(partnerUser, partner.userId()), level, null));
        }
    }

    public void cancel(String email) {
        synchronized (queueLock) { removeFromQueues(email); }
        sendMatch(email, new MatchMessage("CANCELLED", null, false, null, null, null, null));
    }

    public void relay(String email, String roomId, String type, Object payload) {
        Set<String> members = membersByRoom.get(roomId);
        if (members == null || !members.contains(email)) return;
        if ("READY".equals(type)) {
            Set<String> ready = readyByRoom.computeIfAbsent(roomId, ignored -> ConcurrentHashMap.newKeySet());
            if (ready.add(email) && ready.size() == 2) {
                messaging.convertAndSend("/topic/room/" + roomId,
                        new RoomSignal(roomId, "ROOM_READY", null, "server"));
            }
            return;
        }
        RoomSignal signal = new RoomSignal(roomId, type, payload, email);
        messaging.convertAndSend("/topic/room/" + roomId, signal);
    }

    public void leave(String email, String roomId) {
        Set<String> members = membersByRoom.get(roomId);
        if (members == null || !members.remove(email)) return;
        roomByUser.remove(email, roomId);
        messaging.convertAndSend("/topic/room/" + roomId,
                new RoomSignal(roomId, "PARTNER_LEFT", null, email));
        members.forEach(member -> roomByUser.remove(member, roomId));
        membersByRoom.remove(roomId, members);
        readyByRoom.remove(roomId);
    }

    public void disconnect(String email) {
        cancel(email);
        String roomId = roomByUser.get(email);
        if (roomId != null) leave(email, roomId);
    }

    private void removeFromQueues(String email) {
        waitingByLevelAndTopic.values().forEach(queue -> queue.removeIf(entry -> entry.userId().equals(email)));
    }

    public void ratePartner(String raterEmail, String roomId, int score) {
        if (score < 1 || score > 5) throw new IllegalArgumentException("Rating must be between 1 and 5.");
        Set<String> participants = completedRoomMembers.get(roomId);
        if (participants == null || !participants.contains(raterEmail) || participants.size() != 2) throw new IllegalArgumentException("No matching session was found for this rating.");
        String recipientEmail = participants.stream().filter(email -> !email.equals(raterEmail)).findFirst().orElseThrow();
        Set<String> raters = ratedByRoom.computeIfAbsent(roomId, ignored -> ConcurrentHashMap.newKeySet());
        synchronized (raters) {
            if (!raters.add(raterEmail)) throw new IllegalArgumentException("You already rated this session.");
            try { ratings.save(new PartnerRating(roomId, raterEmail, recipientEmail, score)); }
            catch (RuntimeException error) { raters.remove(raterEmail); throw error; }
        }
    }

    public java.util.List<PartnerRating> receivedRatings(String email) { return ratings.findAllByRecipientEmailOrderByCreatedAtDesc(email); }
    public java.util.List<PartnerRating> givenRatings(String email) { return ratings.findAllByRaterEmailOrderByCreatedAtDesc(email); }

    private void sendMatch(String email, MatchMessage message) {
        messaging.convertAndSendToUser(email, "/queue/match", message);
    }

    private String displayName(User user, String fallback) {
        return user == null || user.getName() == null || user.getName().isBlank() ? fallback : user.getName();
    }

    public record MatchMessage(String type, String roomId, boolean initiator, String topicId,
                               String partnerName, String partnerLevel, String detail) { }
    private record QueueEntry(String userId) { }
    private record MatchKey(String level, String topicId) { }
    public record RoomSignal(String roomId, String type, Object payload, String sender) { }
}
