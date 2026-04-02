package config

import (
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"sync"
)

// ConnectionConfig represents a saved connection configuration
type ConnectionConfig struct {
	Name        string            `json:"name"`
	Address     string            `json:"address"`
	UseTLS      bool              `json:"useTLS"`
	InsecureSkip bool             `json:"insecureSkip"`
	Timeout     int               `json:"timeout"`
	Metadata    map[string]string `json:"metadata,omitempty"`
	CreatedAt   string            `json:"createdAt"`
	UpdatedAt   string            `json:"updatedAt"`
}

// InvokeHistory represents a history entry
type InvokeHistory struct {
	ID           string          `json:"id"`
	ServiceName  string          `json:"serviceName"`
	MethodName   string          `json:"methodName"`
	Address      string          `json:"address"`
	RequestData  json.RawMessage `json:"requestData"`
	ResponseData json.RawMessage `json:"responseData"`
	Duration     int64           `json:"duration"`
	Success      bool            `json:"success"`
	Timestamp    string          `json:"timestamp"`
}

// Manager handles configuration persistence
type Manager struct {
	configDir string
	mu        sync.RWMutex
}

// NewManager creates a new configuration Manager
func NewManager() *Manager {
	homeDir, _ := os.UserHomeDir()
	configDir := filepath.Join(homeDir, ".dgrpc", "configs")

	// Ensure directory exists
	os.MkdirAll(configDir, 0755)

	return &Manager{
		configDir: configDir,
	}
}

// Save saves a connection configuration
func (m *Manager) Save(name string, cfg *ConnectionConfig) error {
	m.mu.Lock()
	defer m.mu.Unlock()

	filePath := filepath.Join(m.configDir, name+".json")

	data, err := json.MarshalIndent(cfg, "", "  ")
	if err != nil {
		return fmt.Errorf("failed to marshal config: %w", err)
	}

	if err := os.WriteFile(filePath, data, 0644); err != nil {
		return fmt.Errorf("failed to write config file: %w", err)
	}

	return nil
}

// Load loads a saved configuration
func (m *Manager) Load(name string) (*ConnectionConfig, error) {
	m.mu.RLock()
	defer m.mu.RUnlock()

	filePath := filepath.Join(m.configDir, name+".json")

	data, err := os.ReadFile(filePath)
	if err != nil {
		return nil, fmt.Errorf("failed to read config file: %w", err)
	}

	var cfg ConnectionConfig
	if err := json.Unmarshal(data, &cfg); err != nil {
		return nil, fmt.Errorf("failed to unmarshal config: %w", err)
	}

	return &cfg, nil
}

// Delete deletes a saved configuration
func (m *Manager) Delete(name string) error {
	m.mu.Lock()
	defer m.mu.Unlock()

	filePath := filepath.Join(m.configDir, name+".json")

	if err := os.Remove(filePath); err != nil {
		return fmt.Errorf("failed to delete config file: %w", err)
	}

	return nil
}

// List lists all saved configuration names
func (m *Manager) List() ([]string, error) {
	m.mu.RLock()
	defer m.mu.RUnlock()

	entries, err := os.ReadDir(m.configDir)
	if err != nil {
		return nil, fmt.Errorf("failed to read config directory: %w", err)
	}

	var names []string
	for _, entry := range entries {
		if !entry.IsDir() && filepath.Ext(entry.Name()) == ".json" {
			name := entry.Name()[:len(entry.Name())-5] // remove .json
			names = append(names, name)
		}
	}

	return names, nil
}

// ListAll loads all saved configurations
func (m *Manager) ListAll() ([]*ConnectionConfig, error) {
	names, err := m.List()
	if err != nil {
		return nil, err
	}

	var configs []*ConnectionConfig
	for _, name := range names {
		cfg, err := m.Load(name)
		if err != nil {
			continue // skip invalid configs
		}
		configs = append(configs, cfg)
	}

	return configs, nil
}

// ProtoPaths returns the path to the proto paths file
func (m *Manager) protoPathsFile() string {
	return filepath.Join(filepath.Dir(m.configDir), "proto_paths.json")
}

// SaveProtoPaths saves the list of imported proto file paths
func (m *Manager) SaveProtoPaths(paths []string) error {
	m.mu.Lock()
	defer m.mu.Unlock()

	data, err := json.MarshalIndent(paths, "", "  ")
	if err != nil {
		return fmt.Errorf("failed to marshal proto paths: %w", err)
	}

	return os.WriteFile(m.protoPathsFile(), data, 0644)
}

// LoadProtoPaths loads the saved proto file paths
func (m *Manager) LoadProtoPaths() ([]string, error) {
	m.mu.RLock()
	defer m.mu.RUnlock()

	data, err := os.ReadFile(m.protoPathsFile())
	if err != nil {
		if os.IsNotExist(err) {
			return nil, nil
		}
		return nil, fmt.Errorf("failed to read proto paths: %w", err)
	}

	var paths []string
	if err := json.Unmarshal(data, &paths); err != nil {
		return nil, fmt.Errorf("failed to unmarshal proto paths: %w", err)
	}

	return paths, nil
}

// MethodScheme represents a saved method invocation scheme
type MethodScheme struct {
	ServiceName   string `json:"serviceName"`
	MethodName    string `json:"methodName"`
	ConfigName    string `json:"configName"`
	Address       string `json:"address"`
	Timeout       int    `json:"timeout"`
	UseTLS        bool   `json:"useTLS"`
	InsecureSkip  bool   `json:"insecureSkip"`
	RequestData   string `json:"requestData"`
	UpdatedAt     string `json:"updatedAt"`
}

// methodSchemesFile returns the path to the method schemes file
func (m *Manager) methodSchemesFile() string {
	return filepath.Join(filepath.Dir(m.configDir), "method_schemes.json")
}

// SaveMethodScheme saves a method invocation scheme
func (m *Manager) SaveMethodScheme(scheme *MethodScheme) error {
	m.mu.Lock()
	defer m.mu.Unlock()

	filePath := m.methodSchemesFile()

	// Load existing schemes
	var schemes map[string]*MethodScheme
	data, err := os.ReadFile(filePath)
	if err != nil {
		if !os.IsNotExist(err) {
			return fmt.Errorf("failed to read method schemes: %w", err)
		}
		schemes = make(map[string]*MethodScheme)
	} else {
		if err := json.Unmarshal(data, &schemes); err != nil {
			schemes = make(map[string]*MethodScheme)
		}
	}

	key := scheme.ServiceName + "." + scheme.MethodName
	schemes[key] = scheme

	newData, err := json.MarshalIndent(schemes, "", "  ")
	if err != nil {
		return fmt.Errorf("failed to marshal method schemes: %w", err)
	}

	return os.WriteFile(filePath, newData, 0644)
}

// LoadMethodScheme loads a saved method scheme
func (m *Manager) LoadMethodScheme(serviceName, methodName string) (*MethodScheme, error) {
	m.mu.RLock()
	defer m.mu.RUnlock()

	filePath := m.methodSchemesFile()

	data, err := os.ReadFile(filePath)
	if err != nil {
		if os.IsNotExist(err) {
			return nil, nil
		}
		return nil, fmt.Errorf("failed to read method schemes: %w", err)
	}

	var schemes map[string]*MethodScheme
	if err := json.Unmarshal(data, &schemes); err != nil {
		return nil, fmt.Errorf("failed to unmarshal method schemes: %w", err)
	}

	key := serviceName + "." + methodName
	return schemes[key], nil
}
