export namespace api {
	
	export class FairOSConfig {
	    bee: string;
	    batch: string;
	    rpc: string;
	    network: string;
	
	    static createFrom(source: any = {}) {
	        return new FairOSConfig(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.bee = source["bee"];
	        this.batch = source["batch"];
	        this.rpc = source["rpc"];
	        this.network = source["network"];
	    }
	}

}

export namespace handler {
	
	export class SubscriptionInfo {
	    subHash: string;
	    isMounted: boolean;
	    podName: string;
	    address: string;
	    mountPoint: string;
	    validTill: number;
	    category: string;
	    infoLocation: string;
	
	    static createFrom(source: any = {}) {
	        return new SubscriptionInfo(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.subHash = source["subHash"];
	        this.isMounted = source["isMounted"];
	        this.podName = source["podName"];
	        this.address = source["address"];
	        this.mountPoint = source["mountPoint"];
	        this.validTill = source["validTill"];
	        this.category = source["category"];
	        this.infoLocation = source["infoLocation"];
	    }
	}
	export class PodMountedInfo {
	    podName: string;
	    isMounted: boolean;
	    mountPoint: string;
	    isShared: boolean;
	
	    static createFrom(source: any = {}) {
	        return new PodMountedInfo(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.podName = source["podName"];
	        this.isMounted = source["isMounted"];
	        this.mountPoint = source["mountPoint"];
	        this.isShared = source["isShared"];
	    }
	}
	export class CachedPod {
	    podsMounted: PodMountedInfo[];
	    subsMounted: SubscriptionInfo[];
	
	    static createFrom(source: any = {}) {
	        return new CachedPod(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.podsMounted = this.convertValues(source["podsMounted"], PodMountedInfo);
	        this.subsMounted = this.convertValues(source["subsMounted"], SubscriptionInfo);
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
	

}

export namespace main {
	
	export class Account {
	    username: string;
	    password: string;
	
	    static createFrom(source: any = {}) {
	        return new Account(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.username = source["username"];
	        this.password = source["password"];
	    }
	}

}

export namespace pod {
	
	export class Info {
	
	
	    static createFrom(source: any = {}) {
	        return new Info(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	
	    }
	}

}

