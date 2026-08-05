import { readTestingBoardRecord, watchTestingBoardRecord } from "@/app/testing/data/testing-board-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const encoder = new TextEncoder();

function writeEvent(event: string, data: unknown) {
  return encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
}

function writeComment(comment: string) {
  return encoder.encode(`: ${comment}\n\n`);
}

export async function GET(request: Request) {
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const changeStream = await watchTestingBoardRecord();
      const initial = await readTestingBoardRecord();
      const keepAlive = setInterval(() => {
        controller.enqueue(writeComment("keepalive"));
      }, 25000);

      let closed = false;

      function close() {
        if (closed) {
          return;
        }

        closed = true;
        clearInterval(keepAlive);
        changeStream.close().catch(() => undefined);
        controller.close();
      }

      controller.enqueue(writeEvent("board", initial));

      changeStream.on("change", (change) => {
        if (!("fullDocument" in change)) {
          return;
        }

        const document = change.fullDocument;

        if (!document || closed) {
          return;
        }

        const { _id, ...record } = document;
        void _id;
        controller.enqueue(writeEvent("board", record));
      });

      changeStream.on("error", () => {
        close();
      });

      request.signal.addEventListener("abort", close);
    },
    cancel() {
      return undefined;
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
