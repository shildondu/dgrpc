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
