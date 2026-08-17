export type Attempt = {
  timeMs: number;
  scramble: string;
};

export function formatTime(ms: number) {
  const total = ms / 1000;
  const minutes = Math.floor(total / 60);
  const seconds = total - minutes * 60;
  if (minutes === 0) {
    return seconds.toFixed(2);
  }
  return `${minutes}:${seconds.toFixed(2).padStart(5, "0")}`;
}

export function droppedIndexes(times: number[]) {
  if (times.length < 2) {
    return new Set<number>();
  }

  let minI = 0;
  let maxI = 0;
  for (let i = 1; i < times.length; i += 1) {
    if (times[i] < times[minI]) {
      minI = i;
    }
    if (times[i] > times[maxI]) {
      maxI = i;
    }
  }
  if (minI === maxI) {
    maxI = minI === 0 ? 1 : 0;
  }
  return new Set([minI, maxI]);
}

export function averageOfFive(times: number[]) {
  const dropped = droppedIndexes(times);
  let sum = 0;
  let count = 0;
  times.forEach((time, index) => {
    if (!dropped.has(index)) {
      sum += time;
      count += 1;
    }
  });
  return Math.round(sum / count);
}
