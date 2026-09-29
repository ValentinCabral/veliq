export declare function recordToolObservation(project:string,harness:string,tool:string,body:string):boolean;
export declare function observationSummary(project:string):{mode:string;countKind:string;observations:number;originalBytes:number;savedBytes:number;byHarness:Record<string,number>;errors:number};
