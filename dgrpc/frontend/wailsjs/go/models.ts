export namespace config {
	
	export class ConnectionConfig {
	    name: string;
	    address: string;
	    useTLS: boolean;
	    insecureSkip: boolean;
	    timeout: number;
	    metadata?: Record<string, string>;
	    createdAt: string;
	    updatedAt: string;
	
	    static createFrom(source: any = {}) {
	        return new ConnectionConfig(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.name = source["name"];
	        this.address = source["address"];
	        this.useTLS = source["useTLS"];
	        this.insecureSkip = source["insecureSkip"];
	        this.timeout = source["timeout"];
	        this.metadata = source["metadata"];
	        this.createdAt = source["createdAt"];
	        this.updatedAt = source["updatedAt"];
	    }
	}
	export class MethodScheme {
	    serviceName: string;
	    methodName: string;
	    configName: string;
	    address: string;
	    timeout: number;
	    useTLS: boolean;
	    insecureSkip: boolean;
	    requestData: string;
	    updatedAt: string;
	
	    static createFrom(source: any = {}) {
	        return new MethodScheme(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.serviceName = source["serviceName"];
	        this.methodName = source["methodName"];
	        this.configName = source["configName"];
	        this.address = source["address"];
	        this.timeout = source["timeout"];
	        this.useTLS = source["useTLS"];
	        this.insecureSkip = source["insecureSkip"];
	        this.requestData = source["requestData"];
	        this.updatedAt = source["updatedAt"];
	    }
	}

}

export namespace grpc {
	
	export class InvokeRequest {
	    address: string;
	    serviceName: string;
	    methodName: string;
	    requestData: string;
	    timeout: number;
	    useTLS: boolean;
	    insecureSkip: boolean;
	
	    static createFrom(source: any = {}) {
	        return new InvokeRequest(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.address = source["address"];
	        this.serviceName = source["serviceName"];
	        this.methodName = source["methodName"];
	        this.requestData = source["requestData"];
	        this.timeout = source["timeout"];
	        this.useTLS = source["useTLS"];
	        this.insecureSkip = source["insecureSkip"];
	    }
	}
	export class InvokeResponse {
	    success: boolean;
	    data: string;
	    error?: string;
	    duration: number;
	    header?: Record<string, string>;
	    trailer?: Record<string, string>;
	
	    static createFrom(source: any = {}) {
	        return new InvokeResponse(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.success = source["success"];
	        this.data = source["data"];
	        this.error = source["error"];
	        this.duration = source["duration"];
	        this.header = source["header"];
	        this.trailer = source["trailer"];
	    }
	}

}

export namespace proto {
	
	export class FieldInfo {
	    name: string;
	    type: string;
	    number: number;
	    repeated: boolean;
	    optional: boolean;
	
	    static createFrom(source: any = {}) {
	        return new FieldInfo(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.name = source["name"];
	        this.type = source["type"];
	        this.number = source["number"];
	        this.repeated = source["repeated"];
	        this.optional = source["optional"];
	    }
	}
	export class MessageInfo {
	    name: string;
	    fields: FieldInfo[];
	
	    static createFrom(source: any = {}) {
	        return new MessageInfo(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.name = source["name"];
	        this.fields = this.convertValues(source["fields"], FieldInfo);
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}
	export class MethodInfo {
	    name: string;
	    inputType: string;
	    outputType: string;
	    isClientStream: boolean;
	    isServerStream: boolean;
	
	    static createFrom(source: any = {}) {
	        return new MethodInfo(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.name = source["name"];
	        this.inputType = source["inputType"];
	        this.outputType = source["outputType"];
	        this.isClientStream = source["isClientStream"];
	        this.isServerStream = source["isServerStream"];
	    }
	}
	export class ServiceInfo {
	    name: string;
	    methods: MethodInfo[];
	
	    static createFrom(source: any = {}) {
	        return new ServiceInfo(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.name = source["name"];
	        this.methods = this.convertValues(source["methods"], MethodInfo);
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}
	export class ParseResult {
	    services: ServiceInfo[];
	    messages: MessageInfo[];
	
	    static createFrom(source: any = {}) {
	        return new ParseResult(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.services = this.convertValues(source["services"], ServiceInfo);
	        this.messages = this.convertValues(source["messages"], MessageInfo);
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}

}

