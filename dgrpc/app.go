package main

import (
	"context"
	"dgrpc/internal/config"
	"dgrpc/internal/grpc"
	"dgrpc/internal/proto"

	"github.com/wailsapp/wails/v2/pkg/runtime"
)

// App struct
type App struct {
	ctx           context.Context
	configManager *config.Manager
	protoParser   *proto.Parser
	grpcInvoker   *grpc.Invoker
}

// NewApp creates a new App application struct
func NewApp() *App {
	return &App{
		configManager: config.NewManager(),
		protoParser:   proto.NewParser(),
		grpcInvoker:   grpc.NewInvoker(),
	}
}

// startup is called when the app starts
func (a *App) startup(ctx context.Context) {
	a.ctx = ctx
	// Maximize window on startup
	runtime.WindowMaximise(ctx)
}

// OpenFileDialog opens a native file dialog and returns the selected proto file path
func (a *App) OpenFileDialog() (string, error) {
	result, err := runtime.OpenFileDialog(a.ctx, runtime.OpenDialogOptions{
		Title: "选择 Proto 文件",
		Filters: []runtime.FileFilter{
			{DisplayName: "Proto Files (*.proto)", Pattern: "*.proto"},
		},
	})
	return result, err
}

// ImportProto imports and parses a proto file
func (a *App) ImportProto(filePath string) (*proto.ParseResult, error) {
	return a.protoParser.ParseFile(filePath)
}

// InvokeMethod calls a gRPC method
func (a *App) InvokeMethod(req *grpc.InvokeRequest) (*grpc.InvokeResponse, error) {
	// Get method descriptor from cached parser
	methodDesc := a.protoParser.GetMethodDescriptor(req.ServiceName, req.MethodName)
	if methodDesc == nil {
		return &grpc.InvokeResponse{
			Success: false,
			Error:   "method not found in loaded proto - please re-import the proto file",
		}, nil
	}

	return a.grpcInvoker.Invoke(req, methodDesc)
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

// SaveProtoPaths saves the list of imported proto file paths
func (a *App) SaveProtoPaths(paths []string) error {
	return a.configManager.SaveProtoPaths(paths)
}

// LoadProtoPaths loads the saved proto file paths
func (a *App) LoadProtoPaths() ([]string, error) {
	return a.configManager.LoadProtoPaths()
}

// SaveMethodScheme saves a method invocation scheme
func (a *App) SaveMethodScheme(scheme *config.MethodScheme) error {
	return a.configManager.SaveMethodScheme(scheme)
}

// LoadMethodScheme loads a saved method scheme
func (a *App) LoadMethodScheme(serviceName, methodName string) (*config.MethodScheme, error) {
	return a.configManager.LoadMethodScheme(serviceName, methodName)
}
