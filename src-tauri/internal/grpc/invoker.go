package grpc

import (
	"context"
	"encoding/json"
	"fmt"
	"time"

	"github.com/jhump/protoreflect/desc"
	"github.com/jhump/protoreflect/dynamic"
	"github.com/jhump/protoreflect/dynamic/grpcdynamic"
	"google.golang.org/grpc"
	"google.golang.org/grpc/credentials/insecure"
)

// InvokeRequest represents a gRPC invocation request
type InvokeRequest struct {
	Address      string          `json:"address"`      // host:port
	ServiceName  string          `json:"serviceName"`  // full service name
	MethodName   string          `json:"methodName"`   // method name
	RequestData  json.RawMessage `json:"requestData"`  // JSON request body
	Timeout      int             `json:"timeout"`      // timeout in seconds
	UseTLS       bool            `json:"useTLS"`       // whether to use TLS
	InsecureSkip bool            `json:"insecureSkip"` // skip TLS verification
}

// InvokeResponse represents a gRPC invocation response
type InvokeResponse struct {
	Success   bool            `json:"success"`
	Data      json.RawMessage `json:"data"`
	Error     string          `json:"error,omitempty"`
	Duration  int64           `json:"duration"` // duration in milliseconds
	Metadata  map[string]string `json:"metadata,omitempty"`
}

// StreamMessage represents a message in a streaming response
type StreamMessage struct {
	Data      json.RawMessage `json:"data"`
	Error     string          `json:"error,omitempty"`
	Index     int             `json:"index"`
	Completed bool            `json:"completed"`
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

// Invoke calls a gRPC method (unary)
func (i *Invoker) Invoke(req *InvokeRequest) (*InvokeResponse, error) {
	startTime := time.Now()

	// Get or create connection
	conn, err := i.getConnection(req.Address, req.UseTLS, req.InsecureSkip)
	if err != nil {
		return &InvokeResponse{
			Success:  false,
			Error:    fmt.Sprintf("failed to connect: %v", err),
			Duration: time.Since(startTime).Milliseconds(),
		}, nil
	}

	// Create context with timeout
	ctx := context.Background()
	if req.Timeout > 0 {
		var cancel context.CancelFunc
		ctx, cancel = context.WithTimeout(ctx, time.Duration(req.Timeout)*time.Second)
		defer cancel()
	}

	// For dynamic invocation, we need the method descriptor
	// This requires proto file information, which should be passed
	// For now, this is a placeholder - actual implementation needs desc.MethodDescriptor

	_ = conn // connection ready for use

	return &InvokeResponse{
		Success:  false,
		Error:    "method descriptor required - use InvokeWithDescriptor",
		Duration: time.Since(startTime).Milliseconds(),
	}, nil
}

// InvokeWithDescriptor calls a gRPC method using a method descriptor
func (i *Invoker) InvokeWithDescriptor(req *InvokeRequest, methodDesc *desc.MethodDescriptor) (*InvokeResponse, error) {
	startTime := time.Now()

	conn, err := i.getConnection(req.Address, req.UseTLS, req.InsecureSkip)
	if err != nil {
		return &InvokeResponse{
			Success:  false,
			Error:    fmt.Sprintf("failed to connect: %v", err),
			Duration: time.Since(startTime).Milliseconds(),
		}, nil
	}

	ctx := context.Background()
	if req.Timeout > 0 {
		var cancel context.CancelFunc
		ctx, cancel = context.WithTimeout(ctx, time.Duration(req.Timeout)*time.Second)
		defer cancel()
	}

	// Create dynamic message from request data
	reqMsg := dynamic.NewMessage(methodDesc.GetInputType())
	if err := reqMsg.UnmarshalJSON(req.RequestData); err != nil {
		return &InvokeResponse{
			Success:  false,
			Error:    fmt.Sprintf("failed to parse request: %v", err),
			Duration: time.Since(startTime).Milliseconds(),
		}, nil
	}

	// Create stub and invoke
	stub := grpcdynamic.NewStub(conn)
	respMsg, err := stub.InvokeRpc(ctx, methodDesc, reqMsg)
	if err != nil {
		return &InvokeResponse{
			Success:  false,
			Error:    fmt.Sprintf("invoke failed: %v", err),
			Duration: time.Since(startTime).Milliseconds(),
		}, nil
	}

	// Convert response to JSON
	respData, err := respMsg.MarshalJSON()
	if err != nil {
		return &InvokeResponse{
			Success:  false,
			Error:    fmt.Sprintf("failed to marshal response: %v", err),
			Duration: time.Since(startTime).Milliseconds(),
		}, nil
	}

	return &InvokeResponse{
		Success:  true,
		Data:     respData,
		Duration: time.Since(startTime).Milliseconds(),
	}, nil
}

// InvokeServerStream calls a server streaming gRPC method
func (i *Invoker) InvokeServerStream(req *InvokeRequest, methodDesc *desc.MethodDescriptor, callback func(*StreamMessage)) error {
	startTime := time.Now()

	conn, err := i.getConnection(req.Address, req.UseTLS, req.InsecureSkip)
	if err != nil {
		callback(&StreamMessage{
			Error:     fmt.Sprintf("failed to connect: %v", err),
			Completed: true,
		})
		return err
	}

	ctx := context.Background()
	if req.Timeout > 0 {
		var cancel context.CancelFunc
		ctx, cancel = context.WithTimeout(ctx, time.Duration(req.Timeout)*time.Second)
		defer cancel()
	}

	reqMsg := dynamic.NewMessage(methodDesc.GetInputType())
	if err := reqMsg.UnmarshalJSON(req.RequestData); err != nil {
		callback(&StreamMessage{
			Error:     fmt.Sprintf("failed to parse request: %v", err),
			Completed: true,
		})
		return err
	}

	stub := grpcdynamic.NewStub(conn)
	stream, err := stub.InvokeRpcServerStream(ctx, methodDesc, reqMsg)
	if err != nil {
		callback(&StreamMessage{
			Error:     fmt.Sprintf("invoke failed: %v", err),
			Completed: true,
		})
		return err
	}

	index := 0
	for {
		respMsg, err := stream.Recv()
		if err != nil {
			callback(&StreamMessage{
				Completed: true,
				Index:     index,
				Error:     err.Error(),
			})
			break
		}

		respData, err := respMsg.MarshalJSON()
		if err != nil {
			callback(&StreamMessage{
				Index: index,
				Error: fmt.Sprintf("failed to marshal response: %v", err),
			})
			index++
			continue
		}

		callback(&StreamMessage{
			Data:  respData,
			Index: index,
		})
		index++
	}

	_ = startTime // could be used for total duration
	return nil
}

// getConnection gets or creates a gRPC connection
func (i *Invoker) getConnection(address string, useTLS, insecureSkip bool) (*grpc.ClientConn, error) {
	key := fmt.Sprintf("%s|%v|%v", address, useTLS, insecureSkip)

	if conn, ok := i.connections[key]; ok {
		return conn, nil
	}

	var opts []grpc.DialOption
	if useTLS {
		// TLS configuration would go here
		opts = append(opts, grpc.WithTransportCredentials(insecure.NewCredentials()))
	} else {
		opts = append(opts, grpc.WithTransportCredentials(insecure.NewCredentials()))
	}

	conn, err := grpc.Dial(address, opts...)
	if err != nil {
		return nil, fmt.Errorf("failed to dial: %w", err)
	}

	i.connections[key] = conn
	return conn, nil
}

// Close closes all connections
func (i *Invoker) Close() error {
	for _, conn := range i.connections {
		conn.Close()
	}
	i.connections = make(map[string]*grpc.ClientConn)
	return nil
}
