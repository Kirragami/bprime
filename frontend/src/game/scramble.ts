import workerUrl from "cstimer_module?url";

export type ScrambleState = {
  moves: string;
  image: string;
};

type Pending = {
  resolve: (value: string) => void;
  reject: (error: Error) => void;
};

let worker: Worker | null = null;
let msgid = 0;
const pending = new Map<number, Pending>();

function getWorker() {
  if (worker) {
    return worker;
  }

  worker = new Worker(workerUrl, { name: "cstimer" });
  worker.onmessage = (event: MessageEvent<[number, string, string]>) => {
    const [id, , value] = event.data;
    const job = pending.get(id);
    if (!job) {
      return;
    }
    pending.delete(id);
    job.resolve(value ?? "");
  };
  worker.onerror = (event) => {
    const error = new Error(event.message || "scramble worker failed");
    for (const job of pending.values()) {
      job.reject(error);
    }
    pending.clear();
    worker?.terminate();
    worker = null;
  };

  return worker;
}

function callWorker(type: string, details: unknown[] = []) {
  return new Promise<string>((resolve, reject) => {
    const id = ++msgid;
    pending.set(id, { resolve, reject });
    getWorker().postMessage([id, type, details]);
  });
}

export function warmScrambler() {
  getWorker();
}

function withSvgViewBox(svg: string) {
  if (!svg.includes("<svg") || /viewBox\s*=/.test(svg)) {
    return svg;
  }

  return svg.replace(/<svg\b([^>]*)>/, (tag, attrs: string) => {
    const width = /width="([\d.]+)"/.exec(attrs)?.[1];
    const height = /height="([\d.]+)"/.exec(attrs)?.[1];
    if (!width || !height) {
      return tag;
    }
    return `<svg${attrs} viewBox="0 0 ${width} ${height}" preserveAspectRatio="xMidYMid meet">`;
  });
}

export async function generateScramble(): Promise<ScrambleState> {
  const moves = (await callWorker("scramble", ["333"])).trim();
  const image = withSvgViewBox(await callWorker("image", [moves, "333"]));
  return { moves, image };
}
