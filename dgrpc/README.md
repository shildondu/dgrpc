# dgrpc - gRPC Client

桌面端 gRPC 客户端工具，支持动态解析 proto 文件并调用 gRPC 方法，无需预编译 stub。

## 功能特性

- **动态 Proto 解析** — 导入 `.proto` 文件即可调用，无需 protoc 预编译
- **服务树形展示** — 左侧 Sidebar 按服务/方法层级展示，支持搜索过滤和自动展开
- **方法调用** — 地址、超时、TLS/Insecure 配置，Monaco JSON 编辑器，一键格式化
- **字段校验** — JSON→Proto 转换失败时，逐字段提示类型不匹配（如 string 传了 object）
- **响应展示** — Payload + Context 双 Tab，Context 展示 gRPC Header/Trailer Metadata
- **连接配置管理** — 保存/编辑/删除连接配置，选择后自动填充表单
- **方案保存** — 每个方法独立保存配置+请求参数，下次打开自动恢复
- **Proto 管理** — 已导入文件列表，支持刷新重新解析/删除
- **启动自动最大化**，所有数据持久化到本地

## 环境要求

- Go 1.24+
- Node.js 18+
- Wails v2 CLI (`go install github.com/wailsapp/wails/v2/cmd/wails@latest`)

## 快速开始

### 1. 安装依赖

```bash
# macOS
brew install go
brew install node

# 安装 Wails CLI
go install github.com/wailsapp/wails/v2/cmd/wails@latest
```

### 2. 克隆项目

```bash
git clone <your-repo-url>
cd dgrpc/dgrpc    # 注意：活跃代码在 dgrpc/ 子目录下
```

### 3. 安装前端依赖

```bash
cd frontend && npm install && cd ..
```

### 4. 运行开发模式

```bash
wails dev
# 或指定路径
~/go/bin/wails dev
```

### 5. 构建生产版本

```bash
wails build

# 产物位置
# macOS: build/bin/dgrpc.app
# Windows: build/bin/dgrpc.exe
# Linux: build/bin/dgrpc
```

## 项目结构

```
dgrpc/                          # 活跃代码库（根目录下有早期 Tauri 遗留，忽略即可）
├── main.go                     # Wails 入口，窗口配置
├── app.go                      # 前端 API 绑定层，所有暴露给前端的方法
├── internal/
│   ├── config/config.go        # 配置持久化（~/.dgrpc/），线程安全
│   ├── proto/parser.go         # Proto 解析 + MethodDescriptor 缓存
│   └── grpc/invoker.go         # 动态 gRPC 调用，连接池，字段校验
├── frontend/
│   ├── src/
│   │   ├── components/Sidebar.tsx   # 左侧服务树 + Proto 管理
│   │   ├── pages/
│   │   │   ├── ProtoImport.tsx      # Proto 导入页
│   │   │   ├── ServiceList.tsx      # 服务列表页
│   │   │   ├── MethodInvoke.tsx     # 方法调用页（核心）
│   │   │   └── ConfigManager.tsx    # 配置管理页
│   │   └── stores/protoStore.ts     # Zustand 状态管理
│   └── wailsjs/go/                  # Wails 自动生成的 TS 绑定
└── build/bin/                       # 构建产物
```

## 数据存储

所有数据存储在 `~/.dgrpc/` 目录：

- `configs/*.json` — 连接配置
- `proto_paths.json` — Proto 文件路径
- `method_schemes.json` — 方法调用方案

## 常用命令

```bash
# 开发模式
wails dev

# 构建
wails build

# 重新生成前端绑定（修改后端 API 后）
wails generate module

# 整理 Go 依赖
go mod tidy
```

## 技术栈

- **后端**: Go 1.24 + Wails v2.12.0
- **前端**: React 18 + TypeScript + Vite + Ant Design 5 + Monaco Editor + Zustand
- **Proto 动态解析**: [jhump/protoreflect](https://github.com/jhump/protoreflect)
- **gRPC 动态调用**: [grpcdynamic](https://github.com/jhump/protoreflect/tree/master/dynamic/grpcdynamic)

## 跨平台构建

```bash
# macOS (Apple Silicon)
wails build -platform darwin/arm64

# macOS (Intel)
wails build -platform darwin/amd64

# Windows
wails build -platform windows/amd64

# Linux
wails build -platform linux/amd64
```

## License

MIT
