export namespace api {
	
	export class FairOSConfig {
	    isProxy: boolean;
	    bee: string;
	    batch: string;
	    rpc: string;
	    network: string;
	
	    static createFrom(source: any = {}) {
	        return new FairOSConfig(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.isProxy = source["isProxy"];
	        this.bee = source["bee"];
	        this.batch = source["batch"];
	        this.rpc = source["rpc"];
	        this.network = source["network"];
	    }
	}

}

export namespace handler {
	
	export class LiteUser {
	    mnemonic: string;
	    privateKey: string;
	
	    static createFrom(source: any = {}) {
	        return new LiteUser(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.mnemonic = source["mnemonic"];
	        this.privateKey = source["privateKey"];
	    }
	}
	export class PodMountedInfo {
	    podName: string;
	    isMounted: boolean;
	    mountPoint: string;
	
	    static createFrom(source: any = {}) {
	        return new PodMountedInfo(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.podName = source["podName"];
	        this.isMounted = source["isMounted"];
	        this.mountPoint = source["mountPoint"];
	    }
	}

}

