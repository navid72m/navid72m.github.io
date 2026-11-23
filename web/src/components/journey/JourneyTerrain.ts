import { smoothstep } from "./mathUtils";

// Heights are fractions of the viewport. The long descent before departure
// and the climb into Munich stay continuous when the visitor walks back.
const PROFILE = [
  [0, 0], [2800, 0.024], [6500, -0.056], [8700, 0.035],
  [12600, -0.054], [17400, 0.062], [19000, 0.058], [21600, -0.075],
  [24700, 0.028], [26900, -0.045], [29400, 0.05], [32100, -0.048],
  [34500, 0.018], [37000, -0.014],
];

export function trailY(worldX: number, height: number) {
  let i = 1;
  while (i < PROFILE.length - 1 && worldX > PROFILE[i][0]) i++;
  const [left, start] = PROFILE[i - 1];
  const [right, end] = PROFILE[i];
  const t = smoothstep((worldX - left) / (right - left));
  return height * (0.82 + start + (end - start) * t);
}
