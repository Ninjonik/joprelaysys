# Testing board runtime guidelines

Scope: these rules apply to `/testing`. The main page remains the station JSON editor.

- MongoDB is the source of truth for the testing board. The document is a 1:1 copy of the runtime board state.
- The client does not execute operator logic. It sends operator commands to server actions and listens for MongoDB change events.
- Server actions plan and write immediate state changes, and the server owns delayed state changes such as switch travel and remote lineblock responses.
- The testing UI state is read-only with respect to board pieces. Local UI-only state such as zoom/tile size is allowed.
- After MongoDB changes, the SSE subscription publishes the new board record and the client replaces its board state from that record.
- Route logic should stay simple until the model needs more: one active route at a time, BFS with early return, no conflict model yet.
- Do not add client-side optimistic board mutations for `/testing`; they will diverge on refresh and create stranded transient states.
