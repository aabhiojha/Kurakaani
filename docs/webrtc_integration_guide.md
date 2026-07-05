# Integrating Audio and Video Chat (WebRTC) in DMs

To integrate real-time audio and video chat into your Direct Messages (DMs), you should use **WebRTC** (Web Real-Time Communication). WebRTC allows peer-to-peer audio and video streaming between users in the browser.

Since your project already uses **Spring Boot with WebSockets + STOMP** (as seen in `WebSocketConfig.java`), you have a huge advantage: you can reuse your existing WebSocket connection as the **Signaling Server** for WebRTC!

Here is the step-by-step roadmap on how to implement this in your project:

---

## 1. How WebRTC and Signaling Works

WebRTC connects two browsers directly, but before they can connect, they need to know how to find each other. They do this by exchanging "Signaling Data" through a central server (your Spring Boot backend).

1. **Caller** creates an **SDP Offer** (details about media capabilities) and sends it to the Callee via STOMP.
2. **Callee** receives the Offer, creates an **SDP Answer**, and sends it back via STOMP.
3. Both sides generate **ICE Candidates** (public IP/port routing info) and exchange them via STOMP.
4. Once exchanged, the browsers establish a direct P2P connection and begin streaming video/audio.

---

## 2. Backend Implementation (Spring Boot)

Your backend simply needs to pass signaling messages between the two users.

### Step 2.1: Create Signaling DTOs
Create a generic DTO to carry WebRTC signals (Offers, Answers, and ICE Candidates).

```java
@Data
public class WebRtcSignal {
    private String type; // "offer", "answer", "ice_candidate", or "call_request"
    private String targetUsername; // The user you are calling/sending data to
    private String senderUsername;
    private Object data; // The SDP payload or ICE candidate JSON
}
```

### Step 2.2: Create a Signaling Controller
Use your existing WebSocket setup to route these messages. In a new or existing `@Controller`:

```java
@Controller
@RequiredArgsConstructor
public class WebRtcSignalingController {

    private final SimpMessagingTemplate messagingTemplate;

    @MessageMapping("/webrtc/signal")
    public void handleSignaling(WebRtcSignal signal, Principal principal) {
        signal.setSenderUsername(principal.getName());
        
        // Forward the signal to the target user's private queue
        messagingTemplate.convertAndSendToUser(
            signal.getTargetUsername(), 
            "/queue/webrtc", 
            signal
        );
    }
}
```

> [!TIP]
> You are already using `WebSocketAuthChannelInterceptor`. Since `convertAndSendToUser` relies on the `Principal`, ensure your interceptor correctly populates the user context.

---

## 3. Frontend Implementation (React / TypeScript)

On the frontend, you'll need to capture the user's camera/mic, handle the STOMP signaling, and manage the `RTCPeerConnection`.

### Step 3.1: Subscribe to the Signaling Queue
In your existing WebSocket service or hook, subscribe to the WebRTC queue:

```typescript
stompClient.subscribe('/user/queue/webrtc', (message) => {
    const signal = JSON.parse(message.body);
    handleIncomingSignal(signal); // Route to your WebRTC logic
});
```

### Step 3.2: Create a WebRTC Hook / Manager
You will need a hook to manage the `RTCPeerConnection` lifecycle. Here is a simplified flow:

```typescript
const [localStream, setLocalStream] = useState<MediaStream | null>(null);
const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
const peerConnection = useRef<RTCPeerConnection | null>(null);

// 1. Get Media Devices
const startCall = async () => {
    const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
    setLocalStream(stream);
    
    // Initialize WebRTC
    peerConnection.current = new RTCPeerConnection({
        iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] // Google's free STUN server
    });

    // Add local tracks to connection
    stream.getTracks().forEach(track => {
        peerConnection.current?.addTrack(track, stream);
    });

    // Handle incoming remote tracks
    peerConnection.current.ontrack = (event) => {
        setRemoteStream(event.streams[0]);
    };

    // Handle ICE candidates
    peerConnection.current.onicecandidate = (event) => {
        if (event.candidate) {
            sendSignal({
                type: 'ice_candidate',
                targetUsername: calleeUsername,
                data: event.candidate
            });
        }
    };

    // Create and send Offer
    const offer = await peerConnection.current.createOffer();
    await peerConnection.current.setLocalDescription(offer);
    
    sendSignal({
        type: 'offer',
        targetUsername: calleeUsername,
        data: offer
    });
};
```

### Step 3.3: Handle Incoming Signals
When you receive messages from `/user/queue/webrtc`:

```typescript
const handleIncomingSignal = async (signal) => {
    if (!peerConnection.current) {
        // Initialize RTCPeerConnection here if receiving an offer
    }

    if (signal.type === 'offer') {
        await peerConnection.current.setRemoteDescription(new RTCSessionDescription(signal.data));
        const answer = await peerConnection.current.createAnswer();
        await peerConnection.current.setLocalDescription(answer);
        
        sendSignal({
            type: 'answer',
            targetUsername: signal.senderUsername,
            data: answer
        });
    } else if (signal.type === 'answer') {
        await peerConnection.current.setRemoteDescription(new RTCSessionDescription(signal.data));
    } else if (signal.type === 'ice_candidate') {
        await peerConnection.current.addIceCandidate(new RTCIceCandidate(signal.data));
    }
};
```

### Step 3.4: Video UI Component
Finally, you need HTML `<video>` tags to display the streams. Use a `ref` to assign the streams to the tags.

```tsx
const VideoPlayer = ({ stream }: { stream: MediaStream }) => {
    const videoRef = useRef<HTMLVideoElement>(null);

    useEffect(() => {
        if (videoRef.current && stream) {
            videoRef.current.srcObject = stream;
        }
    }, [stream]);

    return <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover rounded-lg" />;
};
```

---

## 4. Production Considerations

> [!WARNING]
> While STUN servers (like `stun.l.google.com:19302`) work for simple networks, **many corporate firewalls or strict NATs block direct P2P connections**.

For a production environment, you will eventually need to deploy a **TURN server** (e.g., [Coturn](https://github.com/coturn/coturn)). A TURN server relays the media traffic when a direct P2P connection fails. You would add this to your `iceServers` array in the `RTCPeerConnection` configuration.

## Next Steps

1. Decide if you want audio-only first, or both audio and video immediately. 
2. Let me know if you would like me to start implementing the backend Signaling Controller or the frontend WebRTC connection logic!
