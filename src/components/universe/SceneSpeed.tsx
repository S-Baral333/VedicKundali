import { createContext, useContext } from "react";

export const SceneSpeedContext = createContext<number>(1);
export const useSceneSpeed = () => useContext(SceneSpeedContext);
