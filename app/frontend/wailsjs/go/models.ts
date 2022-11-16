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

