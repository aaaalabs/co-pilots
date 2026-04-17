import { PeerConnection } from "./network/PeerConnection";
import { LeaderboardClient } from "./network/LeaderboardClient";
import { Message, Difficulty, Role } from "./network/Protocol";
import { LobbyScreen } from "./ui/LobbyScreen";
import { GameScreen } from "./ui/GameScreen";

const app = document.getElementById("app")!;
const leaderboard = new LeaderboardClient();

let lobby: LobbyScreen | null = null;
let gameScreen: GameScreen | null = null;
let peer: PeerConnection | null = null;
let isHost = false;
let currentPlayerName = "";

function showLobby(): void {
  cleanup();
  lobby = new LobbyScreen(app, {
    onSolo: handleSolo,
    onChallenge: handleChallenge,
    onCancelChallenge: handleCancelChallenge,
    onAcceptChallenge: handleAcceptChallenge,
  });
}

function cleanup(): void {
  lobby?.destroy();
  lobby = null;
  gameScreen?.destroy();
  gameScreen = null;
  peer?.destroy();
  peer = null;
  isHost = false;
}

function handleSolo(): void {
  currentPlayerName = lobby?.selectedPlayer ?? "Player";
  // Solo: always pilot (mouse takes over gunner aiming)
  startGame("pilot", lobby?.selectedDifficulty ?? "normal");
}

async function handleChallenge(): Promise<void> {
  isHost = true;
  currentPlayerName = lobby?.selectedPlayer ?? "Player";

  peer = new PeerConnection();
  peer.setHandlers({
    onMessage: handleMessage,
    onStatus: (s) => lobby?.setStatus(s),
    onDisconnect: handleDisconnect,
  });

  try {
    const peerId = await peer.initPeer();
    await leaderboard.postChallenge(currentPlayerName, peerId);
    lobby?.setWaiting(true);
    lobby?.setStatus("Warte auf Mitspieler...");
  } catch (err) {
    console.warn("Challenge create failed:", err);
    lobby?.setStatus(`Fehler: ${(err as Error).message}`);
    peer?.destroy();
    peer = null;
  }
}

function handleCancelChallenge(): void {
  leaderboard.cancelChallenge(currentPlayerName).catch(() => {});
  peer?.destroy();
  peer = null;
  lobby?.setWaiting(false);
  lobby?.setStatus("");
}

async function handleAcceptChallenge(opponent: string): Promise<void> {
  isHost = false;
  currentPlayerName = lobby?.selectedPlayer ?? "Player";

  lobby?.setStatus(`Verbinde mit ${opponent}...`);
  const opponentPeerId = await leaderboard.acceptChallenge(currentPlayerName, opponent);
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
    // Tell host we're here
    peer.send({
      type: "ready",
      player: currentPlayerName,
      role: "gunner", // placeholder; host's start message decides actual role
    });
  } catch (err) {
    console.warn("Connect failed:", err);
    lobby?.setStatus(`Verbindung fehlgeschlagen: ${(err as Error).message}`);
    peer?.destroy();
    peer = null;
  }
}

function handleMessage(msg: Message): void {
  if (msg.type === "ready" && isHost) {
    // Joiner connected. Cancel listing, send start, jump into game.
    leaderboard.cancelChallenge(currentPlayerName).catch(() => {});
    const hostRole = lobby?.selectedRole ?? "pilot";
    const difficulty = lobby?.selectedDifficulty ?? "normal";
    peer?.send({ type: "start", difficulty, hostRole });
    startGame(hostRole, difficulty);
  } else if (msg.type === "start" && !isHost) {
    // Joiner takes the opposite role.
    const myRole: Role = msg.hostRole === "pilot" ? "gunner" : "pilot";
    startGame(myRole, msg.difficulty);
  } else if (gameScreen && (msg.type === "snapshot" || msg.type === "input")) {
    gameScreen.handleNetworkMessage(msg);
  }
}

function startGame(role: Role, _difficulty: Difficulty): void {
  lobby?.destroy();
  lobby = null;
  gameScreen = new GameScreen(
    app,
    { onExit: () => showLobby() },
    role,
    peer,
    { playerName: currentPlayerName, leaderboard },
  );
}

function handleDisconnect(): void {
  lobby?.setStatus("Co-pilot disconnected");
}

showLobby();
