package main

import (
	"dgrpc/internal/config"
	"dgrpc/internal/grpc"
	"dgrpc/internal/proto"
	"embed"

	"github.com/wailsapp/wails/v2"
	"github.com/wailsapp/wails/v2/pkg/options"
	"github.com/wailsapp/wails/v2/pkg/options/assetserver"
)

//go:embed all:frontend/dist
var assets embed.FS

// App holds the application state
type App struct {
	configManager *config.Manager
	protoParser   *proto.Parser
	grpcInvoker   *grpc.Invoker
}

// NewApp creates a new App instance
func NewApp() *App {
	return &App{
		configManager: config.NewManager(),
		protoParser:   proto.NewParser(),
		grpcInvoker:   grpc.NewInvoker(),
	}
}

// ImportProto imports and parses a proto file
func (a *App) ImportProto(filePath string) (*proto.ParseResult, error) {
	return a.protoParser.ParseFile(filePath)
}

// InvokeMethod calls a gRPC method
func (a *App) InvokeMethod(req *grpc.InvokeRequest) (*grpc.InvokeResponse, error) {
	return a.grpcInvoker.Invoke(req)
}

// SaveConfig saves a connection configuration
func (a *App) SaveConfig(name string, cfg *config.ConnectionConfig) error {
	return a.configManager.Save(name, cfg)
}

// LoadConfig loads a saved configuration
func (a *App) LoadConfig(name string) (*config.ConnectionConfig, error) {
	return a.configManager.Load(name)
}

// DeleteConfig deletes a saved configuration
func (a *App) DeleteConfig(name string) error {
	return a.configManager.Delete(name)
}

// ListConfigs lists all saved configurations
func (a *App) ListConfigs() ([]*config.ConnectionConfig, error) {
	return a.configManager.ListAll()
}

func main() {
	app := NewApp()

	err := wails.Run(&options.App{
		Title:  "dgrpc - gRPC Client",
		Width:  1200,
		Height: 800,
		AssetServer: &assetserver.Options{
			Assets: assets,
		},
		BackgroundColour: &options.RGBA{R: 255, G: 255, B: 255, A: 1},
		OnStartup:        func(ctx interface{}) {},
		Bind: []interface{}{
			app,
		},
	})

	if err != nil {
		println("Error:", err.Error())
	}
}
