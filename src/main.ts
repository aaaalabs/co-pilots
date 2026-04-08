import { PeerConnection } from "./network/PeerConnection";
import { Message, Difficulty, Role } from "./network/Protocol";
import { LobbyScreen, LobbySettings } from "./ui/LobbyScreen";
import { GameScreen } from "./ui/GameScreen";

const app = document.getElementById("app")!;

let lobby: LobbyScreen | null = null;
let gameScreen: GameScreen | null = null;
let peer: PeerConnection | null = null;
let isHost = false;
let localSettings: LobbySettings = {
  role: "pilot",
  difficulty: "normal",
  playerName: "",
};
let remoteRole: Role | null = null;

function showLobby(): void {
  cleanup();
  lobby = new LobbyScreen(app, {
    onCreateRoom: handleCreateRoom,
    onJoinRoom: handleJoinRoom,
    onSettingsChange: handleSettingsChange,
    onStart: handleStartClick,
  });
}

function cleanup(): void {
  lobby?.destroy();
  lobby = null;
  gameScreen?.destroy();
  gameScreen = null;
  peer?.destroy();
  peer = null;
  remoteRole = null;
  isHost = false;
}

async function handleCreateRoom(): Promise<void> {
  isHost = true;
  localSettings.role = "pilot";
  peer = new PeerConnection();
  peer.setHandlers({
    onMessage: handleMessage,
    onStatus: (s) => lobby?.setStatus(s),
    onDisconnect: handleDisconnect,
  });
  try {
    const code = await peer.createRoom();
    lobby?.setRoomCode(code);
  } catch (err) {
    lobby?.setStatus(`Error: ${(err as Error).message}`);
    peer?.destroy();
    peer = null;
  }
}

async function handleJoinRoom(code: string): Promise<void> {
  isHost = false;
  localSettings.role = "gunner";
  peer = new PeerConnection();
  peer.setHandlers({
    onMessage: handleMessage,
    onStatus: (s) => lobby?.setStatus(s),
    onDisconnect: handleDisconnect,
  });
  try {
    await peer.joinRoom(code);
    lobby?.setJoined(false);
    sendReady();
  } catch (err) {
    lobby?.setStatus(`Error: ${(err as Error).message}`);
    peer?.destroy();
    peer = null;
  }
}

function handleSettingsChange(settings: LobbySettings): void {
  localSettings = settings;
  sendReady();
}

function sendReady(): void {
  if (!peer) return;
  peer.send({
    type: "ready",
    player: localSettings.playerName,
    role: localSettings.role,
  });
}

function handleMessage(msg: Message): void {
  if (msg.type === "ready") {
    remoteRole = msg.role;
    // If host sees the joiner for the first time, transition host lobby to joined
    if (isHost && lobby) {
      lobby.setJoined(true);
      // Re-send our own ready so joiner has our info
      sendReady();
    }
    lobby?.setPeerReady(true);
    if (remoteRole === localSettings.role) {
      lobby?.setStatus(`Role conflict: both are ${localSettings.role}`);
    } else {
      lobby?.setStatus(`Co-pilot ready (${msg.player || "Player"})`);
    }
  } else if (msg.type === "start") {
    handleGameStart(msg.difficulty);
  }
}

function handleStartClick(): void {
  if (!isHost || !peer) return;
  if (remoteRole === localSettings.role) {
    lobby?.setStatus("Can't start: role conflict");
    return;
  }
  peer.send({ type: "start", difficulty: localSettings.difficulty });
  handleGameStart(localSettings.difficulty);
}

function handleGameStart(_difficulty: Difficulty): void {
  lobby?.destroy();
  lobby = null;
  gameScreen = new GameScreen(app, {
    onExit: () => showLobby(),
  });
}

function handleDisconnect(): void {
  lobby?.setStatus("Co-pilot disconnected");
  lobby?.setPeerReady(false);
  remoteRole = null;
}

showLobby();
