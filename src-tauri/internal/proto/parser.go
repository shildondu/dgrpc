package proto

import (
	"fmt"
	"os"
	"path/filepath"

	"github.com/jhump/protoreflect/desc"
	"github.com/jhump/protoreflect/desc/protoparse"
)

// ServiceInfo represents a gRPC service definition
type ServiceInfo struct {
	Name    string       `json:"name"`
	Methods []MethodInfo `json:"methods"`
}

// MethodInfo represents a gRPC method definition
type MethodInfo struct {
	Name            string `json:"name"`
	InputType       string `json:"inputType"`
	OutputType      string `json:"outputType"`
	IsClientStream  bool   `json:"isClientStream"`
	IsServerStream  bool   `json:"isServerStream"`
}

// MessageInfo represents a protobuf message definition
type MessageInfo struct {
	Name   string       `json:"name"`
	Fields []FieldInfo `json:"fields"`
}

// FieldInfo represents a field in a protobuf message
type FieldInfo struct {
	Name     string `json:"name"`
	Type     string `json:"type"`
	Number   int32  `json:"number"`
	Repeated bool   `json:"repeated"`
	Optional bool   `json:"optional"`
}

// ParseResult contains the parsed proto file information
type ParseResult struct {
	Services []ServiceInfo `json:"services"`
	Messages []MessageInfo `json:"messages"`
}

// Parser parses proto files
type Parser struct {
	protoPaths []string
}

// NewParser creates a new Parser instance
func NewParser() *Parser {
	return &Parser{
		protoPaths: []string{},
	}
}

// AddProtoPath adds a path for proto imports
func (p *Parser) AddProtoPath(path string) {
	p.protoPaths = append(p.protoPaths, path)
}

// ParseFile parses a proto file and extracts service/method definitions
func (p *Parser) ParseFile(filePath string) (*ParseResult, error) {
	absPath, err := filepath.Abs(filePath)
	if err != nil {
		return nil, fmt.Errorf("failed to get absolute path: %w", err)
	}

	// Check if file exists
	if _, err := os.Stat(absPath); os.IsNotExist(err) {
		return nil, fmt.Errorf("proto file not found: %s", absPath)
	}

	dir := filepath.Dir(absPath)
	base := filepath.Base(absPath)

	parser := &protoparse.Parser{
		ImportPaths: append([]string{dir}, p.protoPaths...),
	}

	files, err := parser.ParseFiles(base)
	if err != nil {
		return nil, fmt.Errorf("failed to parse proto file: %w", err)
	}

	result := &ParseResult{
		Services: []ServiceInfo{},
		Messages: []MessageInfo{},
	}

	for _, file := range files {
		// Extract services
		for _, svc := range file.GetServices() {
			serviceInfo := ServiceInfo{
				Name:    svc.GetName(),
				Methods: []MethodInfo{},
			}

			for _, method := range svc.GetMethods() {
				methodInfo := MethodInfo{
					Name:           method.GetName(),
					InputType:      method.GetInputType().GetName(),
					OutputType:     method.GetOutputType().GetName(),
					IsClientStream: method.IsClientStreaming(),
					IsServerStream: method.IsServerStreaming(),
				}
				serviceInfo.Methods = append(serviceInfo.Methods, methodInfo)
			}

			result.Services = append(result.Services, serviceInfo)
		}

		// Extract messages
		for _, msg := range file.GetMessageTypes() {
			messageInfo := p.extractMessageInfo(msg)
			result.Messages = append(result.Messages, messageInfo)
		}
	}

	return result, nil
}

// ParseImportedProtos parses multiple proto files including their imports
func (p *Parser) ParseImportedProtos(filePath string) ([]string, error) {
	absPath, err := filepath.Abs(filePath)
	if err != nil {
		return nil, err
	}

	dir := filepath.Dir(absPath)
	base := filepath.Base(absPath)

	parser := &protoparse.Parser{
		ImportPaths: append([]string{dir}, p.protoPaths...),
	}

	files, err := parser.ParseFiles(base)
	if err != nil {
		return nil, err
	}

	var importedFiles []string
	for _, file := range files {
		importedFiles = append(importedFiles, file.GetName())
	}

	return importedFiles, nil
}

// extractMessageInfo recursively extracts message information
func (p *Parser) extractMessageInfo(msg *desc.MessageDescriptor) MessageInfo {
	messageInfo := MessageInfo{
		Name:   msg.GetName(),
		Fields: []FieldInfo{},
	}

	for _, field := range msg.GetFields() {
		fieldInfo := FieldInfo{
			Name:     field.GetName(),
			Type:     field.GetType().String(),
			Number:   field.GetNumber(),
			Repeated: field.IsRepeated(),
			Optional: field.IsOptional(),
		}
		messageInfo.Fields = append(messageInfo.Fields, fieldInfo)
	}

	// Handle nested messages
	for _, nested := range msg.GetNestedMessageTypes() {
		nestedInfo := p.extractMessageInfo(nested)
		nestedInfo.Name = msg.GetName() + "." + nestedInfo.Name
		result.Messages = append(result.Messages, nestedInfo)
	}

	return messageInfo
}
