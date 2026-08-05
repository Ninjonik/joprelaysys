<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## Testing board runtime

For `/testing` runtime work, follow `docs/testing-board-runtime.md`. The short version: MongoDB is the source of truth, operator actions run on the server, and the client only sends commands plus consumes board records from the MongoDB change stream.
