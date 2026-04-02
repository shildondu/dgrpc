# dgrpc - gRPC Client

桌面端 gRPC 客户端工具，支持动态解析 proto 文件并调用 gRPC 方法。

## 功能特性

- 动态导入 proto 文件，无需预编译 stub
- 服务/方法树形展示，支持搜索过滤
- 方法调用：配置地址、超时、TLS，JSON 编辑器
- 响应展示：Payload + gRPC Metadata (header/trailer)
- 连接配置管理：保存/编辑/删除/选择
- 方法方案保存：每个方法独立保存配置+请求参数
- Proto 文件管理：显示已导入文件，支持刷新/删除
- 启动自动最大化，数据持久化

## 环境要求

- Go 1.21+
- Node.js 18+
- Wails v2.12.0+

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
cd dgrpc
```

### 3. 安装前端依赖

```bash
cd frontend
npm install
cd ..
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
dgrpc/
├── main.go                 # Wails 入口
├── app.go                  # 前端 API 绑定
├── internal/
│   ├── config/config.go    # 配置持久化
│   ├── proto/parser.go     # Proto 解析
│   └── grpc/invoker.go     # gRPC 调用
├── frontend/
│   ├── src/
│   │   ├── components/     # 组件
│   │   ├── pages/          # 页面
│   │   └── stores/         # 状态管理
│   └── wailsjs/go/         # Wails 自动生成
└── build/bin/              # 构建产物
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

- **后端**: Go + Wails v2
- **前端**: React + TypeScript + Ant Design + Monaco Editor + Zustand
- **Proto**: github.com/jhump/protoreflect

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
