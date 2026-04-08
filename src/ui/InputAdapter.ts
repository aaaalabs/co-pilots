import { PilotInput } from "../game/GameState";

export interface InputAdapter {
  getPilotInput(): PilotInput;
  destroy(): void;
}
