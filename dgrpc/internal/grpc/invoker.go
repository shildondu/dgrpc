package grpc

import (
	"context"
	"encoding/json"
	"fmt"
	"strings"
	"time"

	"github.com/jhump/protoreflect/desc"
	"github.com/jhump/protoreflect/dynamic"
	"github.com/jhump/protoreflect/dynamic/grpcdynamic"
	"google.golang.org/grpc"
	"google.golang.org/grpc/credentials/insecure"
	"google.golang.org/grpc/metadata"
)

// InvokeRequest represents a gRPC invocation request
type InvokeRequest struct {
	Address      string `json:"address"`
	ServiceName  string `json:"serviceName"`
	MethodName   string `json:"methodName"`
	RequestData  string `json:"requestData"`
	Timeout      int    `json:"timeout"`
	UseTLS       bool   `json:"useTLS"`
	InsecureSkip bool   `json:"insecureSkip"`
}

// InvokeResponse represents a gRPC invocation response
type InvokeResponse struct {
	Success  bool              `json:"success"`
	Data     string            `json:"data"`
	Error    string            `json:"error,omitempty"`
	Duration int64             `json:"duration"`
	Header   map[string]string `json:"header,omitempty"`
	Trailer  map[string]string `json:"trailer,omitempty"`
}

// Invoker handles gRPC method invocations
type Invoker struct {
	connections map[string]*grpc.ClientConn
}

// NewInvoker creates a new Invoker instance
func NewInvoker() *Invoker {
	return &Invoker{
		connections: make(map[string]*grpc.ClientConn),
	}
}

// Invoke calls a gRPC method using a method descriptor
func (i *Invoker) Invoke(req *InvokeRequest, methodDesc *desc.MethodDescriptor) (*InvokeResponse, error) {
	if methodDesc == nil {
		return &InvokeResponse{
			Success: false,
			Error:   "method descriptor is nil - proto file may not be loaded",
		}, nil
	}

	conn, err := i.getConnection(req.Address, req.UseTLS, req.InsecureSkip)
	if err != nil {
		return &InvokeResponse{
			Success: false,
			Error:   fmt.Sprintf("failed to connect: %v", err),
		}, nil
	}

	ctx := context.Background()
	if req.Timeout > 0 {
		var cancel context.CancelFunc
		ctx, cancel = context.WithTimeout(ctx, time.Duration(req.Timeout)*time.Second)
		defer cancel()
	}

	// Create dynamic message
	reqMsg := dynamic.NewMessage(methodDesc.GetInputType())
	inputTypeName := methodDesc.GetInputType().GetFullyQualifiedName()

	if len(req.RequestData) > 0 {
		var rawCheck map[string]interface{}
		if err := json.Unmarshal([]byte(req.RequestData), &rawCheck); err != nil {
			return &InvokeResponse{
				Success: false,
				Error:   fmt.Sprintf("invalid JSON: %v", err),
			}, nil
		}

		if err := reqMsg.UnmarshalJSON([]byte(req.RequestData)); err != nil {
			fieldErrors := validateFields([]byte(req.RequestData), methodDesc.GetInputType())
			errorMsg := fmt.Sprintf("JSON to Proto conversion failed for message '%s'", inputTypeName)
			if len(fieldErrors) > 0 {
				errorMsg += "\n\nProblematic fields:\n"
				for _, fe := range fieldErrors {
					errorMsg += fmt.Sprintf("  ⚠️  %s: %s\n", fe.Path, fe.Issue)
				}
			} else {
				errorMsg += fmt.Sprintf("\nError: %s", err.Error())
			}
			return &InvokeResponse{
				Success: false,
				Error:   errorMsg,
			}, nil
		}
	}

	// Prepare header and trailer collectors
	var header, trailer metadata.MD

	// 只统计 RPC 调用耗时
	startTime := time.Now()

	stub := grpcdynamic.NewStub(conn)
	respMsg, err := stub.InvokeRpc(
		ctx,
		methodDesc,
		reqMsg,
		grpc.Header(&header),
		grpc.Trailer(&trailer),
	)
	duration := time.Since(startTime).Milliseconds()

	if err != nil {
		return &InvokeResponse{
			Success:  false,
			Error:    fmt.Sprintf("invoke failed: %v", err),
			Duration: duration,
		}, nil
	}

	// Convert response to JSON string
	var respData []byte
	if dm, ok := respMsg.(*dynamic.Message); ok {
		respData, err = dm.MarshalJSON()
	} else {
		respData, err = json.Marshal(respMsg)
	}
	if err != nil {
		return &InvokeResponse{
			Success:  false,
			Error:    fmt.Sprintf("failed to marshal response: %v", err),
			Duration: duration,
		}, nil
	}

	return &InvokeResponse{
		Success:  true,
		Data:     string(respData),
		Duration: duration,
		Header:   mdToMap(header),
		Trailer:  mdToMap(trailer),
	}, nil
}

// mdToMap converts metadata.MD to map[string]string
func mdToMap(md metadata.MD) map[string]string {
	if md == nil || len(md) == 0 {
		return nil
	}
	result := make(map[string]string)
	for k, v := range md {
		if len(v) > 0 {
			// Join multiple values with comma
			result[k] = strings.Join(v, ", ")
		}
	}
	if len(result) == 0 {
		return nil
	}
	return result
}

type FieldError struct {
	Path  string
	Issue string
}

func validateFields(jsonData []byte, msgDesc *desc.MessageDescriptor) []FieldError {
	var errors []FieldError
	var raw map[string]interface{}
	if err := json.Unmarshal(jsonData, &raw); err != nil {
		return []FieldError{{Path: "root", Issue: "invalid JSON structure"}}
	}
	validateMessageFields(raw, msgDesc, "", &errors)
	return errors
}

func validateMessageFields(raw map[string]interface{}, msgDesc *desc.MessageDescriptor, prefix string, errors *[]FieldError) {
	for fieldName, value := range raw {
		fieldPath := fieldName
		if prefix != "" {
			fieldPath = prefix + "." + fieldName
		}

		field := msgDesc.FindFieldByName(fieldName)
		if field == nil {
			continue
		}

		validateFieldType(value, field, fieldPath, errors)
	}
}

func validateFieldType(value interface{}, field *desc.FieldDescriptor, path string, errors *[]FieldError) {
	if field.IsRepeated() {
		arr, ok := value.([]interface{})
		if !ok {
			*errors = append(*errors, FieldError{
				Path:  path,
				Issue: fmt.Sprintf("expected array, got %T", value),
			})
			return
		}
		for i, elem := range arr {
			elemPath := fmt.Sprintf("%s[%d]", path, i)
			validateElementType(elem, field.GetType().String(), field.GetMessageType(), elemPath, errors)
		}
		return
	}

	validateElementType(value, field.GetType().String(), field.GetMessageType(), path, errors)
}

func validateElementType(value interface{}, fieldType string, msgDesc *desc.MessageDescriptor, path string, errors *[]FieldError) {
	typeStr := strings.ToUpper(strings.TrimPrefix(fieldType, "TYPE_"))

	switch typeStr {
	case "STRING":
		if _, ok := value.(string); !ok {
			if _, isObj := value.(map[string]interface{}); isObj {
				*errors = append(*errors, FieldError{
					Path:  path,
					Issue: "Proto 定义为 STRING，但你传了 JSON 对象 {}",
				})
			} else if _, isArr := value.([]interface{}); isArr {
				*errors = append(*errors, FieldError{
					Path:  path,
					Issue: "Proto 定义为 STRING，但你传了 JSON 数组 []",
				})
			} else {
				*errors = append(*errors, FieldError{
					Path:  path,
					Issue: fmt.Sprintf("Proto 定义为 STRING，但你传了 %T", value),
				})
			}
		}
	case "INT32", "INT64", "UINT32", "UINT64", "SINT32", "SINT64", "FIXED32", "FIXED64", "SFIXED32", "SFIXED64":
		switch value.(type) {
		case float64, int, int64, uint, uint64, json.Number:
		default:
			*errors = append(*errors, FieldError{
				Path:  path,
				Issue: fmt.Sprintf("Proto 定义为整数，但你传了 %T", value),
			})
		}
	case "BOOL":
		if _, ok := value.(bool); !ok {
			*errors = append(*errors, FieldError{
				Path:  path,
				Issue: fmt.Sprintf("Proto 定义为 BOOL，但你传了 %T", value),
			})
		}
	case "FLOAT", "DOUBLE":
		switch value.(type) {
		case float64, float32, int, json.Number:
		default:
			*errors = append(*errors, FieldError{
				Path:  path,
				Issue: fmt.Sprintf("Proto 定义为浮点数，但你传了 %T", value),
			})
		}
	case "MESSAGE":
		if msgDesc == nil {
			return
		}
		nested, ok := value.(map[string]interface{})
		if !ok {
			*errors = append(*errors, FieldError{
				Path:  path,
				Issue: fmt.Sprintf("Proto 定义为嵌套消息，但你传了 %T", value),
			})
			return
		}
		validateMessageFields(nested, msgDesc, path, errors)
	}
}

func (i *Invoker) getConnection(address string, useTLS, insecureSkip bool) (*grpc.ClientConn, error) {
	key := fmt.Sprintf("%s|%v|%v", address, useTLS, insecureSkip)
	if conn, ok := i.connections[key]; ok {
		return conn, nil
	}
	opts := []grpc.DialOption{
		grpc.WithTransportCredentials(insecure.NewCredentials()),
	}
	conn, err := grpc.Dial(address, opts...)
	if err != nil {
		return nil, fmt.Errorf("failed to dial: %w", err)
	}
	i.connections[key] = conn
	return conn, nil
}

func (i *Invoker) Close() error {
	for _, conn := range i.connections {
		conn.Close()
	}
	i.connections = make(map[string]*grpc.ClientConn)
	return nil
}
