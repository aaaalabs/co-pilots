import { PeerConnection } from "./network/PeerConnection";
import { LeaderboardClient } from "./network/LeaderboardClient";
import { Message, Difficulty, Role } from "./network/Protocol";
import { LobbyScreen, LobbySettings } from "./ui/LobbyScreen";
import { GameScreen } from "./ui/GameScreen";

const app = document.getElementById("app")!;
const leaderboard = new LeaderboardClient();

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
    onSolo: handleSolo,
    onChallenge: handleChallenge,
    onCancelChallenge: handleCancelChallenge,
    onAcceptChallenge: handleAcceptChallenge,
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

function handleSolo(): void {
  localSettings.playerName = lobby?.selectedPlayer ?? "Player";
  handleGameStart("normal");
}

async function handleChallenge(): Promise<void> {
  isHost = true;
  localSettings.role = "pilot";
  localSettings.playerName = lobby?.selectedPlayer ?? "Player";

  peer = new PeerConnection();
  peer.setHandlers({
    onMessage: handleMessage,
    onStatus: (s) => lobby?.setStatus(s),
    onDisconnect: handleDisconnect,
  });

  try {
    const peerId = await peer.initPeer();
    await leaderboard.postChallenge(localSettings.playerName, peerId);
    lobby?.setWaiting(true);
    lobby?.setStatus("Warte auf Mitspieler...");
  } catch (err) {
    lobby?.setStatus(`Error: ${(err as Error).message}`);
    peer?.destroy();
    peer = null;
  }
}

function handleCancelChallenge(): void {
  leaderboard.cancelChallenge(localSettings.playerName).catch(() => {});
  peer?.destroy();
  peer = null;
  lobby?.setWaiting(false);
  lobby?.setStatus("");
}

async function handleAcceptChallenge(opponent: string): Promise<void> {
  isHost = false;
  localSettings.role = "gunner";
  localSettings.playerName = lobby?.selectedPlayer ?? "Player";

  const opponentPeerId = await leaderboard.acceptChallenge(localSettings.playerName, opponent);
  if (!opponentPeerId) {
    lobby?.setStatus(`${opponent} ist nicht mehr verfügbar`);
    return;
  }

  peer = new PeerConnection();
  peer.setHandlers({
    onMessage: handleMessage,
    onStatus: (s) => lobby?.setStatus(s),
    onDisconnect: handleDisconnect,
  });

  try {
    await peer.connectToPeer(opponentPeerId);
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
    if (isHost && lobby) {
      // Cancel the challenge listing when someone connects
      leaderboard.cancelChallenge(localSettings.playerName).catch(() => {});
      lobby.setJoined(true);
      sendReady();
    }
    lobby?.setPeerReady(true);
    if (remoteRole === localSettings.role) {
      lobby?.setStatus(`Rollenkonflikt: beide sind ${localSettings.role}`);
    } else {
      lobby?.setStatus(`Co-pilot bereit (${msg.player || "Player"})`);
    }
  } else if (msg.type === "start") {
    handleGameStart(msg.difficulty);
  } else if (gameScreen && (msg.type === "snapshot" || msg.type === "input")) {
    gameScreen.handleNetworkMessage(msg);
  }
}

function handleStartClick(): void {
  if (!isHost || !peer) return;
  if (remoteRole === localSettings.role) {
    lobby?.setStatus("Kann nicht starten: Rollenkonflikt");
    return;
  }
  peer.send({ type: "start", difficulty: localSettings.difficulty });
  handleGameStart(localSettings.difficulty);
}

function handleGameStart(_difficulty: Difficulty): void {
  lobby?.destroy();
  lobby = null;
  const role = localSettings.role;
  gameScreen = new GameScreen(app, {
    onExit: () => showLobby(),
  }, role, peer);
}

function handleDisconnect(): void {
  lobby?.setStatus("Co-pilot disconnected");
  lobby?.setPeerReady(false);
  remoteRole = null;
}

showLobby();
