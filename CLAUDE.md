# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

dgrpc is a desktop gRPC client that dynamically parses proto files and invokes gRPC methods without pre-compiled stubs. Built with **Wails v2** (Go backend + React frontend).

## Active Codebase Location

The active Wails application lives in `dgrpc/`. The root-level `src/`, `src-tauri/`, `package.json`, and `vite.config.ts` are from an earlier Tauri attempt and are **not** the active codebase. All work should target `dgrpc/`.

## Commands

All commands run from `dgrpc/` directory:

```bash
# Dev mode (hot-reload for both Go and frontend)
~/go/bin/wails dev

# Build production binary (output: dgrpc/build/bin/dgrpc.app)
~/go/bin/wails build

# Cross-platform build
~/go/bin/wails build -platform darwin/arm64    # macOS Apple Silicon
~/go/bin/wails build -platform windows/amd64   # Windows

# Regenerate frontend bindings after modifying Go API (app.go methods)
~/go/bin/wails generate module

# Go dependency management
cd dgrpc && go mod tidy

# Frontend only (inside dgrpc/frontend/)
cd dgrpc/frontend && npm install
cd dgrpc/frontend && npm run build
```

No test or lint commands exist currently.

## Architecture

### Backend → Frontend Bridge

Wails auto-generates TypeScript bindings in `dgrpc/frontend/wailsjs/go/` from Go struct methods on `App`. When you add/modify a method in `app.go`, run `wails generate module` to update the frontend bindings. Frontend calls like `ImportProto(path)` are proxied to `App.ImportProto()`.

### Go Backend (`dgrpc/`)

- **`app.go`** — Wails binding layer. All methods exposed to frontend are defined here. Delegates to internal packages.
- **`internal/proto/parser.go`** — Proto file parsing via `jhump/protoreflect`. Caches `FileDescriptor` and `MethodDescriptor` (key: `ServiceName.MethodName`). The cache is critical — `Invoker` depends on cached descriptors to make gRPC calls.
- **`internal/grpc/invoker.go`** — Dynamic gRPC invocation via `grpcdynamic.NewStub`. Caches gRPC connections by address+TLS config. Includes field-level JSON→Proto validation error reporting.
- **`internal/config/config.go`** — All persistence to `~/.dgrpc/`: connection configs (`configs/*.json`), proto paths (`proto_paths.json`), method schemes (`method_schemes.json`). Thread-safe via `sync.RWMutex`.

### React Frontend (`dgrpc/frontend/src/`)

- **`stores/protoStore.ts`** — Zustand store. Two stores: `useProtoStore` (services, messages, proto paths) and `useConfigStore` (connection configs). `loadSavedProtos()` runs on app startup to re-parse all saved proto paths.
- **`components/Sidebar.tsx`** — Service tree with search, proto file management (import/refresh/delete).
- **`pages/MethodInvoke.tsx`** — Core invocation page: config selection, address/TLS/timeout, Monaco JSON editor, response display (Payload + Header/Trailer tabs), scheme save/restore per method.
- **Routing** (`App.tsx`): `/` ProtoImport, `/services` ServiceList, `/invoke/:serviceName/:methodName` MethodInvoke, `/config` ConfigManager.

### Wails Constraints

- No `localStorage` — all persistence must go through Go backend
- `json.RawMessage` and `[]byte` don't work in Wails bindings — use `string` instead
- `MethodDescriptor` cache in `Parser` must be populated before `Invoker` can work; if descriptors are missing, the user must re-import the proto file
