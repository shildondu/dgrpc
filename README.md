# dgrpc - gRPC Client

桌面端 gRPC 客户端工具，动态解析 proto 文件并调用 gRPC 方法，无需预编译 stub。

## 快速开始

活跃代码在 `dgrpc/` 子目录下：

```bash
cd dgrpc

# 安装前端依赖
cd frontend && npm install && cd ..

# 开发模式
~/go/bin/wails dev

# 构建生产版本（产物: dgrpc/build/bin/dgrpc.app）
~/go/bin/wails build
```

详细文档见 [dgrpc/README.md](dgrpc/README.md)。
